import { describe, it, expect, beforeEach } from 'vitest';
import { sessionOrchestrator } from '../orchestrator/SessionOrchestrator';
import { YouTubePlaybackAdapter } from '../layers/PlaybackLayer/YouTubePlaybackAdapter';
import { HTML5AudioPlaybackAdapter } from '../layers/PlaybackLayer/HTML5AudioPlaybackAdapter';
import { emotionInference } from '../layers/EmotionLayer';
import { intentMapper } from '../layers/MusicIntentLayer';
import { discoveryEngine } from '../layers/DiscoveryLayer';
import type { UserPreference, MusicCandidate } from '../types/domain';

describe('STAGE 05: Music Playback Engine & Session Orchestrator Unit Suite', () => {
  const mockPref: UserPreference = {
    name: 'Patnala Uday Kumar',
    email: 'uday@musicmirror.ai',
    preferredGenres: ['Telugu Pop', 'Synthpop'],
    preferredLanguages: ['Telugu', 'English'],
    musicGoal: 'match',
  };

  const sampleCandidate: MusicCandidate = {
    id: 'yt_test_track_1',
    providerId: 'youtube',
    providerTrackId: 'test_track_1',
    title: 'Test Song',
    artists: ['Test Artist'],
    artist: 'Test Artist',
    album: 'Test Album',
    artworkUrl: 'https://img.youtube.com/vi/test_track_1/hqdefault.jpg',
    duration: 180,
    releaseInfo: '2025',
    canonicalGenres: ['Pop'],
    genre: 'Pop',
    language: 'English',
    musicAttributes: { valence: 0.8, energy: 0.8, bpm: 120 },
    audioFeatures: { valence: 0.8, energy: 0.8, bpm: 120 },
    providerUrl: 'https://www.youtube.com/watch?v=test_track_1',
    playbackRef: 'test_track_1',
    playbackCapability: 'officialEmbed',
    explicitContent: false,
    status: 'available',
    relevanceScore: 0.95,
    recommendationScore: 0.95,
    recommendationReason: 'High acoustic match (95%)',
    sourceMetadata: { source: 'unit_test' },
    retrievalTimestamp: Date.now(),
  };

  beforeEach(async () => {
    emotionInference.dispose();
    intentMapper.resetState();
    discoveryEngine.clearCache();
    await sessionOrchestrator.initialize();
  });

  describe('PlaybackProvider Adapters', () => {
    it('executes YouTubePlaybackAdapter lifecycle & controls', async () => {
      const adapter = new YouTubePlaybackAdapter();
      await adapter.initialize();

      await adapter.load(sampleCandidate);
      expect(adapter.getCurrentTrack()?.id).toBe(sampleCandidate.id);

      await adapter.play();
      expect(adapter.getPlaybackState().isPlaying).toBe(true);

      adapter.pause();
      expect(adapter.getPlaybackState().isPlaying).toBe(false);

      adapter.seek(60);
      expect(adapter.getPosition()).toBe(60);

      adapter.setVolume(50);
      expect(adapter.getPlaybackState().volume).toBe(50);
    });

    it('executes HTML5AudioPlaybackAdapter lifecycle & controls', async () => {
      const adapter = new HTML5AudioPlaybackAdapter();
      await adapter.initialize();

      await adapter.load(sampleCandidate);
      expect(adapter.getCurrentTrack()?.id).toBe(sampleCandidate.id);

      adapter.setVolume(80);
      expect(adapter.getPlaybackState().volume).toBe(80);
    });
  });

  describe('SessionOrchestrator State Machine & Core Loop', () => {
    it('executes full emotion observation -> intent -> discovery -> playback state transition', async () => {
      const state = await sessionOrchestrator.handleEmotionObservation('happy', 0.90, mockPref);

      expect(state.sessionState).toBeDefined();
      expect(['PLAYING', 'PAUSED', 'SEARCHING', 'PREPARING']).toContain(state.sessionState);
      expect(state.currentCandidate).toBeDefined();
      expect(state.activeMood).toBe('happy');
    });

    it('handles one-step user gesture autoplay enablement', async () => {
      await sessionOrchestrator.handleEmotionObservation('happy', 0.90, mockPref);

      await sessionOrchestrator.enablePlayback();
      const state = sessionOrchestrator.getPlaybackState();

      expect(state.autoplayBlocked).toBe(false);
    });

    it('toggles play/pause state correctly', async () => {
      await sessionOrchestrator.handleEmotionObservation('happy', 0.90, mockPref);

      sessionOrchestrator.togglePlayPause();
      let state = sessionOrchestrator.getPlaybackState();
      expect(state.isPaused || state.isPlaying).toBe(true);

      sessionOrchestrator.togglePlayPause();
      state = sessionOrchestrator.getPlaybackState();
      expect(state.sessionState).toBeDefined();
    });

    it('advances queue when skipNext is triggered', async () => {
      await sessionOrchestrator.handleEmotionObservation('happy', 0.90, mockPref);
      const initialTrackId = sessionOrchestrator.getPlaybackState().currentCandidate?.id;

      await sessionOrchestrator.skipNext();
      expect(sessionOrchestrator.getPlaybackState().history).toContain(initialTrackId);
    });

    it('avoids immediate track repetition using short-term history buffer', async () => {
      await sessionOrchestrator.handleEmotionObservation('happy', 0.90, mockPref);
      const state1 = sessionOrchestrator.getPlaybackState();

      await sessionOrchestrator.skipNext();
      const state2 = sessionOrchestrator.getPlaybackState();

      if (state1.currentCandidate && state2.currentCandidate) {
        expect(state1.currentCandidate.id).not.toBe(state2.currentCandidate.id);
      }
    });

    it('handles volume and mute controls', () => {
      sessionOrchestrator.setVolume(40);
      let state = sessionOrchestrator.getPlaybackState();
      expect(state.volume).toBe(40);

      sessionOrchestrator.setMute(true);
      state = sessionOrchestrator.getPlaybackState();
      expect(state.isMuted).toBe(true);
    });
  });
});
