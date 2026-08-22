/**
 * YouTubeDiscoveryService
 * Wraps the backend /api/v2/songs/youtube-search endpoint with:
 *  - Query normalization & expansion (5-level ladder)
 *  - L1 Query Cache (30-minute TTL, Map-based)
 *  - In-flight SingleFlight deduplication
 *  - Pre-playback candidate ID format validation
 *  - Returns a ranked array of YouTubeCandidate (mapped to Song-compatible shape)
 */

import { appConfig } from '../config/appConfig';


// ─── Types ─────────────────────────────────────────────────────────────────

export interface YouTubeCandidate {
  /** 11-character YouTube video ID */
  video_id: string;
  title: string;
  channel_name: string;
  channel_is_verified: boolean;
  channel_is_topic: boolean;
  channel_is_vevo: boolean;
  duration_seconds: number;
  duration_str: string;
  published_at: string | null;
  view_count: number;
  thumbnail_url: string;
  watch_url: string;
  score: number;
  score_breakdown?: {
    similarity: number;
    authority: number;
    duration: number;
    recency: number;
    popularity: number;
    penalties: number;
  } | null;
}

export interface DiscoveryResult {
  query: string;
  normalized_query: string;
  cached: boolean;
  candidates: YouTubeCandidate[];
  total_candidates: number;
}

// ─── Query Expansion Ladder ─────────────────────────────────────────────────

const NOISE_TOKENS = new Set([
  'a', 'an', 'the', 'is', 'in', 'on', 'at', 'by', 'to', 'of', 'for',
  'and', 'or', 'but', 'with', 'that', 'this', 'it', 'me',
]);

function normalizeQuery(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')       // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function stripNoise(q: string): string {
  return q.split(' ').filter(t => t.length > 1 && !NOISE_TOKENS.has(t)).join(' ') || q;
}

/**
 * Returns 5 progressively broader search query variants.
 * Level 0 is the base normalized query; each level adds a suffix.
 */
export function buildQueryExpansionLadder(raw: string): string[] {
  const base = normalizeQuery(raw);
  const core = stripNoise(base);
  return [
    base,                                 // level 0: verbatim normalized
    `${base} official`,                   // level 1: + official
    `${core} tutorial explained`,         // level 2: core + educational suffix
    `${core} full song`,                  // level 3: core + full song
    `${core} music`,                      // level 4: core + music (broadest)
  ];
}

// ─── Candidate Validator ────────────────────────────────────────────────────

/** Validates that a video ID is 11 alphanumeric characters (YouTube format). */
export function isValidVideoId(videoId: string): boolean {
  return typeof videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(videoId);
}

// ─── Cache ──────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  result: DiscoveryResult;
  expiresAt: number;
}

const queryCache = new Map<string, CacheEntry>();

function getCached(key: string): DiscoveryResult | null {
  const entry = queryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    queryCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCache(key: string, result: DiscoveryResult): void {
  queryCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  // Evict oldest if over 100 entries
  if (queryCache.size > 100) {
    const firstKey = queryCache.keys().next().value;
    if (firstKey) queryCache.delete(firstKey);
  }
}

// ─── SingleFlight ───────────────────────────────────────────────────────────

const inFlight = new Map<string, Promise<DiscoveryResult>>();

function deduplicatedFetch(key: string, fetcher: () => Promise<DiscoveryResult>): Promise<DiscoveryResult> {
  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = fetcher().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

// ─── Core API Call ──────────────────────────────────────────────────────────

async function fetchFromBackend(query: string, limit: number): Promise<DiscoveryResult> {
  const url = `${appConfig.apiBaseUrl}/api/v2/songs/youtube-search?q=${encodeURIComponent(query)}&limit=${limit}`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) {
    throw new Error(`YouTube search API error: HTTP ${resp.status}`);
  }
  const data: DiscoveryResult = await resp.json();
  return data;
}

// ─── Main Discovery Function ─────────────────────────────────────────────────

/**
 * Fetches a ranked candidate pool for the given query.
 * Tries each query expansion level until at least one valid candidate is found.
 * Returns an empty candidates array if all levels fail.
 *
 * @param rawQuery   The user's raw text input
 * @param limit      Number of candidates to request (default 15 for fallback headroom)
 * @param onStatus   Optional progress callback: called with the query expansion level being tried
 */
export async function discoverYouTubeCandidates(
  rawQuery: string,
  limit: number = 15,
  onStatus?: (level: number, query: string) => void,
): Promise<DiscoveryResult> {
  const ladder = buildQueryExpansionLadder(rawQuery);

  for (let level = 0; level < ladder.length; level++) {
    const query = ladder[level];
    const cacheKey = `${query}:${limit}`;

    // Cache check
    const cached = getCached(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    onStatus?.(level, query);

    try {
      const result = await deduplicatedFetch(cacheKey, () => fetchFromBackend(query, limit));

      // Filter out candidates with invalid video IDs
      const validCandidates = result.candidates.filter(c => isValidVideoId(c.video_id));

      if (validCandidates.length > 0) {
        const finalResult: DiscoveryResult = {
          ...result,
          candidates: validCandidates,
          total_candidates: validCandidates.length,
        };
        setCache(cacheKey, finalResult);
        return finalResult;
      }

      // No valid candidates at this level — try next expansion
    } catch (err) {
      // Network/API error at this level — try next expansion
      console.warn(`[YouTubeDiscoveryService] Level ${level} query "${query}" failed:`, err);
    }
  }

  // All levels exhausted — return empty result
  return {
    query: rawQuery,
    normalized_query: normalizeQuery(rawQuery),
    cached: false,
    candidates: [],
    total_candidates: 0,
  };
}

/**
 * Clears the client-side L1 cache.
 * Useful for testing or force-refreshing after a network error.
 */
export function clearDiscoveryCache(): void {
  queryCache.clear();
}

/**
 * Returns cache statistics for observability.
 */
export function getDiscoveryCacheStats(): { size: number; inFlightCount: number } {
  return { size: queryCache.size, inFlightCount: inFlight.size };
}
