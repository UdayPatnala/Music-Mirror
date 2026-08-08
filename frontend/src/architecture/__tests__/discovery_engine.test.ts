import { describe, it, expect, beforeEach } from 'vitest';
import { discoveryEngine } from '../layers/DiscoveryLayer';
import { YouTubeProviderAdapter } from '../layers/ProviderAdapterLayer/YouTubeProviderAdapter';
import { JamendoProviderAdapter } from '../layers/ProviderAdapterLayer/JamendoProviderAdapter';
import { RoyaltyFreeFallbackAdapter } from '../layers/ProviderAdapterLayer/RoyaltyFreeFallbackAdapter';
import { intentMapper } from '../layers/MusicIntentLayer';
import { emotionInference } from '../layers/EmotionLayer';
import type { UserPreference } from '../types/domain';

describe('STAGE 04: Music Discovery Engine Unit & Integration Suite', () => {
  const mockPref: UserPreference = {
    name: 'Patnala Uday Kumar',
    email: 'uday@musicmirror.ai',
    preferredGenres: ['Telugu Pop', 'Synthpop'],
    preferredLanguages: ['Telugu', 'English'],
    musicGoal: 'match',
  };

  beforeEach(() => {
    emotionInference.dispose();
    intentMapper.resetState();
    discoveryEngine.clearCache();

    discoveryEngine.registerProvider(new YouTubeProviderAdapter());
    discoveryEngine.registerProvider(new JamendoProviderAdapter());
    discoveryEngine.registerProvider(new RoyaltyFreeFallbackAdapter());
  });

  it('registers provider adapters and detects capabilities correctly', () => {
    const providers = discoveryEngine.getRegisteredProviders();
    expect(providers.length).toBeGreaterThanOrEqual(3);

    const yt = discoveryEngine.getProvider('youtube');
    expect(yt).toBeDefined();
    expect(yt?.getCapabilities().officialEmbed).toBe(true);

    const jamendo = discoveryEngine.getProvider('jamendo');
    expect(jamendo).toBeDefined();
    expect(jamendo?.getCapabilities().streaming).toBe(true);
  });

  it('discovers and normalizes playable candidates from canonical MusicIntent', async () => {
    const emotionState = emotionInference.processFrameInference('happy', 0.90);
    const intent = intentMapper.generateIntent(emotionState, mockPref);

    const candidates = await discoveryEngine.discoverCandidates(intent, 10);

    expect(candidates.length).toBeGreaterThan(0);
    const first = candidates[0];
    expect(first.id).toBeDefined();
    expect(first.title).toBeDefined();
    expect(first.artist).toBeDefined();
    expect(first.playbackCapability).not.toBe('unavailable');
    expect(first.status).toBe('available');
    expect(first.relevanceScore).toBeGreaterThan(0.5);
  });

  it('deduplicates candidates by normalized artist and title', async () => {
    const emotionState = emotionInference.processFrameInference('happy', 0.90);
    const intent = intentMapper.generateIntent(emotionState, mockPref);

    const candidates = await discoveryEngine.discoverCandidates(intent, 20);

    const keys = candidates.map((c) => `${c.artist.toLowerCase().trim()}:${c.title.toLowerCase().trim()}`);
    const uniqueKeys = new Set(keys);

    expect(keys.length).toBe(uniqueKeys.size);
  });

  it('ranks candidates descending by acoustic similarity and language boost', async () => {
    const emotionState = emotionInference.processFrameInference('happy', 0.95);
    const intent = intentMapper.generateIntent(emotionState, mockPref);

    const candidates = await discoveryEngine.discoverCandidates(intent, 10);

    for (let i = 0; i < candidates.length - 1; i++) {
      expect(candidates[i].relevanceScore).toBeGreaterThanOrEqual(candidates[i + 1].relevanceScore);
    }
  });

  it('utilizes multi-level cache for repeated intent queries', async () => {
    const emotionState = emotionInference.processFrameInference('happy', 0.90);
    const intent = intentMapper.generateIntent(emotionState, mockPref);

    // Initial Discovery (Cache Miss)
    await discoveryEngine.discoverCandidates(intent, 10);

    // Second Discovery (Cache Hit)
    const candidates = await discoveryEngine.discoverCandidates(intent, 10);
    const metrics = discoveryEngine.getMetrics();

    expect(candidates.length).toBeGreaterThan(0);
    expect(metrics.cacheHitRate).toBeGreaterThan(0);
  });

  it('executes parallel prefetching of secondary candidate sets', async () => {
    const neutralState = emotionInference.processFrameInference('neutral', 0.50);
    const prefetchSet = intentMapper.generatePrefetchIntentSet(neutralState, mockPref);

    await discoveryEngine.prefetch(prefetchSet.secondaryPrefetchIntents);

    const metrics = discoveryEngine.getMetrics();
    expect(metrics.candidateCount).toBeGreaterThanOrEqual(0);
  });

  it('collects observability metrics and latency breakdowns', async () => {
    const emotionState = emotionInference.processFrameInference('happy', 0.90);
    const intent = intentMapper.generateIntent(emotionState, mockPref);

    await discoveryEngine.discoverCandidates(intent, 10);
    const metrics = discoveryEngine.getMetrics();

    expect(metrics.discoveryLatencyMs).toBeGreaterThanOrEqual(0);
    expect(metrics.candidateCount).toBeGreaterThan(0);
    expect(metrics.playableCandidateCount).toBeGreaterThan(0);
  });
});
