/**
 * MusicMirror Music Discovery Engine (STAGE 04 Implementation)
 * Low-latency, cancelable, cache-aware, rate-limit-safe music candidate discovery engine
 */

import type {
  MusicIntent,
  MusicCandidate,
  DiscoveryState,
  DiscoveryMetrics,
} from '../types/domain';
import type { MusicProviderAdapter } from './ProviderAdapterLayer/MusicProviderAdapter';
import { intentMapper } from './MusicIntentLayer';
import { logger } from './ObservabilityLayer';
import { personalizationScorer } from './PersonalizationLayer/PersonalizationScorer';

export interface CacheEntry {
  key: string;
  candidates: MusicCandidate[];
  timestamp: number;
  isPrefetched: boolean;
}

export class DiscoveryEngine {
  private static instance: DiscoveryEngine | null = null;

  private providers: Map<string, MusicProviderAdapter> = new Map();
  private providerCooldowns: Map<string, number> = new Map(); // providerId -> Cooldown Until Timestamp

  private state: DiscoveryState = 'IDLE';
  private currentGenerationId: number = 0;
  private activeAbortController: AbortController | null = null;

  // Multi-Level Cache
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTtlMs: number = 15 * 60 * 1000; // 15 minutes
  private maxCacheSize: number = 100;

  // Observability & Telemetry
  private metrics: DiscoveryMetrics = {
    discoveryLatencyMs: 0,
    tIntentToRequestMs: 0,
    tProviderResponseMs: 0,
    tCandidateProcessingMs: 0,
    tPlayabilityResolutionMs: 0,
    tDiscoveryReadyMs: 0,
    candidateCount: 0,
    playableCandidateCount: 0,
    cacheHitRate: 0,
    prefetchHitRate: 0,
    providerErrors: 0,
    timeoutCount: 0,
    rateLimitEvents: 0,
    failoverCount: 0,
  };

  private totalQueries: number = 0;
  private cacheHits: number = 0;
  private prefetchHits: number = 0;

  private constructor() {}

  public static getInstance(): DiscoveryEngine {
    if (!DiscoveryEngine.instance) {
      DiscoveryEngine.instance = new DiscoveryEngine();
    }
    return DiscoveryEngine.instance;
  }

  /**
   * Register Provider Adapter
   */
  public registerProvider(adapter: MusicProviderAdapter): void {
    this.providers.set(adapter.getProviderId(), adapter);
    logger.info(
      'DiscoveryLayer',
      `Registered Provider: ${adapter.getProviderName()} [${adapter.getProviderId()}] (Capabilities: embed=${adapter.getCapabilities().officialEmbed}, stream=${adapter.getCapabilities().streaming})`
    );
  }

  public getProvider(providerId: string): MusicProviderAdapter | undefined {
    return this.providers.get(providerId);
  }

  public getRegisteredProviders(): MusicProviderAdapter[] {
    return Array.from(this.providers.values());
  }

  public getState(): DiscoveryState {
    return this.state;
  }

  public getMetrics(): DiscoveryMetrics {
    return {
      ...this.metrics,
      cacheHitRate: this.totalQueries > 0 ? Math.round((this.cacheHits / this.totalQueries) * 100) / 100 : 0,
      prefetchHitRate: this.totalQueries > 0 ? Math.round((this.prefetchHits / this.totalQueries) * 100) / 100 : 0,
    };
  }

  /**
   * Main Entry Point: Rapid candidate discovery from Stage 03 MusicIntent
   */
  public async discoverCandidates(intent: MusicIntent, limit: number = 20): Promise<MusicCandidate[]> {
    const t0 = performance.now();
    logger.startPerfMarker('DiscoveryExecution');

    this.totalQueries++;
    this.currentGenerationId++;
    const generationToken = this.currentGenerationId;

    // 1. Cancel active obsolete queries
    if (this.activeAbortController) {
      this.activeAbortController.abort('New intent discovery request started');
    }
    this.activeAbortController = new AbortController();
    const signal = this.activeAbortController.signal;

    this.setState('SEARCHING');

    const cacheKey = this.generateCacheKey(intent);
    const cachedEntry = this.cache.get(cacheKey);

    // 2. Check Cache
    if (cachedEntry && Date.now() - cachedEntry.timestamp < this.cacheTtlMs) {
      this.cacheHits++;
      if (cachedEntry.isPrefetched) this.prefetchHits++;

      const t1 = performance.now();
      this.updateMetrics(t0, t1, t1, t1, t1, cachedEntry.candidates.length);
      logger.info('DiscoveryLayer', `Cache HIT for intent [${intent.intentId}] (prefetched=${cachedEntry.isPrefetched})`);
      this.setState('RESULTS_READY');
      logger.endPerfMarker('DiscoveryExecution');
      return cachedEntry.candidates.slice(0, limit);
    }

    const tIntentToRequest = performance.now();
    const constraints = intentMapper.buildQueryConstraints(intent);

    let allCandidates: MusicCandidate[] = [];
    let eligibleProviders = this.getEligibleProviders();

    if (eligibleProviders.length === 0) {
      logger.warn('DiscoveryLayer', 'No eligible providers available. Activating fallback provider.');
      this.metrics.failoverCount++;
      this.setState('UNAVAILABLE');
    }

    // 3. Query Providers with Timeout and Failover
    for (const provider of eligibleProviders) {
      if (signal.aborted || generationToken !== this.currentGenerationId) {
        logger.info('DiscoveryLayer', `Discarding obsolete discovery generation [${generationToken}]`);
        return [];
      }

      try {
        const timeoutMs = 4000;
        const providerCandidates = await this.queryProviderWithTimeout(
          provider,
          intent,
          constraints,
          limit,
          signal,
          timeoutMs
        );

        if (providerCandidates && providerCandidates.length > 0) {
          allCandidates.push(...providerCandidates);
        }
      } catch (err) {
        this.metrics.providerErrors++;
        logger.warn('DiscoveryLayer', `Provider [${provider.getProviderId()}] failed: ${String(err)}. Cooling down.`);
        this.coolDownProvider(provider.getProviderId(), 30000); // 30s cooldown
        this.metrics.failoverCount++;
      }
    }

    const tProviderResponse = performance.now();

    // 4. Candidate Processing: Validation & Deduplication
    const validCandidates = allCandidates.filter((c) => this.validateCandidate(c));
    const deduplicatedCandidates = this.deduplicateCandidates(validCandidates);

    const tCandidateProcessing = performance.now();

    // 5. Playability Resolution & Relevance Ranking
    const playableCandidates = deduplicatedCandidates.filter(
      (c) => c.playbackCapability !== 'unavailable' && c.status === 'available'
    );
    const rankedCandidates = this.rankCandidates(playableCandidates, intent);

    const tPlayabilityResolution = performance.now();

    // 6. Check Generation Token Stale Response Prevention
    if (signal.aborted || generationToken !== this.currentGenerationId) {
      logger.info('DiscoveryLayer', `Generation [${generationToken}] superseded by new request`);
      return [];
    }

    // 7. Store Result in Cache
    if (rankedCandidates.length > 0) {
      this.addToCache(cacheKey, rankedCandidates, false);
      this.setState('RESULTS_READY');
    } else {
      this.setState('NO_RESULTS');
    }

    const tDiscoveryReady = performance.now();
    this.updateMetrics(t0, tIntentToRequest, tProviderResponse, tCandidateProcessing, tPlayabilityResolution, rankedCandidates.length);

    logger.endPerfMarker('DiscoveryExecution');
    logger.info(
      'DiscoveryLayer',
      `Discovered ${rankedCandidates.length} candidates (latency=${(tDiscoveryReady - t0).toFixed(2)}ms, status=${this.state})`
    );

    return rankedCandidates.slice(0, limit);
  }

  /**
   * Parallel Bounded Prefetching of Secondary Intents
   */
  public async prefetch(secondaryIntents: MusicIntent[]): Promise<void> {
    if (!secondaryIntents || secondaryIntents.length === 0) return;

    logger.info('DiscoveryLayer', `Initiating prefetch for ${secondaryIntents.length} secondary intents`);
    const prefetchSignal = new AbortController().signal;

    for (const intent of secondaryIntents.slice(0, 2)) {
      const cacheKey = this.generateCacheKey(intent);
      if (this.cache.has(cacheKey)) continue;

      const constraints = intentMapper.buildQueryConstraints(intent);
      const eligible = this.getEligibleProviders();

      if (eligible.length > 0) {
        try {
          const candidates = await eligible[0].searchCandidates(intent, constraints, 10, prefetchSignal);
          const valid = candidates.filter((c) => this.validateCandidate(c));
          const ranked = this.rankCandidates(this.deduplicateCandidates(valid), intent);

          if (ranked.length > 0) {
            this.addToCache(cacheKey, ranked, true);
            logger.info('DiscoveryLayer', `Prefetched ${ranked.length} candidates for prefetch intent [${intent.intentId}]`);
          }
        } catch (err) {
          logger.warn('DiscoveryLayer', `Prefetch failed for intent [${intent.intentId}]: ${String(err)}`);
        }
      }
    }
  }

  /**
   * Query Provider with explicit timeout wrapper
   */
  private async queryProviderWithTimeout(
    provider: MusicProviderAdapter,
    intent: MusicIntent,
    constraints: any,
    limit: number,
    signal: AbortSignal,
    timeoutMs: number
  ): Promise<MusicCandidate[]> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.metrics.timeoutCount++;
        reject(new Error(`Provider [${provider.getProviderId()}] request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      provider
        .searchCandidates(intent, constraints, limit, signal)
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /**
   * Candidate Deduplication by Artist + Title (Normalized)
   */
  private deduplicateCandidates(candidates: MusicCandidate[]): MusicCandidate[] {
    const seen = new Set<string>();
    const deduplicated: MusicCandidate[] = [];

    for (const candidate of candidates) {
      const normArtist = (candidate.artist || candidate.artists[0] || '').toLowerCase().trim();
      const normTitle = candidate.title.toLowerCase().trim();
      const key = `${normArtist}:${normTitle}`;

      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(candidate);
      }
    }

    return deduplicated;
  }

  /**
   * Relevance Ranking: Hard Constraint Filtering + Personalization Composite Scoring
   */
  private rankCandidates(candidates: MusicCandidate[], intent: MusicIntent): MusicCandidate[] {
    return personalizationScorer.scoreCandidates(candidates, intent);
  }

  /**
   * Candidate Safety & Field Validation
   */
  private validateCandidate(candidate?: MusicCandidate): boolean {
    if (!candidate || typeof candidate !== 'object') return false;
    if (!candidate.id || !candidate.title || !candidate.artist || !candidate.playbackRef) return false;

    // Security check: reject unsafe javascript: or data: URLs
    if (candidate.providerUrl && (candidate.providerUrl.startsWith('javascript:') || candidate.providerUrl.startsWith('data:'))) {
      return false;
    }
    if (candidate.artworkUrl && (candidate.artworkUrl.startsWith('javascript:') || candidate.artworkUrl.startsWith('data:'))) {
      return false;
    }

    return true;
  }

  /**
   * Filter Eligible Non-Cooling Providers
   */
  private getEligibleProviders(): MusicProviderAdapter[] {
    const now = Date.now();
    return Array.from(this.providers.values()).filter((p) => {
      const cooldownUntil = this.providerCooldowns.get(p.getProviderId()) || 0;
      return now >= cooldownUntil && p.getStatus() !== 'offline';
    });
  }

  private coolDownProvider(providerId: string, durationMs: number): void {
    this.providerCooldowns.set(providerId, Date.now() + durationMs);
  }

  private generateCacheKey(intent: MusicIntent): string {
    return `intent_${intent.emotion.normalizedEmotion}_v${Math.round(intent.valenceTarget * 10)}_e${Math.round(intent.energyTarget * 10)}_${intent.policy}_${intent.specificity}`;
  }

  private addToCache(key: string, candidates: MusicCandidate[], isPrefetched: boolean): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      key,
      candidates,
      timestamp: Date.now(),
      isPrefetched,
    });
  }

  private setState(newState: DiscoveryState): void {
    this.state = newState;
    logger.info('DiscoveryLayer', `Discovery State -> [${newState}]`);
  }

  private updateMetrics(
    t0: number,
    tReq: number,
    tResp: number,
    tProc: number,
    tResolv: number,
    candidateCount: number
  ): void {
    const totalLatency = performance.now() - t0;
    this.metrics = {
      ...this.metrics,
      discoveryLatencyMs: Math.round(totalLatency),
      tIntentToRequestMs: Math.round(tReq - t0),
      tProviderResponseMs: Math.round(tResp - tReq),
      tCandidateProcessingMs: Math.round(tProc - tResp),
      tPlayabilityResolutionMs: Math.round(tResolv - tProc),
      tDiscoveryReadyMs: Math.round(performance.now() - tResolv),
      candidateCount,
      playableCandidateCount: candidateCount,
    };
  }

  public clearCache(): void {
    this.cache.clear();
    this.providerCooldowns.clear();
    this.cacheHits = 0;
    this.prefetchHits = 0;
    this.totalQueries = 0;
  }
}

export const discoveryEngine = DiscoveryEngine.getInstance();
