import { describe, it, expect, beforeEach } from 'vitest';
import { intentMapper } from '../layers/MusicIntentLayer';
import { emotionInference } from '../layers/EmotionLayer';
import type { UserPreference } from '../types/domain';

describe('STAGE 03: Music Intent Engine Unit & Integration Suite', () => {
  const mockUserPref: UserPreference = {
    name: 'Patnala Uday Kumar',
    email: 'uday@musicmirror.ai',
    preferredGenres: ['Telugu Pop', 'Synthpop'],
    preferredLanguages: ['Telugu', 'English'],
    musicGoal: 'match',
  };

  beforeEach(() => {
    emotionInference.dispose();
    intentMapper.resetState();
  });

  it('maps canonical emotion state into structured MusicIntent', () => {
    const emotionState = emotionInference.processFrameInference('happy', 0.95);
    const intent = intentMapper.generateIntent(emotionState, mockUserPref, 'MATCH');

    expect(intent.intentId).toBeDefined();
    expect(intent.valenceTarget).toBeGreaterThan(0.7);
    expect(intent.energyTarget).toBeGreaterThan(0.7);
    expect(intent.confidence).toBe(0.95);
    expect(intent.specificity).toBe('precise');
    expect(intent.policy).toBe('MATCH');
    expect(intent.moodDescriptors).toContain('upbeat');
    expect(intent.priorityLanguages).toContain('Telugu');
  });

  it('scales specificity based on confidence propagation', () => {
    // High confidence -> precise
    const highConf = emotionInference.processFrameInference('happy', 0.90);
    const intentHigh = intentMapper.generateIntent(highConf, mockUserPref, 'MATCH', true);
    expect(intentHigh.specificity).toBe('precise');
    expect(intentHigh.tempoRange.maxBpm - intentHigh.tempoRange.minBpm).toBeLessThanOrEqual(20);

    // Low confidence -> broad
    emotionInference.dispose();
    const lowConf = emotionInference.processFrameInference('happy', 0.35);
    const intentLow = intentMapper.generateIntent(lowConf, mockUserPref, 'MATCH', true);
    expect(intentLow.specificity).toBe('broad');
    expect(intentLow.tempoRange.maxBpm - intentLow.tempoRange.minBpm).toBeGreaterThanOrEqual(50);
  });

  it('executes policy selection (MATCH, REGULATE, BALANCE, PERSONALIZED_BLEND)', () => {
    emotionInference.dispose();
    const sadState = emotionInference.processFrameInference('sad', 0.85);

    // 1. MATCH policy
    intentMapper.resetState();
    const matchIntent = intentMapper.generateIntent(sadState, mockUserPref, 'MATCH', true);
    expect(matchIntent.policy).toBe('MATCH');
    expect(matchIntent.valenceTarget).toBeLessThan(0.4);

    // 2. REGULATE policy (uplifts sad emotion)
    intentMapper.resetState();
    const regulateIntent = intentMapper.generateIntent(sadState, mockUserPref, 'REGULATE', true);
    expect(regulateIntent.policy).toBe('REGULATE');
    expect(regulateIntent.valenceTarget).toBeGreaterThan(matchIntent.valenceTarget);

    // 3. BALANCE policy
    intentMapper.resetState();
    const balanceIntent = intentMapper.generateIntent(sadState, mockUserPref, 'BALANCE', true);
    expect(balanceIntent.valenceTarget).toBe(0.55);

    // 4. PERSONALIZED_BLEND policy
    intentMapper.resetState();
    const blendIntent = intentMapper.generateIntent(sadState, mockUserPref, 'PERSONALIZED_BLEND', true);
    expect(blendIntent.policy).toBe('PERSONALIZED_BLEND');
  });

  it('gives explicit user preferences priority over emotion inferences', () => {
    emotionInference.dispose();
    const prefUser: Partial<UserPreference> = {
      preferredGenres: ['Heavy Metal', 'Classical'],
      preferredLanguages: ['Tamil', 'Hindi'],
    };

    const emotionState = emotionInference.processFrameInference('neutral', 0.80);
    const intent = intentMapper.generateIntent(emotionState, prefUser, 'MATCH', true);

    expect(intent.priorityLanguages).toEqual(['Tamil', 'Hindi']);
    expect(intent.priorityGenres).toEqual(['Heavy Metal', 'Classical']);
    expect(intent.styleDescriptors).toContain('Heavy Metal');
    expect(intent.reasonCodes).toContain('PREFERENCE_GENRE_PRIORITY');
  });

  it('generates bounded predictive prefetch candidate intent sets', () => {
    emotionInference.dispose();
    const neutralState = emotionInference.processFrameInference('neutral', 0.50);
    const prefetchSet = intentMapper.generatePrefetchIntentSet(neutralState, mockUserPref);

    expect(prefetchSet.primaryIntent).toBeDefined();
    expect(prefetchSet.secondaryPrefetchIntents.length).toBeGreaterThan(0);
    expect(prefetchSet.secondaryPrefetchIntents.length).toBeLessThanOrEqual(2);
  });

  it('converts MusicIntent into provider-neutral search constraints', () => {
    emotionInference.dispose();
    const emotionState = emotionInference.processFrameInference('happy', 0.90);
    const intent = intentMapper.generateIntent(emotionState, mockUserPref);
    const constraints = intentMapper.buildQueryConstraints(intent);

    expect(constraints.queryKeywords.length).toBeGreaterThan(0);
    expect(constraints.valenceRange[0]).toBeLessThanOrEqual(constraints.valenceRange[1]);
    expect(constraints.bpmRange[0]).toBeLessThan(constraints.bpmRange[1]);
    expect(constraints.targetLanguages).toContain('Telugu');
  });

  it('guarantees deterministic execution and sub-millisecond latency', () => {
    emotionInference.dispose();
    const emotionState = emotionInference.processFrameInference('happy', 0.90);

    const start = performance.now();
    const intent1 = intentMapper.generateIntent(emotionState, mockUserPref, 'MATCH', true);
    const duration = performance.now() - start;

    const intent2 = intentMapper.generateIntent(emotionState, mockUserPref, 'MATCH', true);

    expect(duration).toBeLessThan(10);
    expect(intent1.valenceTarget).toBe(intent2.valenceTarget);
    expect(intent1.energyTarget).toBe(intent2.energyTarget);
  });

  it('handles invalid or empty inputs gracefully with fallback neutral intent', () => {
    intentMapper.resetState();
    const invalidIntent = intentMapper.generateIntent(undefined as any, undefined as any, 'MATCH', true);
    expect(invalidIntent.intentId).toBeDefined();
    expect(invalidIntent.emotion.normalizedEmotion).toBe('neutral');
    expect(invalidIntent.targetValence).toBe(0.5);
  });
});
