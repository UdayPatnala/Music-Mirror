import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { emotionInference, CANONICAL_EMOTIONS } from '../layers/EmotionLayer';
import { cameraDriver } from '../layers/CameraDriver';

describe('STAGE 02: Emotion Engine & Camera Driver Unit Suite', () => {

  beforeEach(() => {
    emotionInference.dispose();
  });

  afterEach(() => {
    emotionInference.dispose();
  });

  it('initializes ML model loading and sets active availability status', async () => {
    await emotionInference.initialize('/models');
    const state = emotionInference.getCurrentState();
    expect(state.availabilityStatus).toBe('active');
    expect(state.probabilities).toBeDefined();
  });

  it('guards numerical safety: normalizes probabilities to sum to 1.0 and eliminates NaN/Infinity', () => {
    const rawScores = {
      happy: 0.8,
      sad: NaN,
      angry: Infinity,
      neutral: -0.5,
      surprise: 0.2,
    };

    const sanitized = emotionInference.sanitizeProbabilities(rawScores);
    expect(sanitized.happy).toBeGreaterThan(0);
    expect(sanitized.surprise).toBeGreaterThan(0);
    expect(sanitized.sad).toBe(0);

    let sum = 0;
    CANONICAL_EMOTIONS.forEach((emo) => {
      sum += sanitized[emo];
    });

    expect(Math.round(sum * 10) / 10).toBe(1.0);
  });

  it('applies Exponential Moving Average (EMA) and temporal sliding window smoothing', () => {
    emotionInference.processFrameInference('happy', 0.9, { happy: 0.9, neutral: 0.1 });
    const state1 = emotionInference.processFrameInference('happy', 0.95, { happy: 0.95, neutral: 0.05 });

    expect(state1.probabilities.happy).toBeGreaterThan(0.2);
    expect(state1.confidence).toBeGreaterThan(0.2);
  });

  it('applies hysteresis threshold: prevents rapid flickering on single frame micro-expressions', () => {
    // Establish initial happy state
    emotionInference.processFrameInference('happy', 0.9, { happy: 0.9 });
    emotionInference.processFrameInference('happy', 0.9, { happy: 0.9 });
    emotionInference.processFrameInference('happy', 0.9, { happy: 0.9 });

    // Single frame blink / surprise anomaly
    const anomalousState = emotionInference.processFrameInference('surprise', 0.4, { surprise: 0.4, happy: 0.6 });

    // Hysteresis prevents instant transition because confidence < 0.60
    expect(anomalousState.normalizedEmotion).toBe('happy');
  });

  it('generates safe EmotionUnavailable fallback state when camera or model fails', () => {
    const fallback = emotionInference.getFallbackState('unavailable');
    expect(fallback.normalizedEmotion).toBe('neutral');
    expect(fallback.availabilityStatus).toBe('unavailable');
    expect(fallback.confidence).toBe(1.0);
    expect(fallback.isStabilized).toBe(true);
  });

  it('tracks performance metrics cleanly without exposing raw frames', () => {
    emotionInference.processFrameInference('happy', 0.85);
    const metrics = emotionInference.getMetrics();
    expect(metrics.isModelLoaded).toBe(true);
    expect(metrics.currentStatus).toBe('active');
  });

  it('manages camera driver status transitions cleanly', () => {
    expect(cameraDriver.getStatus()).toBe('unavailable');
    cameraDriver.stopCamera();
    expect(cameraDriver.getStatus()).toBe('unavailable');
  });
});
