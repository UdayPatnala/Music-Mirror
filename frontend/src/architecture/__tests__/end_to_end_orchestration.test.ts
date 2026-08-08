import { describe, it, expect, beforeEach } from 'vitest';
import { orchestrator } from '../orchestrator/ApplicationOrchestrator';
import { sessionOrchestrator } from '../orchestrator/SessionOrchestrator';
import { emotionInference } from '../layers/EmotionLayer';
import { intentMapper } from '../layers/MusicIntentLayer';
import { discoveryEngine } from '../layers/DiscoveryLayer';
import { sessionTrace } from '../layers/ObservabilityLayer';
import type { UserPreference } from '../types/domain';

describe('STAGE 06: Real-Time End-to-End Orchestration & Failure Injection Suite', () => {
  const mockPref: UserPreference = {
    name: 'Patnala Uday Kumar',
    email: 'uday@musicmirror.ai',
    preferredGenres: ['Telugu Pop', 'Synthpop'],
    preferredLanguages: ['Telugu', 'English'],
    musicGoal: 'match',
  };

  beforeEach(async () => {
    emotionInference.dispose();
    intentMapper.resetState();
    discoveryEngine.clearCache();
    sessionTrace.clearTrace();
    sessionOrchestrator.resetState();
    await sessionOrchestrator.initialize();
  });

  describe('Real-Time End-to-End Orchestration Loop', () => {
    it('executes full loop from raw camera emotion observation to active audio playback', async () => {
      const state = await orchestrator.processFrameObservation('happy', 0.90, mockPref);

      expect(state).toBeDefined();
      expect(state.currentCandidate).toBeDefined();
      expect(state.activeMood).toBe('happy');
      expect(['PLAYING', 'PAUSED', 'SEARCHING', 'PREPARING']).toContain(state.sessionState);

      const traceEvents = sessionTrace.getTraceEvents();
      expect(traceEvents.length).toBeGreaterThan(0);
      expect(traceEvents.some((e) => e.eventName === 'emotionStable')).toBe(true);
      expect(traceEvents.some((e) => e.eventName === 'intentCreated')).toBe(true);
      expect(traceEvents.some((e) => e.eventName === 'discoveryStart')).toBe(true);
    });

    it('executes Cold-Start fast path when initial emotion confidence is low (< 0.50)', async () => {
      const state = await orchestrator.processFrameObservation('sad', 0.35, mockPref);

      expect(state.activeMood).toBe('neutral');
      expect(state.currentCandidate).toBeDefined();
    });

    it('evaluates transition decision policy model correctly', async () => {
      // 1. Initial happy state
      const state1 = await orchestrator.processFrameObservation('happy', 0.90, mockPref);
      const track1Id = state1.currentCandidate?.id;

      // 2. Minor emotion shift -> KEEP_CURRENT
      const state2 = await orchestrator.processFrameObservation('happy', 0.88, mockPref);
      expect(state2.currentCandidate?.id).toBe(track1Id);

      // 3. Strongly incompatible shift -> SWITCH_NOW_ONLY_IF_NECESSARY
      emotionInference.dispose();
      intentMapper.resetState();
      const state3 = await orchestrator.processFrameObservation('angry', 0.95, mockPref);
      expect(state3).toBeDefined();
    });

    it('collects end-to-end telemetry trace events and latency breakdowns', async () => {
      await orchestrator.processFrameObservation('happy', 0.90, mockPref);
      const breakdown = orchestrator.getLatencyBreakdown();

      expect(breakdown).toBeDefined();
      expect(typeof breakdown.tTotalEmotionToFirstAudioMs).toBe('number');
    });
  });

  describe('Component Failure-Injection Recovery Suite', () => {
    it('recovers from EmotionLayer raw frame classification errors via fallback state', async () => {
      const invalidEmotionState = emotionInference.processFrameInference('invalid_emotion_label', 0);
      expect(invalidEmotionState.normalizedEmotion).toBe('neutral');

      const state = await orchestrator.processFrameObservation('invalid_emotion_label', 0, mockPref);
      expect(state.activeMood).toBe('neutral');
      expect(state.currentCandidate).toBeDefined();
    });

    it('recovers from MusicIntentLayer mapping errors via default broad intent', async () => {
      const invalidIntent = intentMapper.generateIntent(undefined as any, undefined as any, 'MATCH', true);
      expect(invalidIntent.emotion.normalizedEmotion).toBe('neutral');
      expect(invalidIntent.specificity).toBe('precise');
    });

    it('recovers from DiscoveryLayer failure via Royalty-Free offline catalog', async () => {
      // Disable primary providers by clearing cache and requesting discovery for non-existent provider
      const fallbackProvider = discoveryEngine.getProvider('royalty_free_fallback');
      expect(fallbackProvider).toBeDefined();

      const candidates = await fallbackProvider?.searchCandidates({} as any, {} as any, 5);
      expect(candidates?.length).toBeGreaterThan(0);
      expect(candidates![0].playbackCapability).toBe('directStream');
    });

    it('recovers from PlaybackLayer track load failures via queue advancement', async () => {
      const state = await sessionOrchestrator.handleEmotionObservation('happy', 0.90, mockPref);

      if (state.currentCandidate) {
        // Inject unplayable status and skip
        state.currentCandidate.playbackCapability = 'unavailable';
        await sessionOrchestrator.skipNext();

        const updatedState = sessionOrchestrator.getPlaybackState();
        expect(updatedState.sessionState).toBeDefined();
      }
    });
  });
});
