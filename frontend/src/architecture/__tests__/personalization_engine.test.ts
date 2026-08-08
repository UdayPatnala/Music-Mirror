import { describe, it, expect, beforeEach } from 'vitest';
import { personalizationEngine } from '../layers/PersonalizationLayer/PersonalizationEngine';
import { personalizationStore } from '../layers/PersonalizationLayer/PersonalizationStore';
import { personalizationScorer } from '../layers/PersonalizationLayer/PersonalizationScorer';
import type { MusicCandidate, MusicIntent } from '../types/domain';

describe('STAGE 07: Privacy-First Personalization & Feedback Suite', () => {
  const dummyCandidate: MusicCandidate = {
    id: 'yt_test_track_1',
    providerId: 'youtube',
    providerTrackId: 'test_yt_track_1',
    title: 'Telugu Melody Wave',
    artist: 'Sid Sriram',
    artists: ['Sid Sriram'],
    album: 'Telugu Top Hits',
    artworkUrl: null,
    duration: 210,
    releaseInfo: null,
    canonicalGenres: ['Telugu Pop'],
    genre: 'Telugu Pop',
    language: 'Telugu',
    playbackCapability: 'officialEmbed',
    playbackRef: 'test_yt_ref_1',
    musicAttributes: {
      valence: 0.80,
      energy: 0.75,
      bpm: 120,
    },
    audioFeatures: {
      valence: 0.80,
      energy: 0.75,
      bpm: 120,
    },
    providerUrl: null,
    explicitContent: false,
    isExplicit: false,
    status: 'available',
    relevanceScore: 0.85,
    recommendationScore: 0.85,
    recommendationReason: 'Test match',
    sourceMetadata: {},
    retrievalTimestamp: Date.now(),
  };

  const dummyExplicitCandidate: MusicCandidate = {
    ...dummyCandidate,
    id: 'yt_test_explicit_2',
    title: 'Explicit Trap Beat',
    artist: 'Badshah',
    artists: ['Badshah'],
    genre: 'Hip Hop',
    explicitContent: true,
    isExplicit: true,
  };

  const dummyIntent: MusicIntent = {
    intentId: 'intent_test_1',
    emotion: {
      rawEmotion: 'happy',
      normalizedEmotion: 'happy',
      confidence: 0.90,
      valenceScore: 0.85,
      arousalScore: 0.80,
      energyScore: 0.75,
      temporalStability: 0.95,
      probabilities: { happy: 0.9, sad: 0.0, angry: 0.0, neutral: 0.1, surprise: 0.0, fearful: 0.0, disgusted: 0.0 },
      availabilityStatus: 'active',
      isStabilized: true,
      timestamp: Date.now(),
    },
    moodDescriptors: ['upbeat'],
    valenceTarget: 0.85,
    arousalTarget: 0.80,
    energyTarget: 0.75,
    tempoRange: { minBpm: 110, maxBpm: 130, targetBpm: 120 },
    targetValence: 0.85,
    targetEnergy: 0.75,
    targetTempoBpm: 120,
    styleDescriptors: ['pop'],
    vocalPreference: 'any',
    intensity: 'moderate',
    targetContext: 'active',
    confidence: 0.90,
    policy: 'MATCH',
    priorityGenres: ['Telugu Pop'],
    priorityLanguages: ['Telugu'],
    goalModifier: 'match',
    specificity: 'precise',
    reasonCodes: ['EMOTION_MATCH'],
    createdAt: Date.now(),
    expiresAt: Date.now() + 60000,
    version: '1.0.0',
  };

  beforeEach(() => {
    personalizationEngine.resetPreferences();
  });

  describe('New User Mode & Defaults', () => {
    it('initializes with unbiased default preference profile', () => {
      const pref = personalizationEngine.getPreferences();
      expect(pref.version).toBe('1.0.0');
      expect(pref.explicitContentAllowed).toBe(true);
      expect(pref.blockedArtists).toEqual([]);
      expect(pref.blockedGenres).toEqual([]);
      expect(pref.playCount).toBe(0);
      expect(pref.skipCount).toBe(0);
    });
  });

  describe('Hard Constraints & Candidate Filtering', () => {
    it('blocks candidate from explicitly blocked artist with -Infinity score', () => {
      personalizationEngine.blockArtist('Sid Sriram');
      const score = personalizationScorer.scoreCandidate(dummyCandidate, dummyIntent);

      expect(score.isHardBlocked).toBe(true);
      expect(score.finalScore).toBe(-Infinity);
      expect(score.hardBlockReason).toContain('blocked');
    });

    it('blocks candidate from explicitly blocked genre with -Infinity score', () => {
      personalizationEngine.blockGenre('Telugu Pop');
      const score = personalizationScorer.scoreCandidate(dummyCandidate, dummyIntent);

      expect(score.isHardBlocked).toBe(true);
      expect(score.finalScore).toBe(-Infinity);
    });

    it('blocks explicit content candidate when explicitContentAllowed is set to false', () => {
      personalizationEngine.updatePreferences({ explicitContentAllowed: false });
      const score = personalizationScorer.scoreCandidate(dummyExplicitCandidate, dummyIntent);

      expect(score.isHardBlocked).toBe(true);
      expect(score.finalScore).toBe(-Infinity);
      expect(score.hardBlockReason).toContain('Explicit content is disabled');
    });

    it('filters blocked candidates during scoreCandidates pool ranking', () => {
      personalizationEngine.blockArtist('Badshah');
      const candidates = [dummyCandidate, dummyExplicitCandidate];

      const scored = personalizationScorer.scoreCandidates(candidates, dummyIntent);
      expect(scored.length).toBe(1);
      expect(scored[0].id).toBe('yt_test_track_1');
    });
  });

  describe('Incremental Learning, Decay & Normalization', () => {
    it('increases genre and artist weight after LIKE feedback', () => {
      personalizationEngine.recordFeedback({
        type: 'LIKE',
        candidateId: dummyCandidate.id,
        artist: dummyCandidate.artist,
        genre: dummyCandidate.genre,
      });

      const pref = personalizationEngine.getPreferences();
      expect(pref.preferredGenres['Telugu Pop']).toBeGreaterThan(0.50);
      expect(pref.preferredArtists['Sid Sriram']).toBeGreaterThan(0.0);
    });

    it('decreases genre and artist weight after DISLIKE feedback', () => {
      personalizationEngine.recordFeedback({
        type: 'DISLIKE',
        candidateId: dummyCandidate.id,
        artist: dummyCandidate.artist,
        genre: dummyCandidate.genre,
      });

      const pref = personalizationEngine.getPreferences();
      expect(pref.preferredGenres['Telugu Pop']).toBeLessThan(0.50);
      expect(pref.preferredArtists['Sid Sriram']).toBeLessThan(0.0);
    });
  });

  describe('Storage Corruption Recovery & Reset', () => {
    it('recovers gracefully from corrupted storage or prototype pollution inputs', () => {
      const maliciousJson = JSON.stringify({
        __proto__: { polluted: true },
        userId: 'hacker',
        preferredGenres: { Pop: 'invalid_number' },
      });

      const success = personalizationStore.importPreferences(maliciousJson);
      expect(success).toBe(true);

      const pref = personalizationEngine.getPreferences();
      expect(pref).toBeDefined();
      expect((Object.prototype as any).polluted).toBeUndefined();
    });

    it('resets preferences to fresh default state', () => {
      personalizationEngine.blockArtist('Sid Sriram');
      personalizationEngine.resetPreferences();

      const pref = personalizationEngine.getPreferences();
      expect(pref.blockedArtists).toEqual([]);
      expect(pref.preferredArtists['Sid Sriram']).toBeUndefined();
    });
  });

  describe('Deterministic Feedback Simulation Test Fixture', () => {
    it('simulates 50 sequential interactions and verifies bounded weight convergence', () => {
      // Simulate 50 feedback interactions favoring 'Telugu Pop' and disliking 'Metal'
      for (let i = 0; i < 50; i++) {
        const isFav = i % 2 === 0;
        personalizationEngine.recordFeedback({
          type: isFav ? 'LIKE' : 'DISLIKE',
          candidateId: `cand_${i}`,
          artist: isFav ? 'Sid Sriram' : 'Metal Band',
          genre: isFav ? 'Telugu Pop' : 'Metal',
          completionRatio: isFav ? 0.95 : 0.10,
        });
      }

      const pref = personalizationEngine.getPreferences();

      // Telugu Pop weight must converge high (<= 1.0)
      expect(pref.preferredGenres['Telugu Pop']).toBeGreaterThan(0.60);
      expect(pref.preferredGenres['Telugu Pop']).toBeLessThanOrEqual(1.0);

      // Metal weight must decrease low (>= 0.0)
      expect(pref.preferredGenres['Metal']).toBeLessThan(0.40);
      expect(pref.preferredGenres['Metal']).toBeGreaterThanOrEqual(0.0);

      // Preferred artist Sid Sriram weight must stay bounded within [-1.0, 1.0]
      expect(pref.preferredArtists['Sid Sriram']).toBeGreaterThan(0.0);
      expect(pref.preferredArtists['Sid Sriram']).toBeLessThanOrEqual(1.0);

      // Disliked artist Metal Band weight must stay bounded
      expect(pref.preferredArtists['Metal Band']).toBeLessThan(0.0);
      expect(pref.preferredArtists['Metal Band']).toBeGreaterThanOrEqual(-1.0);
    });
  });
});
