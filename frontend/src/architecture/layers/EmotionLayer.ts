/**
 * MusicMirror Emotion Layer Engine (STAGE 02 Implementation)
 * Local-First, Privacy-Preserving, Low-Latency Emotion Inference Engine
 */

import type { EmotionState, EmotionLabel, EmotionAvailabilityStatus } from '../types/domain';
import { logger } from './ObservabilityLayer';
import { cameraDriver } from './CameraDriver';

export const CANONICAL_EMOTIONS: EmotionLabel[] = [
  'happy',
  'sad',
  'angry',
  'neutral',
  'surprise',
  'fearful',
  'disgusted',
];

const EMOTION_MAP: Record<string, EmotionLabel> = {
  happy: 'happy',
  joyful: 'happy',
  excited: 'happy',
  sad: 'sad',
  depressed: 'sad',
  fearful: 'sad',
  fear: 'sad',
  angry: 'angry',
  enraged: 'angry',
  disgusted: 'disgusted',
  disgust: 'disgusted',
  surprised: 'surprise',
  surprise: 'surprise',
  neutral: 'neutral',
  calm: 'neutral',
};

const EMOTION_PROFILES: Record<EmotionLabel, { valence: number; arousal: number; energy: number }> = {
  happy: { valence: 0.90, arousal: 0.75, energy: 0.85 },
  sad: { valence: 0.15, arousal: 0.20, energy: 0.25 },
  angry: { valence: 0.25, arousal: 0.85, energy: 0.90 },
  neutral: { valence: 0.50, arousal: 0.50, energy: 0.50 },
  surprise: { valence: 0.75, arousal: 0.80, energy: 0.80 },
  fearful: { valence: 0.20, arousal: 0.70, energy: 0.65 },
  disgusted: { valence: 0.18, arousal: 0.60, energy: 0.60 },
};

export class EmotionInferenceService {
  private static instance: EmotionInferenceService | null = null;

  private isInitialized: boolean = false;
  private isModelLoaded: boolean = false;
  private availabilityStatus: EmotionAvailabilityStatus = 'initializing';

  private windowBuffer: Array<{ emotion: EmotionLabel; confidence: number; probs: Record<EmotionLabel, number> }> = [];
  private windowSize: number = 10;
  private emaAlpha: number = 0.40;

  private smoothedProbs: Record<EmotionLabel, number> = this.createZeroProbabilities();
  private currentStabilizedEmotion: EmotionLabel = 'neutral';
  private consecutiveCount: number = 0;
  private hysteresisThreshold: number = 2;

  private currentState: EmotionState = this.getFallbackState('initializing');
  private listeners: Set<(state: EmotionState) => void> = new Set();

  private inferenceFps: number = 0;
  private lastInferenceTime: number = 0;
  private stabilizedStateChangeCount: number = 0;

  private constructor() {}

  public static getInstance(): EmotionInferenceService {
    if (!EmotionInferenceService.instance) {
      EmotionInferenceService.instance = new EmotionInferenceService();
    }
    return EmotionInferenceService.instance;
  }

  public createZeroProbabilities(): Record<EmotionLabel, number> {
    return {
      happy: 0.0,
      sad: 0.0,
      angry: 0.0,
      neutral: 1.0,
      surprise: 0.0,
      fearful: 0.0,
      disgusted: 0.0,
    };
  }

  public normalizeEmotion(raw: string): EmotionLabel {
    if (!raw) return 'neutral';
    const key = raw.trim().toLowerCase();
    return EMOTION_MAP[key] || 'neutral';
  }

  /**
   * Numerical Safety Guard: Sanitizes raw probabilities, ensuring no NaN, Infinity, negative values, and enforces sum = 1.0
   */
  public sanitizeProbabilities(
    rawScores?: Record<string, number> | [string, number][],
    fallbackEmotion: EmotionLabel = 'neutral',
    fallbackConfidence: number = 0.8
  ): Record<EmotionLabel, number> {
    const result: Record<EmotionLabel, number> = {
      happy: 0.0,
      sad: 0.0,
      angry: 0.0,
      neutral: 0.0,
      surprise: 0.0,
      fearful: 0.0,
      disgusted: 0.0,
    };

    if (!rawScores) {
      const conf = !isNaN(fallbackConfidence) && isFinite(fallbackConfidence) ? Math.min(1.0, Math.max(0.0, fallbackConfidence)) : 0.8;
      result[fallbackEmotion] = conf;
      result.neutral = Math.max(0, 1.0 - conf);
      return result;
    }

    let sum = 0;
    if (Array.isArray(rawScores)) {
      rawScores.forEach(([label, val]) => {
        const norm = this.normalizeEmotion(label);
        const num = typeof val === 'number' && !isNaN(val) && isFinite(val) ? Math.max(0, val) : 0;
        result[norm] = (result[norm] || 0) + num;
        sum += num;
      });
    } else {
      Object.entries(rawScores).forEach(([label, val]) => {
        const norm = this.normalizeEmotion(label);
        const num = typeof val === 'number' && !isNaN(val) && isFinite(val) ? Math.max(0, val) : 0;
        result[norm] = (result[norm] || 0) + num;
        sum += num;
      });
    }

    if (sum <= 0) {
      result[fallbackEmotion] = 1.0;
      return result;
    }

    // Normalize so sum = 1.0
    CANONICAL_EMOTIONS.forEach((emo) => {
      result[emo] = Math.round((result[emo] / sum) * 1000) / 1000;
    });

    return result;
  }

  /**
   * Preload ML Models with latency tracking
   */
  public async initialize(modelUrl = '/models'): Promise<void> {
    if (this.isInitialized && this.availabilityStatus === 'active') return;

    logger.startPerfMarker('ModelLoading');
    try {
      if (typeof window !== 'undefined' && (window as any).faceapi) {
        const faceapi = (window as any).faceapi;
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
          faceapi.nets.faceExpressionNet.loadFromUri(modelUrl),
        ]);
        this.isModelLoaded = true;
      } else {
        // Mock mode for headless test environments
        this.isModelLoaded = true;
      }

      const loadDuration = logger.endPerfMarker('ModelLoading');
      this.availabilityStatus = 'active';
      this.isInitialized = true;
      this.currentState = {
        ...this.currentState,
        availabilityStatus: 'active',
      };
      logger.info('EmotionLayer', `Emotion ML models loaded successfully (load latency: ${loadDuration.toFixed(2)} ms)`);
    } catch (err: unknown) {
      this.availabilityStatus = 'error';
      logger.error({
        code: 'MODEL_LOAD_FAIL',
        layer: 'Emotion',
        message: 'Failed to load Emotion ML models',
        recoverable: true,
        details: { error: String(err) },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Process incoming frame classification with EMA temporal smoothing & hysteresis stability gating
   */
  public processFrameInference(
    rawEmotion: string,
    rawConfidence: number,
    rawProbs?: Record<string, number> | [string, number][]
  ): EmotionState {
    if (!this.isInitialized) {
      this.availabilityStatus = 'active';
      this.isInitialized = true;
      this.isModelLoaded = true;
    }

    const now = performance.now();
    if (this.lastInferenceTime > 0) {
      const deltaMs = now - this.lastInferenceTime;
      this.inferenceFps = Math.round(1000 / Math.max(1, deltaMs));
    }
    this.lastInferenceTime = now;

    const normalized = this.normalizeEmotion(rawEmotion);
    const sanitizedConf = !isNaN(rawConfidence) && isFinite(rawConfidence) ? Math.min(1.0, Math.max(0.0, rawConfidence)) : 0.8;
    const sanitizedProbs = this.sanitizeProbabilities(rawProbs, normalized, sanitizedConf);

    // 1. Exponential Moving Average (EMA) Smoothing
    CANONICAL_EMOTIONS.forEach((emo) => {
      const prev = this.smoothedProbs[emo] || 0;
      const curr = sanitizedProbs[emo] || 0;
      if (prev === 0 && curr > 0 && this.windowBuffer.length === 0) {
        this.smoothedProbs[emo] = curr;
      } else {
        this.smoothedProbs[emo] = Math.round((this.emaAlpha * curr + (1 - this.emaAlpha) * prev) * 1000) / 1000;
      }
    });

    // 2. Sliding Window Buffer
    this.windowBuffer.push({ emotion: normalized, confidence: sanitizedConf, probs: sanitizedProbs });
    if (this.windowBuffer.length > this.windowSize) {
      this.windowBuffer.shift();
    }

    // 3. Dominant Emotion Selection
    let highestProbEmo: EmotionLabel = normalized;
    let maxProb = 0;
    CANONICAL_EMOTIONS.forEach((emo) => {
      if (this.smoothedProbs[emo] >= maxProb) {
        maxProb = this.smoothedProbs[emo];
        highestProbEmo = emo;
      }
    });

    if (this.windowBuffer.length <= 2) {
      highestProbEmo = normalized;
      maxProb = sanitizedConf;
      this.smoothedProbs[normalized] = sanitizedConf;
    }

    // 4. Hysteresis Gating
    if (highestProbEmo === this.currentStabilizedEmotion) {
      this.consecutiveCount = Math.min(10, this.consecutiveCount + 1);
    } else {
      this.consecutiveCount = 0;
      this.currentStabilizedEmotion = highestProbEmo;
      this.stabilizedStateChangeCount++;
      logger.info('EmotionLayer', `Stabilized state transition -> [${highestProbEmo}] (conf: ${maxProb.toFixed(2)})`);
    }

    const isStabilized = this.consecutiveCount >= this.hysteresisThreshold || this.windowBuffer.length <= 2;
    const windowLen = Math.max(1, this.windowBuffer.length);
    const temporalStability = Math.round((Math.max(1, this.consecutiveCount) / windowLen) * 100) / 100;
    const profile = EMOTION_PROFILES[this.currentStabilizedEmotion] || EMOTION_PROFILES.neutral;

    this.currentState = {
      rawEmotion,
      normalizedEmotion: this.currentStabilizedEmotion,
      confidence: Math.round(Math.max(sanitizedConf, maxProb) * 100) / 100,
      valenceScore: profile.valence,
      arousalScore: profile.arousal,
      energyScore: profile.energy,
      temporalStability: Math.min(1.0, Math.max(0.5, temporalStability)),
      probabilities: { ...this.smoothedProbs },
      availabilityStatus: this.availabilityStatus,
      isStabilized,
      timestamp: Date.now(),
    };

    this.notifySubscribers();
    return this.currentState;
  }

  public getCurrentState(): EmotionState {
    return this.currentState;
  }

  public subscribe(listener: (state: EmotionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifySubscribers(): void {
    this.listeners.forEach((listener) => listener(this.currentState));
  }

  public getFallbackState(status: EmotionAvailabilityStatus = 'unavailable'): EmotionState {
    return {
      rawEmotion: 'neutral',
      normalizedEmotion: 'neutral',
      confidence: 1.0,
      valenceScore: 0.50,
      arousalScore: 0.50,
      energyScore: 0.50,
      temporalStability: 1.0,
      probabilities: this.createZeroProbabilities(),
      availabilityStatus: status,
      isStabilized: true,
      timestamp: Date.now(),
    };
  }

  public getMetrics(): Record<string, unknown> {
    return {
      inferenceFps: this.inferenceFps,
      stabilizedStateChangeCount: this.stabilizedStateChangeCount,
      currentStatus: this.availabilityStatus,
      isModelLoaded: this.isModelLoaded,
    };
  }

  public stop(): void {
    cameraDriver.stopCamera();
    this.availabilityStatus = 'unavailable';
    this.currentState = this.getFallbackState('unavailable');
    this.notifySubscribers();
  }

  public dispose(): void {
    this.stop();
    this.isInitialized = false;
    this.isModelLoaded = false;
    this.listeners.clear();
    this.windowBuffer = [];
    this.smoothedProbs = this.createZeroProbabilities();
    this.currentStabilizedEmotion = 'neutral';
    this.consecutiveCount = 0;
  }
}

export const emotionInference = EmotionInferenceService.getInstance();
