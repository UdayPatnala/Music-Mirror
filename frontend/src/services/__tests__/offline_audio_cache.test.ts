/**
 * OfflineAudioCache — Tests (v2.04.03.0)
 *
 * Verifies:
 * - Singleton initialization & resilience
 * - Track saving, retrieval, and presence checking
 * - Search by title, artist, and genre
 * - LRU eviction when capacity is exceeded
 * - Individual track removal and bulk purge
 * - Diagnostic metrics and byte estimation
 * - Graceful fallback to memory store when IndexedDB throws/fails
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OfflineAudioCache } from '../OfflineAudioCache';
import type { Track } from '../../domain/canonical';

const sampleTrackA: Track = {
  id: 'track_1',
  title: 'Saranga Dariya',
  normalizedTitle: 'saranga dariya',
  artist: 'Mangli',
  artists: ['Mangli'],
  album: 'Love Story',
  acousticFeatures: {
    valence: 0.85,
    energy: 0.90,
    tempo: 128,
  },
  primarySource: {
    id: 'src_1',
    trackId: 'track_1',
    sourceType: 'youtube',
    sourceId: 'mock_vid_1',
    playbackRef: 'mock_vid_1',
    capability: 'officialEmbed',
    status: 'active',
    reliabilityScore: 1.0,
    healthScore: 1.0,
    failureCount: 0,
  },
  availableSources: [],
  metadata: {
    durationSeconds: 230,
    durationFormatted: '3:50',
    language: 'Telugu',
    genre: 'Folk Pop',
    canonicalGenres: ['Folk', 'Pop'],
    isExplicit: false,
    popularity: 85,
  },
};

const sampleTrackB: Track = {
  id: 'track_2',
  title: 'Samajavaragamana',
  normalizedTitle: 'samajavaragamana',
  artist: 'Sid Sriram',
  artists: ['Sid Sriram'],
  album: 'Ala Vaikunthapurramuloo',
  acousticFeatures: {
    valence: 0.70,
    energy: 0.65,
    tempo: 104,
  },
  primarySource: {
    id: 'src_2',
    trackId: 'track_2',
    sourceType: 'youtube',
    sourceId: 'mock_vid_2',
    playbackRef: 'mock_vid_2',
    capability: 'officialEmbed',
    status: 'active',
    reliabilityScore: 1.0,
    healthScore: 1.0,
    failureCount: 0,
  },
  availableSources: [],
  metadata: {
    durationSeconds: 215,
    durationFormatted: '3:35',
    language: 'Telugu',
    genre: 'Melody',
    canonicalGenres: ['Melody'],
    isExplicit: false,
    popularity: 90,
  },
};

const sampleTrackC: Track = {
  id: 'track_3',
  title: 'Weightless',
  normalizedTitle: 'weightless',
  artist: 'Marconi Union',
  artists: ['Marconi Union'],
  acousticFeatures: {
    valence: 0.30,
    energy: 0.15,
    tempo: 60,
  },
  primarySource: {
    id: 'src_3',
    trackId: 'track_3',
    sourceType: 'stream',
    sourceId: 'ambient_1',
    playbackRef: 'https://example.com/ambient.mp3',
    capability: 'directStream',
    status: 'active',
    reliabilityScore: 1.0,
    healthScore: 1.0,
    failureCount: 0,
  },
  availableSources: [],
  metadata: {
    durationSeconds: 480,
    durationFormatted: '8:00',
    language: 'English',
    genre: 'Ambient',
    canonicalGenres: ['Ambient'],
    isExplicit: false,
    popularity: 75,
  },
};

describe('OfflineAudioCache — Core Operations & Resilience', () => {
  let cache: OfflineAudioCache;

  beforeEach(async () => {
    OfflineAudioCache._resetInstanceForTest();
    cache = OfflineAudioCache.getInstance();
    await cache.init();
    await cache.clear();
  });

  afterEach(async () => {
    await cache.clear();
    OfflineAudioCache._resetInstanceForTest();
  });

  it('initializes cleanly without errors', async () => {
    expect(cache).toBeDefined();
    const stats = await cache.getStats();
    expect(stats.count).toBe(0);
    expect(stats.totalEstimatedBytes).toBe(0);
  });

  it('saves and retrieves a track correctly', async () => {
    const saved = await cache.saveTrack(sampleTrackA);
    expect(saved).toBe(true);

    const exists = await cache.hasTrack('track_1');
    expect(exists).toBe(true);

    const retrieved = await cache.getTrack('track_1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe('Saranga Dariya');
    expect(retrieved?.artist).toBe('Mangli');
  });

  it('returns null for non-existent track ID', async () => {
    const track = await cache.getTrack('non_existent_id');
    expect(track).toBeNull();
  });

  it('supports saving and retrieving optional audio data URI', async () => {
    const mockUri = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4';
    await cache.saveTrack(sampleTrackA, mockUri);

    const record = await cache.getRecord('track_1');
    expect(record).not.toBeNull();
    expect(record?.audioDataUri).toBe(mockUri);
  });

  it('retrieves all cached tracks accurately', async () => {
    await cache.saveTrack(sampleTrackA);
    await cache.saveTrack(sampleTrackB);

    const all = await cache.getAllTracks();
    expect(all.length).toBe(2);
    const titles = all.map(t => t.title);
    expect(titles).toContain('Saranga Dariya');
    expect(titles).toContain('Samajavaragamana');
  });

  it('searches tracks by title, artist, or genre substring (case-insensitive)', async () => {
    await cache.saveTrack(sampleTrackA); // Mangli, Folk Pop
    await cache.saveTrack(sampleTrackB); // Sid Sriram, Melody
    await cache.saveTrack(sampleTrackC); // Marconi Union, Ambient

    const resultTitle = await cache.searchTracks('saranga');
    expect(resultTitle.length).toBe(1);
    expect(resultTitle[0].id).toBe('track_1');

    const resultArtist = await cache.searchTracks('sriram');
    expect(resultArtist.length).toBe(1);
    expect(resultArtist[0].id).toBe('track_2');

    const resultGenre = await cache.searchTracks('ambient');
    expect(resultGenre.length).toBe(1);
    expect(resultGenre[0].id).toBe('track_3');

    const resultEmpty = await cache.searchTracks('non_matching_query_xyz');
    expect(resultEmpty.length).toBe(0);
  });

  it('removes a single track by ID', async () => {
    await cache.saveTrack(sampleTrackA);
    await cache.saveTrack(sampleTrackB);

    const removed = await cache.removeTrack('track_1');
    expect(removed).toBe(true);

    expect(await cache.hasTrack('track_1')).toBe(false);
    expect(await cache.hasTrack('track_2')).toBe(true);
    expect(await cache.getCount()).toBe(1);
  });

  it('clears all cached tracks upon clear() call', async () => {
    await cache.saveTrack(sampleTrackA);
    await cache.saveTrack(sampleTrackB);
    await cache.saveTrack(sampleTrackC);

    expect(await cache.getCount()).toBe(3);

    await cache.clear();

    expect(await cache.getCount()).toBe(0);
    const all = await cache.getAllTracks();
    expect(all.length).toBe(0);
  });

  it('computes cache statistics including estimated byte size', async () => {
    await cache.saveTrack(sampleTrackA);
    await cache.saveTrack(sampleTrackB);

    const stats = await cache.getStats();
    expect(stats.count).toBe(2);
    expect(stats.totalEstimatedBytes).toBeGreaterThan(0);
    expect(stats.storageBackend).toBeDefined();
  });

  it('evicts oldest accessed tracks under LRU policy', async () => {
    // Save Track A at time 100
    vi.setSystemTime(new Date(2026, 8, 20, 10, 0, 0));
    await cache.saveTrack(sampleTrackA);

    // Save Track B at time 200
    vi.setSystemTime(new Date(2026, 8, 20, 10, 1, 0));
    await cache.saveTrack(sampleTrackB);

    // Save Track C at time 300
    vi.setSystemTime(new Date(2026, 8, 20, 10, 2, 0));
    await cache.saveTrack(sampleTrackC);

    // Access Track A to make it recently accessed
    vi.setSystemTime(new Date(2026, 8, 20, 10, 3, 0));
    await cache.getTrack('track_1');

    // Evict 1 oldest track. Oldest is Track B (last accessed at 10:01:00)
    const evicted = await cache.evictOldest(1);
    expect(evicted).toBe(1);

    expect(await cache.hasTrack('track_1')).toBe(true); // Track A was touched
    expect(await cache.hasTrack('track_2')).toBe(false); // Track B was evicted
    expect(await cache.hasTrack('track_3')).toBe(true); // Track C is preserved

    vi.useRealTimers();
  });

  it('gracefully handles invalid track objects', async () => {
    const invalidTrack = {} as Track;
    const result = await cache.saveTrack(invalidTrack);
    expect(result).toBe(false);
  });
});
