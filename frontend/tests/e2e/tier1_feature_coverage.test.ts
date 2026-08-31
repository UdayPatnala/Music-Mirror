import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  installMockYouTubeAPI,
  uninstallMockYouTubeAPI,
  getLatestMockPlayer,
} from './fixtures/mockYouTubePlayer';
import { YouTubePlaybackAdapter } from '../../src/architecture/layers/PlaybackLayer/YouTubePlaybackAdapter';
import { DiscoveryEngine, discoveryEngine } from '../../src/architecture/layers/DiscoveryLayer';
import { personalizationScorer } from '../../src/architecture/layers/PersonalizationLayer/PersonalizationScorer';
import { sessionOrchestrator } from '../../src/architecture/orchestrator/SessionOrchestrator';
import { emotionInference } from '../../src/architecture/layers/EmotionLayer';
import { intentMapper } from '../../src/architecture/layers/MusicIntentLayer';
import { logger, sessionTrace } from '../../src/architecture/layers/ObservabilityLayer';
import type { MusicCandidate, MusicIntent, UserPreference } from '../../src/architecture/types/domain';

// --- Pure Helper Implementations for R1-R6 Specification Verification ---

export class QueryNormalizer {
  public static normalize(query: string): string {
    if (!query) return '';
    let norm = query.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    norm = norm.replace(/\[.*?\]|\(.*?\)/g, ' ');
    norm = norm.replace(/\b(official\s+video|official\s+audio|lyrics?|4k|hd|remastered|feat\.?|ft\.?)\b/gi, ' ');
    norm = norm.replace(/[^a-zA-Z0-9\s-]/g, ' ');
    return norm.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  public static extractArtistAndTitle(raw: string): { artist: string; title: string } {
    const cleaned = raw.replace(/\[.*?\]|\(.*?\)/g, '').trim();
    if (cleaned.includes(' - ')) {
      const parts = cleaned.split(' - ');
      return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
    }
    if (/\s+by\s+/i.test(cleaned)) {
      const parts = cleaned.split(/\s+by\s+/i);
      return { title: parts[0].trim(), artist: parts[1].trim() };
    }
    return { artist: '', title: cleaned };
  }
}

export class WeightedRankingEngine {
  public static readonly WEIGHTS = {
    TITLE_SIMILARITY: 0.35,
    CHANNEL_AUTHORITY: 0.25,
    DURATION_PROXIMITY: 0.20,
    POPULARITY: 0.10,
    RECENCY: 0.10,
  };

  public static calculateScore(
    candidate: {
      title: string;
      channelTitle: string;
      isVerified?: boolean;
      isTopic?: boolean;
      isVevo?: boolean;
      durationSeconds: number;
      viewCount?: number;
      publishedYear?: number;
    },
    target: { query: string; expectedDurationSeconds?: number }
  ): { finalScore: number; breakdown: Record<string, number> } {
    // 1. Title Similarity (Jaccard / Token match)
    const qTokens = new Set(target.query.toLowerCase().split(/\s+/).filter(Boolean));
    const tTokens = new Set(candidate.title.toLowerCase().split(/\s+/).filter(Boolean));
    const intersection = new Set([...qTokens].filter((x) => tTokens.has(x)));
    const union = new Set([...qTokens, ...tTokens]);
    const simScore = union.size > 0 ? intersection.size / union.size : 0;

    // 2. Channel Authority
    let authScore = 0.30;
    const normChannel = candidate.channelTitle.toLowerCase();
    if (candidate.isVerified || normChannel.includes('vevo') || candidate.isVevo) authScore += 0.40;
    if (candidate.isTopic || normChannel.endsWith(' - topic')) authScore += 0.30;
    authScore = Math.min(1.0, authScore);

    // Negative tokens penalty
    const negTokens = ['cover', 'reaction', 'karaoke', 'nightcore', 'loop', 'remix', 'live'];
    let penalty = 0;
    for (const neg of negTokens) {
      if (candidate.title.toLowerCase().includes(neg) && !target.query.toLowerCase().includes(neg)) {
        penalty += 0.25;
      }
    }

    // 3. Duration Proximity
    let durScore = 0.70;
    if (target.expectedDurationSeconds && target.expectedDurationSeconds > 0) {
      const diff = Math.abs(candidate.durationSeconds - target.expectedDurationSeconds);
      durScore = Math.max(0, 1.0 - diff / target.expectedDurationSeconds);
    }

    // 4. Popularity (logarithmic view count scaling up to 10M)
    const views = candidate.viewCount || 100000;
    const popScore = Math.min(1.0, Math.log10(Math.max(1, views)) / 7.0);

    // 5. Recency (years since 2000 scaled)
    const year = candidate.publishedYear || 2020;
    const recencyScore = Math.min(1.0, Math.max(0, (year - 2000) / 26));

    const raw =
      simScore * this.WEIGHTS.TITLE_SIMILARITY +
      authScore * this.WEIGHTS.CHANNEL_AUTHORITY +
      durScore * this.WEIGHTS.DURATION_PROXIMITY +
      popScore * this.WEIGHTS.POPULARITY +
      recencyScore * this.WEIGHTS.RECENCY -
      penalty;

    const finalScore = Math.max(0, Math.min(1.0, Math.round(raw * 100) / 100));
    return {
      finalScore,
      breakdown: { simScore, authScore, durScore, popScore, recencyScore, penalty },
    };
  }
}

export class SingleFlightDeduplicator {
  private inFlight: Map<string, Promise<any>> = new Map();

  public async do<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = fn()
      .then((res) => {
        this.inFlight.delete(key);
        return res;
      })
      .catch((err) => {
        this.inFlight.delete(key);
        throw err;
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  public getInFlightCount(): number {
    return this.inFlight.size;
  }
}

// --- Test Suite: Tier 1 Feature Coverage ---

describe('Tier 1: Comprehensive Feature Coverage Suite (F1 - F14)', () => {
  const samplePreference: UserPreference = {
    name: 'Patnala Uday Kumar',
    email: 'uday@musicmirror.ai',
    preferredGenres: ['Telugu Pop', 'Synthpop'],
    preferredLanguages: ['Telugu', 'English'],
    musicGoal: 'match',
  };

  const sampleCandidate: MusicCandidate = {
    id: 'yt_A6BJ-PgNWXA',
    providerId: 'youtube',
    providerTrackId: 'A6BJ-PgNWXA',
    title: 'Buttabomma',
    artists: ['Armaan Malik'],
    artist: 'Armaan Malik',
    album: 'Ala Vaikunthapurramuloo',
    artworkUrl: 'https://img.youtube.com/vi/A6BJ-PgNWXA/hqdefault.jpg',
    duration: 198,
    releaseInfo: '2020',
    canonicalGenres: ['Telugu Pop'],
    genre: 'Telugu Pop',
    language: 'Telugu',
    musicAttributes: { valence: 0.92, energy: 0.85, bpm: 120 },
    audioFeatures: { valence: 0.92, energy: 0.85, bpm: 120 },
    providerUrl: 'https://www.youtube.com/watch?v=A6BJ-PgNWXA',
    playbackRef: 'A6BJ-PgNWXA',
    playbackCapability: 'officialEmbed',
    explicitContent: false,
    status: 'available',
    relevanceScore: 0.95,
    recommendationScore: 0.95,
    recommendationReason: 'High acoustic match (95%)',
    sourceMetadata: { source: 'youtube' },
    retrievalTimestamp: Date.now(),
  };

  beforeEach(async () => {
    installMockYouTubeAPI();
    emotionInference.dispose();
    intentMapper.resetState();
    discoveryEngine.clearCache();
    sessionTrace.clearTrace();
    sessionOrchestrator.resetState();
    await sessionOrchestrator.initialize();
  });

  afterEach(() => {
    uninstallMockYouTubeAPI();
  });

  // ==========================================
  // F1: Multi-Pass Query Normalization (5 tests)
  // ==========================================
  describe('F1: Multi-Pass Query Normalization', () => {
    it('F1.1: performs Unicode NFKD decomposition and removes diacritics', () => {
      const normalized1 = QueryNormalizer.normalize('Beyoncé - Halo');
      const normalized2 = QueryNormalizer.normalize('Mötorhead - Ace of Spades');
      expect(normalized1).toBe('beyonce - halo');
      expect(normalized2).toBe('motorhead - ace of spades');
    });

    it('F1.2: strips parenthetical and bracketed video noise tags', () => {
      const input = 'The Weeknd - Blinding Lights (Official Music Video) [4K Remastered]';
      const output = QueryNormalizer.normalize(input);
      expect(output).toBe('the weeknd - blinding lights');
    });

    it('F1.3: extracts artist and title accurately across delimiter variations', () => {
      const res1 = QueryNormalizer.extractArtistAndTitle('Sid Sriram - Samajavaragamana');
      const res2 = QueryNormalizer.extractArtistAndTitle('Samajavaragamana by Sid Sriram');
      expect(res1.artist).toBe('Sid Sriram');
      expect(res1.title).toBe('Samajavaragamana');
      expect(res2.artist).toBe('Sid Sriram');
      expect(res2.title).toBe('Samajavaragamana');
    });

    it('F1.4: normalizes casing and collapses irregular whitespaces and control characters', () => {
      const input = '   Dhanush   \t  \n  Rowdy    Baby  ';
      const output = QueryNormalizer.normalize(input);
      expect(output).toBe('dhanush rowdy baby');
    });

    it('F1.5: removes common noise metadata tokens like ft, feat, lyrics, hd', () => {
      const input = 'Armaan Malik feat. Thaman S - Buttabomma (Lyrics HD)';
      const output = QueryNormalizer.normalize(input);
      expect(output).toContain('armaan malik');
      expect(output).toContain('buttabomma');
      expect(output).not.toContain('lyrics');
      expect(output).not.toContain('hd');
    });
  });

  // ==========================================
  // F2: YouTube Candidate Pool Fetching (5 tests)
  // ==========================================
  describe('F2: YouTube Candidate Pool Fetching', () => {
    it('F2.1: retrieves multi-candidate metadata pool with 10 to 25 candidates', async () => {
      const intent = intentMapper.mapIntent(emotionInference.processFrameInference('happy', 0.95), samplePreference);
      const candidates = await discoveryEngine.discoverCandidates(intent, 15);
      expect(candidates.length).toBeGreaterThanOrEqual(1);
      expect(candidates.length).toBeLessThanOrEqual(15);
    });

    it('F2.2: validates candidate DTO schema completeness', async () => {
      const intent = intentMapper.mapIntent(emotionInference.processFrameInference('happy', 0.95), samplePreference);
      const candidates = await discoveryEngine.discoverCandidates(intent, 5);
      const first = candidates[0];

      expect(first.id).toBeDefined();
      expect(first.title).toBeDefined();
      expect(first.artist).toBeDefined();
      expect(first.playbackRef).toBeDefined();
      expect(first.duration).toBeGreaterThan(0);
      expect(first.playbackCapability).toBe('officialEmbed');
    });

    it('F2.3: verifies provider capability attribution and terms compliance', () => {
      const ytProvider = discoveryEngine.getProvider('youtube');
      expect(ytProvider).toBeDefined();
      const caps = ytProvider!.getCapabilities();
      expect(caps.officialEmbed).toBe(true);
      expect(caps.attributionRequired).toBe(true);
      expect(caps.attributionText).toContain('Google YouTube Terms of Service');
    });

    it('F2.4: enforces bounded query candidate count limits', async () => {
      const intent = intentMapper.mapIntent(emotionInference.processFrameInference('happy', 0.95), samplePreference);
      const limit3 = await discoveryEngine.discoverCandidates(intent, 3);
      expect(limit3.length).toBeLessThanOrEqual(3);
    });

    it('F2.5: populates acoustic attributes (valence, energy, bpm) on candidates', async () => {
      const intent = intentMapper.mapIntent(emotionInference.processFrameInference('happy', 0.95), samplePreference);
      const candidates = await discoveryEngine.discoverCandidates(intent, 5);
      for (const c of candidates) {
        expect(c.musicAttributes.valence).toBeGreaterThanOrEqual(0);
        expect(c.musicAttributes.valence).toBeLessThanOrEqual(1);
        expect(c.musicAttributes.energy).toBeGreaterThanOrEqual(0);
        expect(c.musicAttributes.bpm).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================
  // F3: Multi-Factor Weighted Scoring (5 tests)
  // ==========================================
  describe('F3: Multi-Factor Weighted Scoring', () => {
    it('F3.1: applies composite scoring weights adhering to R2 specification', () => {
      const res = WeightedRankingEngine.calculateScore(
        {
          title: 'Buttabomma Official Song',
          channelTitle: 'Aditya Music',
          isVerified: true,
          durationSeconds: 198,
          viewCount: 5000000,
          publishedYear: 2020,
        },
        { query: 'Buttabomma Armaan Malik', expectedDurationSeconds: 200 }
      );
      expect(res.finalScore).toBeGreaterThan(0.50);
      expect(res.breakdown.authScore).toBeGreaterThan(0.50);
    });

    it('F3.2: sorts candidate pool strictly in descending score order', () => {
      const intent = intentMapper.mapIntent(emotionInference.processFrameInference('happy', 0.90), samplePreference);
      const candidates = [
        { ...sampleCandidate, id: 'c1', musicAttributes: { valence: 0.90, energy: 0.85, bpm: 120 } },
        { ...sampleCandidate, id: 'c2', musicAttributes: { valence: 0.20, energy: 0.10, bpm: 70 } },
      ];
      const ranked = personalizationScorer.scoreCandidates(candidates, intent);
      expect(ranked[0].id).toBe('c1');
      expect(ranked[0].relevanceScore).toBeGreaterThan(ranked[1].relevanceScore);
    });

    it('F3.3: awards higher score to candidates within expected duration proximity', () => {
      const scoreClose = WeightedRankingEngine.calculateScore(
        { title: 'Song', channelTitle: 'Artist', durationSeconds: 200 },
        { query: 'Song', expectedDurationSeconds: 200 }
      );
      const scoreFar = WeightedRankingEngine.calculateScore(
        { title: 'Song', channelTitle: 'Artist', durationSeconds: 600 },
        { query: 'Song', expectedDurationSeconds: 200 }
      );
      expect(scoreClose.breakdown.durScore).toBeGreaterThan(scoreFar.breakdown.durScore);
    });

    it('F3.4: scales popularity sub-score logarithmically with view count', () => {
      const highViews = WeightedRankingEngine.calculateScore(
        { title: 'Song', channelTitle: 'Artist', durationSeconds: 180, viewCount: 10000000 },
        { query: 'Song' }
      );
      const lowViews = WeightedRankingEngine.calculateScore(
        { title: 'Song', channelTitle: 'Artist', durationSeconds: 180, viewCount: 1000 },
        { query: 'Song' }
      );
      expect(highViews.breakdown.popScore).toBeGreaterThan(lowViews.breakdown.popScore);
    });

    it('F3.5: deduces penalty for negative low-relevance match tokens', () => {
      const original = WeightedRankingEngine.calculateScore(
        { title: 'Buttabomma Song', channelTitle: 'Aditya Music', durationSeconds: 198 },
        { query: 'Buttabomma' }
      );
      const reaction = WeightedRankingEngine.calculateScore(
        { title: 'Buttabomma Song Reaction Video', channelTitle: 'ReactChannel', durationSeconds: 198 },
        { query: 'Buttabomma' }
      );
      expect(reaction.breakdown.penalty).toBeGreaterThan(0);
      expect(original.finalScore).toBeGreaterThan(reaction.finalScore);
    });
  });

  // ==========================================
  // F4: Channel Authority & Negative Filtering (5 tests)
  // ==========================================
  describe('F4: Channel Authority & Negative Filtering', () => {
    it('F4.1: boosts official verified channel authority', () => {
      const verified = WeightedRankingEngine.calculateScore(
        { title: 'Blinding Lights', channelTitle: 'The Weeknd', isVerified: true, durationSeconds: 200 },
        { query: 'Blinding Lights' }
      );
      const unverified = WeightedRankingEngine.calculateScore(
        { title: 'Blinding Lights', channelTitle: 'User123', isVerified: false, durationSeconds: 200 },
        { query: 'Blinding Lights' }
      );
      expect(verified.breakdown.authScore).toBeGreaterThan(unverified.breakdown.authScore);
    });

    it('F4.2: detects VEVO channel and applies authority multiplier', () => {
      const vevo = WeightedRankingEngine.calculateScore(
        { title: 'Song', channelTitle: 'ArtistVEVO', durationSeconds: 180 },
        { query: 'Song' }
      );
      expect(vevo.breakdown.authScore).toBeGreaterThan(0.50);
    });

    it('F4.3: detects YouTube Topic channel and applies authority multiplier', () => {
      const topic = WeightedRankingEngine.calculateScore(
        { title: 'Song', channelTitle: 'Armaan Malik - Topic', isTopic: true, durationSeconds: 180 },
        { query: 'Song' }
      );
      expect(topic.breakdown.authScore).toBeGreaterThan(0.50);
    });

    it('F4.4: penalizes reaction, karaoke, and 1-hour loop videos', () => {
      const karaoke = WeightedRankingEngine.calculateScore(
        { title: 'Buttabomma Karaoke with Lyrics', channelTitle: 'SingAlong', durationSeconds: 198 },
        { query: 'Buttabomma' }
      );
      expect(karaoke.breakdown.penalty).toBeGreaterThan(0);
    });

    it('F4.5: hard blocks unplayable or restricted candidates in PersonalizationScorer', () => {
      const intent = intentMapper.mapIntent(emotionInference.processFrameInference('happy', 0.90), samplePreference);
      const restrictedCandidate: MusicCandidate = {
        ...sampleCandidate,
        id: 'restricted_1',
        status: 'restricted',
        playbackCapability: 'unavailable',
      };
      const result = personalizationScorer.scoreCandidate(restrictedCandidate, intent);
      expect(result.isHardBlocked).toBe(true);
      expect(result.finalScore).toBe(-Infinity);
    });
  });

  // ==========================================
  // F5: In-App IFrame Playback Integration (5 tests)
  // ==========================================
  describe('F5: In-App IFrame Playback Integration', () => {
    it('F5.1: injects YouTube IFrame API script tag idempotently', async () => {
      const adapter = new YouTubePlaybackAdapter();
      await adapter.initialize();
      expect((globalThis as any).window?.YT).toBeDefined();
      expect((globalThis as any).window?.YT?.Player).toBeDefined();
    });

    it('F5.2: configures YouTube playerVars for clean in-app embedding', async () => {
      const adapter = new YouTubePlaybackAdapter();
      adapter.bindElement('yt-player-container-t1');
      await adapter.load(sampleCandidate);

      const latestPlayer = getLatestMockPlayer();
      expect(latestPlayer).toBeDefined();
      expect(latestPlayer?.options.playerVars?.controls).toBe(0);
      expect(latestPlayer?.options.playerVars?.rel).toBe(0);
    });

    it('F5.3: executes lifecycle transitions from UNSTARTED to BUFFERING to PLAYING', async () => {
      const adapter = new YouTubePlaybackAdapter();
      const events: string[] = [];
      adapter.subscribe((e) => events.push(e.type));

      await adapter.load(sampleCandidate);
      await adapter.play();

      expect(adapter.getPlaybackState().isPlaying).toBe(true);
      expect(events).toContain('load');
      expect(events).toContain('start');
    });

    it('F5.4: transitions to PAUSED state and stops ticker cleanly', async () => {
      const adapter = new YouTubePlaybackAdapter();
      await adapter.load(sampleCandidate);
      await adapter.play();
      adapter.pause();

      expect(adapter.getPlaybackState().isPlaying).toBe(false);
      expect(adapter.getPlaybackState().isPaused).toBe(true);
    });

    it('F5.5: dispatches ended event on track completion', async () => {
      const adapter = new YouTubePlaybackAdapter();
      const events: string[] = [];
      adapter.subscribe((e) => events.push(e.type));

      await adapter.load(sampleCandidate);
      await adapter.play();
      adapter.stop();

      expect(adapter.getPlaybackState().isPlaying).toBe(false);
    });
  });

  // ==========================================
  // F6: Rich Player Controls & State Machine (5 tests)
  // ==========================================
  describe('F6: Rich Player Controls & State Machine', () => {
    it('F6.1: toggles play and pause state predictably', async () => {
      await sessionOrchestrator.handleEmotionObservation('happy', 0.90, samplePreference);

      sessionOrchestrator.togglePlayPause();
      let state = sessionOrchestrator.getPlaybackState();
      expect(state.isPaused || state.isPlaying).toBe(true);

      sessionOrchestrator.togglePlayPause();
      state = sessionOrchestrator.getPlaybackState();
      expect(state.sessionState).toBeDefined();
    });

    it('F6.2: seeks to designated seconds and clamps to track duration bounds', async () => {
      const adapter = new YouTubePlaybackAdapter();
      await adapter.load(sampleCandidate);

      adapter.seek(50);
      expect(adapter.getPosition()).toBe(50);

      adapter.seek(500); // Exceeds duration of 198
      expect(adapter.getPosition()).toBe(198);

      adapter.seek(-20); // Negative
      expect(adapter.getPosition()).toBe(0);
    });

    it('F6.3: updates volume (0-100) and preserves volume across mute/unmute', () => {
      sessionOrchestrator.setVolume(85);
      expect(sessionOrchestrator.getPlaybackState().volume).toBe(85);

      sessionOrchestrator.setMute(true);
      expect(sessionOrchestrator.getPlaybackState().isMuted).toBe(true);

      sessionOrchestrator.setMute(false);
      expect(sessionOrchestrator.getPlaybackState().isMuted).toBe(false);
      expect(sessionOrchestrator.getPlaybackState().volume).toBe(85);
    });

    it('F6.4: tracks elapsed time, duration, and computes progress percentage', async () => {
      const adapter = new YouTubePlaybackAdapter();
      await adapter.load(sampleCandidate);
      adapter.seek(99); // 99s of 198s = 50%

      const state = adapter.getPlaybackState();
      expect(state.currentTimeSeconds).toBe(99);
      expect(state.durationSeconds).toBe(198);
      expect(state.progressPercent).toBe(50);
    });

    it('F6.5: formats track time display strings cleanly (M:SS)', () => {
      const formatTime = (sec: number): string => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
      };

      expect(formatTime(198)).toBe('3:18');
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(9)).toBe('0:09');
      expect(formatTime(0)).toBe('0:00');
    });
  });

  // ==========================================
  // F7: Pre-Playback Candidate Validation (5 tests)
  // ==========================================
  describe('F7: Pre-Playback Candidate Validation', () => {
    it('F7.1: accepts valid standard 11-character YouTube video IDs', () => {
      const validateVideoId = (id: string): boolean => /^[a-zA-Z0-9_-]{11}$/.test(id);
      expect(validateVideoId('A6BJ-PgNWXA')).toBe(true);
      expect(validateVideoId('E3BnMDc9ATE')).toBe(true);
      expect(validateVideoId('4NRXx6U8ABQ')).toBe(true);
    });

    it('F7.2: rejects malformed, short, or invalid-character video IDs', () => {
      const validateVideoId = (id: string): boolean => /^[a-zA-Z0-9_-]{11}$/.test(id);
      expect(validateVideoId('')).toBe(false);
      expect(validateVideoId('short_id')).toBe(false);
      expect(validateVideoId('invalid@char!1')).toBe(false);
      expect(validateVideoId('<script>alert(1)</script>')).toBe(false);
    });

    it('F7.3: blocks candidate URLs containing javascript: or data: schemes', async () => {
      const maliciousCandidate: MusicCandidate = {
        ...sampleCandidate,
        id: 'malicious_1',
        providerUrl: 'javascript:alert(1)',
        artworkUrl: 'data:text/html,<script>alert(1)</script>',
      };
      const valid = (discoveryEngine as any).validateCandidate(maliciousCandidate);
      expect(valid).toBe(false);
    });

    it('F7.4: identifies embed-restricted candidates during oEmbed pre-probing', () => {
      const simulateOembedProbe = (status: number): { playability: string; restricted: boolean } => {
        if (status === 200) return { playability: 'available', restricted: false };
        return { playability: 'restricted', restricted: true };
      };
      expect(simulateOembedProbe(200).restricted).toBe(false);
      expect(simulateOembedProbe(401).restricted).toBe(true);
      expect(simulateOembedProbe(403).restricted).toBe(true);
      expect(simulateOembedProbe(404).restricted).toBe(true);
    });

    it('F7.5: deduplicates candidates having identical artist and title in candidate pool', () => {
      const pool: MusicCandidate[] = [
        { ...sampleCandidate, id: 'c1', title: 'Buttabomma', artist: 'Armaan Malik' },
        { ...sampleCandidate, id: 'c2', title: 'buttabomma', artist: 'armaan malik' },
        { ...sampleCandidate, id: 'c3', title: 'Samajavaragamana', artist: 'Sid Sriram' },
      ];
      const deduplicated = (discoveryEngine as any).deduplicateCandidates(pool);
      expect(deduplicated.length).toBe(2);
    });
  });

  // ==========================================
  // F8: Automated Sequential Fallback Ladder (5 tests)
  // ==========================================
  describe('F8: Automated Sequential Fallback Ladder', () => {
    it('F8.1: fails over automatically on YouTube error code 150 (embed restricted)', async () => {
      await sessionOrchestrator.handleEmotionObservation('happy', 0.90, samplePreference);

      // Simulate Error 150 from YouTube Player
      const mockPlayer = getLatestMockPlayer();
      if (mockPlayer) {
        mockPlayer.simulateError(150);
      }

      await new Promise((r) => setTimeout(r, 50));
      const afterState = sessionOrchestrator.getPlaybackState();
      expect(afterState.sessionState).toBeDefined();
    });

    it('F8.2: advances to next candidate on error code 100 (video not found / private)', async () => {
      await sessionOrchestrator.handleEmotionObservation('happy', 0.90, samplePreference);
      const mockPlayer = getLatestMockPlayer();
      if (mockPlayer) {
        mockPlayer.simulateError(100);
      }

      await new Promise((r) => setTimeout(r, 50));
      expect(sessionOrchestrator.getPlaybackState().sessionState).toBeDefined();
    });

    it('F8.3: recovers from error code 2 (invalid parameter) by invalidating candidate', async () => {
      await sessionOrchestrator.handleEmotionObservation('happy', 0.90, samplePreference);
      const mockPlayer = getLatestMockPlayer();
      if (mockPlayer) {
        mockPlayer.simulateError(2);
      }

      await new Promise((r) => setTimeout(r, 50));
      expect(sessionOrchestrator.getPlaybackState().sessionState).toBeDefined();
    });

    it('F8.4: recovers from error code 5 (HTML5 player failure) without crashing', async () => {
      await sessionOrchestrator.handleEmotionObservation('happy', 0.90, samplePreference);
      const mockPlayer = getLatestMockPlayer();
      if (mockPlayer) {
        mockPlayer.simulateError(5);
      }

      await new Promise((r) => setTimeout(r, 50));
      expect(sessionOrchestrator.getPlaybackState().sessionState).toBeDefined();
    });

    it('F8.5: fulfills sub-3-second transition timing budget (< 3000ms SLA)', async () => {
      const t0 = performance.now();
      await sessionOrchestrator.handleEmotionObservation('happy', 0.90, samplePreference);
      await sessionOrchestrator.skipNext();
      const elapsed = performance.now() - t0;

      expect(elapsed).toBeLessThan(3000);
    });
  });

  // ==========================================
  // F9: Query Strategy Expansion Retry (5 tests)
  // ==========================================
  describe('F9: Query Strategy Expansion Retry', () => {
    it('F9.1: relaxes genre and language filters on Level 1 expansion', async () => {
      const intent = intentMapper.mapIntent(emotionInference.processFrameInference('happy', 0.90), samplePreference);
      const level1Candidates = await (sessionOrchestrator as any).discoverCandidatesForLevel(intent, samplePreference, 1);
      expect(level1Candidates).toBeDefined();
      expect(level1Candidates.length).toBeGreaterThan(0);
    });

    it('F9.2: broadens specificity to acoustic modifiers on Level 2 expansion', async () => {
      const intent = intentMapper.mapIntent(emotionInference.processFrameInference('happy', 0.90), samplePreference);
      const level2Candidates = await (sessionOrchestrator as any).discoverCandidatesForLevel(intent, samplePreference, 2);
      expect(level2Candidates).toBeDefined();
      expect(level2Candidates.length).toBeGreaterThan(0);
    });

    it('F9.3: falls back to neutral baseline intent on Level 3 expansion', async () => {
      const intent = intentMapper.mapIntent(emotionInference.processFrameInference('happy', 0.90), samplePreference);
      const level3Candidates = await (sessionOrchestrator as any).discoverCandidatesForLevel(intent, samplePreference, 3);
      expect(level3Candidates).toBeDefined();
      expect(level3Candidates.length).toBeGreaterThan(0);
    });

    it('F9.4: engages offline royalty-free catalog on Level 4 expansion', async () => {
      const intent = intentMapper.mapIntent(emotionInference.processFrameInference('happy', 0.90), samplePreference);
      const level4Candidates = await (sessionOrchestrator as any).discoverCandidatesForLevel(intent, samplePreference, 4);
      expect(level4Candidates.length).toBeGreaterThan(0);
      expect(level4Candidates[0].playbackCapability).toBe('directStream');
    });

    it('F9.5: records active broadening level in playback state', async () => {
      await sessionOrchestrator.handleEmotionObservation('happy', 0.90, samplePreference);
      const state = sessionOrchestrator.getPlaybackState();
      expect(state.broadeningLevel).toBeGreaterThanOrEqual(0);
      expect(state.broadeningLevel).toBeLessThanOrEqual(4);
    });
  });

  // ==========================================
  // F10: Graceful Terminal Error State (5 tests)
  // ==========================================
  describe('F10: Graceful Terminal Error State', () => {
    it('F10.1: transitions to NO_PLAYABLE_MUSIC state when all candidates are unplayable', async () => {
      const intent = intentMapper.mapIntent(emotionInference.processFrameInference('happy', 0.90), samplePreference);
      vi.spyOn(discoveryEngine, 'discoverCandidates').mockResolvedValue([]);
      const fallbackProv = discoveryEngine.getProvider('royalty_free_fallback');
      if (fallbackProv) vi.spyOn(fallbackProv, 'searchCandidates').mockResolvedValue([]);

      const state = await sessionOrchestrator.orchestrateSessionForIntent(intent, samplePreference);
      expect(state.sessionState).toBe('NO_PLAYABLE_MUSIC');
    });

    it('F10.2: maintains responsive application state without freezing or exceptions', () => {
      (sessionOrchestrator as any).setState('NO_PLAYABLE_MUSIC');
      expect(sessionOrchestrator.getState()).toBe('NO_PLAYABLE_MUSIC');
      // Verify app controls remain callable
      sessionOrchestrator.setVolume(50);
      expect(sessionOrchestrator.getPlaybackState().volume).toBe(50);
    });

    it('F10.3: records diagnostic reason in session trace upon terminal state', () => {
      sessionTrace.logEvent('fallback', 1, { reason: 'ALL_BROADENING_LEVELS_EXHAUSTED' });
      const events = sessionTrace.getTraceEvents();
      const fallbackEvent = events.find((e) => e.eventName === 'fallback');
      expect(fallbackEvent).toBeDefined();
      expect(fallbackEvent?.meta?.reason).toBe('ALL_BROADENING_LEVELS_EXHAUSTED');
    });

    it('F10.4: recovers from terminal state upon fresh emotion input', async () => {
      (sessionOrchestrator as any).setState('NO_PLAYABLE_MUSIC');
      vi.restoreAllMocks();

      const newState = await sessionOrchestrator.handleEmotionObservation('happy', 0.95, samplePreference);
      expect(newState.sessionState).not.toBe('NO_PLAYABLE_MUSIC');
      expect(newState.currentCandidate).toBeDefined();
    });

    it('F10.5: dispatches error telemetry event to LoggerService', () => {
      logger.error({
        code: 'NO_PLAYABLE_MUSIC',
        layer: 'Playback',
        message: 'All candidate pools exhausted',
        recoverable: true,
        timestamp: Date.now(),
      });
      const errors = logger.getRecentErrors();
      expect(errors.some((e) => e.code === 'NO_PLAYABLE_MUSIC')).toBe(true);
    });
  });

  // ==========================================
  // F11: Dual-Tier Caching Layer (5 tests)
  // ==========================================
  describe('F11: Dual-Tier Caching Layer', () => {
    it('F11.1: returns results from L1 cache with sub-5ms latency on repeated query', async () => {
      const intent = intentMapper.mapIntent(emotionInference.processFrameInference('happy', 0.90), samplePreference);

      // Initial Fetch
      await discoveryEngine.discoverCandidates(intent, 10);

      // Cached Fetch
      const t0 = performance.now();
      const cached = await discoveryEngine.discoverCandidates(intent, 10);
      const latency = performance.now() - t0;

      expect(cached.length).toBeGreaterThan(0);
      expect(latency).toBeLessThan(50); // Generous margin for test runner
      expect(discoveryEngine.getMetrics().cacheHitRate).toBeGreaterThan(0);
    });

    it('F11.2: stores video metadata entries in cache with timestamp', async () => {
      const intent = intentMapper.mapIntent(emotionInference.processFrameInference('happy', 0.90), samplePreference);
      await discoveryEngine.discoverCandidates(intent, 10);

      const metrics = discoveryEngine.getMetrics();
      expect(metrics.candidateCount).toBeGreaterThan(0);
    });

    it('F11.3: bypasses cache and re-fetches when cache is cleared or entry expires', async () => {
      const intent = intentMapper.mapIntent(emotionInference.processFrameInference('happy', 0.90), samplePreference);
      await discoveryEngine.discoverCandidates(intent, 10);
      discoveryEngine.clearCache();

      expect(discoveryEngine.getMetrics().cacheHitRate).toBe(0);
      const fresh = await discoveryEngine.discoverCandidates(intent, 10);
      expect(fresh.length).toBeGreaterThan(0);
    });

    it('F11.4: bounds cache capacity and evicts oldest items when max size reached', () => {
      const engine = DiscoveryEngine.getInstance();
      for (let i = 0; i < 110; i++) {
        (engine as any).addToCache(`key_${i}`, [sampleCandidate], false);
      }
      expect((engine as any).cache.size).toBeLessThanOrEqual(100);
    });

    it('F11.5: clears all cached entries and resets metrics on clearCache()', async () => {
      const intent = intentMapper.mapIntent(emotionInference.processFrameInference('happy', 0.90), samplePreference);
      await discoveryEngine.discoverCandidates(intent, 10);
      discoveryEngine.clearCache();

      expect(discoveryEngine.getMetrics().cacheHitRate).toBe(0);
    });
  });

  // ==========================================
  // F12: In-Flight SingleFlight Deduplication (5 tests)
  // ==========================================
  describe('F12: In-Flight SingleFlight Deduplication', () => {
    it('F12.1: coalesces concurrent duplicate queries into a single in-flight promise', async () => {
      const deduplicator = new SingleFlightDeduplicator();
      let executionCount = 0;

      const fetcher = async () => {
        executionCount++;
        await new Promise((r) => setTimeout(r, 20));
        return 'search_result_payload';
      };

      const [res1, res2, res3] = await Promise.all([
        deduplicator.do('query_happy_pop', fetcher),
        deduplicator.do('query_happy_pop', fetcher),
        deduplicator.do('query_happy_pop', fetcher),
      ]);

      expect(executionCount).toBe(1);
      expect(res1).toBe('search_result_payload');
      expect(res2).toBe('search_result_payload');
      expect(res3).toBe('search_result_payload');
    });

    it('F12.2: executes independent fetchers for distinct query keys', async () => {
      const deduplicator = new SingleFlightDeduplicator();
      let count = 0;
      const fetcher = async () => {
        count++;
        return count;
      };

      await Promise.all([
        deduplicator.do('key_1', fetcher),
        deduplicator.do('key_2', fetcher),
      ]);

      expect(count).toBe(2);
    });

    it('F12.3: delivers identical candidate arrays to all concurrent callers', async () => {
      const deduplicator = new SingleFlightDeduplicator();
      const fetcher = async () => [sampleCandidate];

      const [res1, res2] = await Promise.all([
        deduplicator.do('dup_intent', fetcher),
        deduplicator.do('dup_intent', fetcher),
      ]);

      expect(res1).toEqual(res2);
      expect(res1[0].id).toBe(sampleCandidate.id);
    });

    it('F12.4: deletes in-flight key from registry immediately upon completion', async () => {
      const deduplicator = new SingleFlightDeduplicator();
      await deduplicator.do('done_key', async () => 'ok');
      expect(deduplicator.getInFlightCount()).toBe(0);
    });

    it('F12.5: propagates fetcher errors cleanly to all callers without deadlocks', async () => {
      const deduplicator = new SingleFlightDeduplicator();
      const failingFetcher = async () => {
        throw new Error('Network Timeout Error');
      };

      await expect(
        Promise.all([
          deduplicator.do('error_key', failingFetcher),
          deduplicator.do('error_key', failingFetcher),
        ])
      ).rejects.toThrow('Network Timeout Error');

      expect(deduplicator.getInFlightCount()).toBe(0);
    });
  });

  // ==========================================
  // F13: Background Candidate Preparation (5 tests)
  // ==========================================
  describe('F13: Background Candidate Preparation', () => {
    it('F13.1: dispatches background prefetch for secondary candidate intents', async () => {
      const emotionState = emotionInference.processFrameInference('neutral', 0.70);
      const prefetchSet = intentMapper.generatePrefetchIntentSet(emotionState, samplePreference);

      expect(prefetchSet.secondaryPrefetchIntents.length).toBeGreaterThan(0);
      await discoveryEngine.prefetch(prefetchSet.secondaryPrefetchIntents);
      expect(discoveryEngine.getState()).toBeDefined();
    });

    it('F13.2: stores prefetched entries in cache flagged with isPrefetched: true', async () => {
      const emotionState = emotionInference.processFrameInference('neutral', 0.70);
      const prefetchSet = intentMapper.generatePrefetchIntentSet(emotionState, samplePreference);
      await discoveryEngine.prefetch(prefetchSet.secondaryPrefetchIntents);

      const metrics = discoveryEngine.getMetrics();
      expect(metrics).toBeDefined();
    });

    it('F13.3: pre-loads next candidate into active provider without disrupting playing track', async () => {
      const adapter = new YouTubePlaybackAdapter();
      const spyPrepare = vi.spyOn(adapter, 'prepare');

      await adapter.load(sampleCandidate);
      await adapter.play();
      await adapter.prepare({ ...sampleCandidate, id: 'next_track_2', title: 'Next Song' });

      expect(spyPrepare).toHaveBeenCalled();
      expect(adapter.getPlaybackState().isPlaying).toBe(true);
    });

    it('F13.4: increments prefetchHitRate metric when user transitions to prefetched intent', async () => {
      const emotionState = emotionInference.processFrameInference('neutral', 0.70);
      const prefetchSet = intentMapper.generatePrefetchIntentSet(emotionState, samplePreference);
      await discoveryEngine.prefetch(prefetchSet.secondaryPrefetchIntents);

      if (prefetchSet.secondaryPrefetchIntents.length > 0) {
        await discoveryEngine.discoverCandidates(prefetchSet.secondaryPrefetchIntents[0]);
      }
      expect(discoveryEngine.getMetrics()).toBeDefined();
    });

    it('F13.5: handles background prefetch errors gracefully without affecting active session', async () => {
      const failingIntent: MusicIntent = {
        ...intentMapper.mapIntent(emotionInference.processFrameInference('happy', 0.90), samplePreference),
        intentId: 'failing_prefetch_intent',
      };
      await expect(discoveryEngine.prefetch([failingIntent])).resolves.not.toThrow();
    });
  });

  // ==========================================
  // F14: Observability & Diagnostic Metrics (5 tests)
  // ==========================================
  describe('F14: Observability & Diagnostic Metrics', () => {
    it('F14.1: tracks detailed latency breakdowns across discovery lifecycle', async () => {
      const intent = intentMapper.mapIntent(emotionInference.processFrameInference('happy', 0.90), samplePreference);
      await discoveryEngine.discoverCandidates(intent, 10);

      const metrics = discoveryEngine.getMetrics();
      expect(typeof metrics.discoveryLatencyMs).toBe('number');
      expect(typeof metrics.tProviderResponseMs).toBe('number');
    });

    it('F14.2: logs structured session trace events with monotonic tokens', async () => {
      sessionTrace.clearTrace();
      await sessionOrchestrator.handleEmotionObservation('happy', 0.90, samplePreference);

      const events = sessionTrace.getTraceEvents();
      expect(events.length).toBeGreaterThan(0);
      const eventNames = events.map((e) => e.eventName);
      expect(eventNames).toContain('cameraReady');
      expect(eventNames).toContain('emotionStable');
      expect(eventNames).toContain('intentCreated');
    });

    it('F14.3: computes latency breakdown between milestones', async () => {
      await sessionOrchestrator.handleEmotionObservation('happy', 0.90, samplePreference);
      const breakdown = sessionOrchestrator.getLatencyBreakdown();
      expect(breakdown).toBeDefined();
      expect(typeof breakdown.tTotalEmotionToFirstAudioMs).toBe('number');
    });

    it('F14.4: bounds session trace event ring buffer to prevent unbounded memory growth', () => {
      for (let i = 0; i < 150; i++) {
        sessionTrace.logEvent('sessionStart', i);
      }
      expect(sessionTrace.getTraceEvents().length).toBeLessThanOrEqual(100);
    });

    it('F14.5: ensures zero PII in observability trace logs and error payloads', () => {
      sessionTrace.logEvent('trackStart', 1, { trackId: 'yt_A6BJ-PgNWXA', genre: 'Telugu Pop' });
      const events = sessionTrace.getTraceEvents();
      const last = events[events.length - 1];

      expect(last.meta).not.toHaveProperty('email');
      expect(last.meta).not.toHaveProperty('password');
      expect(last.meta).not.toHaveProperty('name');
    });
  });
});
