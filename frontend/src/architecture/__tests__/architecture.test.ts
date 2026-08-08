import { describe, it, expect, beforeEach } from 'vitest';
import { EmotionInferenceService } from '../layers/EmotionLayer';
import { MusicIntentEngine } from '../layers/MusicIntentLayer';
import { YouTubeProviderAdapter } from '../layers/ProviderAdapterLayer/YouTubeProviderAdapter';
import { DiscoveryEngine } from '../layers/DiscoveryLayer';
import { ApplicationOrchestrator } from '../orchestrator/ApplicationOrchestrator';
import type { UserPreference } from '../types/domain';

describe('MusicMirror Architecture Layer Suite', () => {
  let emotionService: EmotionInferenceService;
  let intentMapper: MusicIntentEngine;
  let discoveryEngine: DiscoveryEngine;
  let orchestrator: ApplicationOrchestrator;

  const mockPreference: UserPreference = {
    name: 'Test User',
    email: 'test@musicmirror.ai',
    preferredGenres: ['Telugu Pop', 'Synthpop'],
    preferredLanguages: ['Telugu', 'English'],
    musicGoal: 'match',
  };

  beforeEach(() => {
    emotionService = EmotionInferenceService.getInstance();
    intentMapper = MusicIntentEngine.getInstance();
    discoveryEngine = DiscoveryEngine.getInstance();
    orchestrator = ApplicationOrchestrator.getInstance();
  });

  describe('EmotionLayer', () => {
    it('normalizes raw emotion strings correctly', () => {
      expect(emotionService.normalizeEmotion('joyful')).toBe('happy');
      expect(emotionService.normalizeEmotion('enraged')).toBe('angry');
      expect(emotionService.normalizeEmotion('fearful')).toBe('sad');
      expect(emotionService.normalizeEmotion('unknown')).toBe('neutral');
    });

    it('calculates temporal stability score over a sliding window', () => {
      emotionService.processFrameInference('happy', 0.9);
      emotionService.processFrameInference('happy', 0.95);
      emotionService.processFrameInference('happy', 0.88);
      const state = emotionService.processFrameInference('happy', 0.92);

      expect(state.normalizedEmotion).toBe('happy');
      expect(state.temporalStability).toBeGreaterThan(0.5);
      expect(state.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('MusicIntentLayer', () => {
    it('maps happy emotion state into correct music intent targets', () => {
      const emotionState = emotionService.processFrameInference('happy', 0.95);
      const intent = intentMapper.mapIntent(emotionState, mockPreference);

      expect(intent.targetValence).toBeGreaterThan(0.7);
      expect(intent.targetEnergy).toBeGreaterThan(0.7);
      expect(intent.priorityLanguages).toContain('Telugu');
    });

    it('boosts valence and energy when musicGoal is "lift"', () => {
      const emotionState = emotionService.processFrameInference('sad', 0.90);
      const liftPreference: UserPreference = { ...mockPreference, musicGoal: 'lift' };
      const intent = intentMapper.mapIntent(emotionState, liftPreference);

      expect(intent.targetValence).toBeGreaterThan(0.3);
      expect(intent.targetEnergy).toBeGreaterThan(0.3);
      expect(intent.goalModifier).toBe('lift');
    });
  });

  describe('ProviderAdapterLayer', () => {
    it('returns legitimate YouTube embed URL for candidate', async () => {
      const adapter = new YouTubeProviderAdapter();
      expect(adapter.getProviderId()).toBe('youtube');

      const intent = intentMapper.mapIntent(emotionService.getFallbackState(), mockPreference);
      const candidates = await adapter.searchCandidates(intent);

      expect(candidates.length).toBeGreaterThan(0);
      const embedUrl = adapter.getPlaybackEmbedUrl(candidates[0]);
      expect(embedUrl).toContain('youtube-nocookie.com/embed/');
    });
  });

  describe('DiscoveryLayer', () => {
    it('ranks candidates descending by acoustic similarity score', async () => {
      discoveryEngine.registerProvider(new YouTubeProviderAdapter());
      const intent = intentMapper.mapIntent(emotionService.getFallbackState(), mockPreference);
      const candidates = await discoveryEngine.discoverCandidates(intent, 5);

      expect(candidates.length).toBeGreaterThan(0);
      for (let i = 0; i < candidates.length - 1; i++) {
        expect(candidates[i].recommendationScore).toBeGreaterThanOrEqual(candidates[i + 1].recommendationScore);
      }
    });
  });

  describe('ApplicationOrchestrator', () => {
    it('executes full pipeline from raw emotion to ranked queue', async () => {
      const result = await orchestrator.executePipeline('happy', 0.95, mockPreference);

      expect(result.emotion.normalizedEmotion).toBe('happy');
      expect(result.intent.targetValence).toBeGreaterThan(0.7);
      expect(result.queue.length).toBeGreaterThan(0);
      expect(result.queue[0].playbackRef).toBeDefined();
    });
  });
});
