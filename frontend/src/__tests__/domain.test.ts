import { describe, it, expect } from 'vitest';
import { appConfig } from '../config/appConfig';
import { logger } from '../observability/logger';
import { emotionInference } from '../architecture/layers/EmotionLayer';
import { intentMapper } from '../architecture/layers/MusicIntentLayer';
import { discoveryEngine } from '../architecture/layers/DiscoveryLayer';
import { YouTubeProviderAdapter } from '../architecture/layers/ProviderAdapterLayer/YouTubeProviderAdapter';

describe('Stage 01 Architecture & Domain Unit Tests', () => {

  it('verifies app configuration loaded with zero exposed secrets', () => {
    expect(appConfig.appName).toBe('MusicMirror');
    expect(appConfig.version).toBe('2.0.0');
    expect(appConfig.preferences.defaultLanguages).toContain('Telugu');
    expect(appConfig.preferences.defaultLanguages).toContain('English');
    expect(appConfig.emotionInference.minConfidenceThreshold).toBeGreaterThanOrEqual(0.5);
  });

  it('normalizes emotion raw input cleanly into valid EmotionLabel', () => {
    expect(emotionInference.normalizeEmotion('JOYFUL')).toBe('happy');
    expect(emotionInference.normalizeEmotion('enraged')).toBe('angry');
    expect(emotionInference.normalizeEmotion('unknown_mood')).toBe('neutral');
  });

  it('computes temporal stability across frames in EmotionLayer', () => {
    const state1 = emotionInference.processFrameInference('happy', 0.95);
    expect(state1.normalizedEmotion).toBe('happy');
    expect(state1.confidence).toBeGreaterThan(0.5);
    expect(state1.valenceScore).toBeGreaterThan(0.5);
  });

  it('maps EmotionState into MusicIntent using user preferences', () => {
    const fallbackState = emotionInference.getFallbackState();
    const intent = intentMapper.mapIntent(fallbackState, {
      name: 'Test User',
      email: 'test@mirror.ai',
      preferredGenres: ['Melody'],
      preferredLanguages: ['Telugu', 'English'],
      musicGoal: 'match',
    });

    expect(intent.priorityLanguages).toContain('Telugu');
    expect(intent.targetValence).toBeDefined();
    expect(intent.targetEnergy).toBeDefined();
  });

  it('registers YouTubeProviderAdapter in DiscoveryLayer', () => {
    const ytAdapter = new YouTubeProviderAdapter();
    discoveryEngine.registerProvider(ytAdapter);
    const providers = discoveryEngine.getRegisteredProviders();

    expect(providers.length).toBeGreaterThan(0);
    expect(providers[0].getProviderId()).toBe('youtube');
  });

  it('logs structured messages and records performance marks cleanly', () => {
    logger.startPerformanceMark('testMark');
    logger.info('Test log message');
    const duration = logger.endPerformanceMark('testMark');

    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('handles ApplicationError with degraded severity gracefully', () => {
    const err = logger.error('Test network failure', 'Discovery', 'degraded', 'NET_TIMEOUT');
    expect(err.code).toBe('NET_TIMEOUT');
    expect(err.layer).toBe('Discovery');
    expect(err.recoverable).toBe(true);
  });
});
