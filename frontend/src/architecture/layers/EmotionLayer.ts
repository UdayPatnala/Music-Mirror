import type { EmotionState, EmotionLabel } from '../types/domain';
import { logger } from './ObservabilityLayer';

const EMOTION_MAP: Record<string, EmotionLabel> = {
  surprised: 'surprise',
  surprise: 'surprise',
  fearful: 'sad',
  fear: 'sad',
  disgusted: 'angry',
  disgust: 'angry',
  joyful: 'happy',
  joy: 'happy',
  happy: 'happy',
  excited: 'happy',
  depressed: 'sad',
  sad: 'sad',
  enraged: 'angry',
  angry: 'angry',
  calm: 'neutral',
  neutral: 'neutral',
};

const EMOTION_VECTORS: Record<EmotionLabel, { valence: number; energy: number }> = {
  happy: { valence: 0.90, energy: 0.85 },
  sad: { valence: 0.15, energy: 0.25 },
  angry: { valence: 0.25, energy: 0.90 },
  neutral: { valence: 0.50, energy: 0.50 },
  surprise: { valence: 0.75, energy: 0.80 },
  fearful: { valence: 0.20, energy: 0.70 },
  disgusted: { valence: 0.18, energy: 0.65 },
};

export class EmotionInferenceService {
  private static instance: EmotionInferenceService | null = null;
  private windowBuffer: Array<{ emotion: EmotionLabel; confidence: number; timestamp: number }> = [];
  private windowSize: number = 8; // Sliding window for temporal stability

  private constructor() {}

  public static getInstance(): EmotionInferenceService {
    if (!EmotionInferenceService.instance) {
      EmotionInferenceService.instance = new EmotionInferenceService();
    }
    return EmotionInferenceService.instance;
  }

  public normalizeEmotion(raw: string): EmotionLabel {
    if (!raw) return 'neutral';
    const key = raw.trim().toLowerCase();
    return EMOTION_MAP[key] || 'neutral';
  }

  /**
   * Process incoming frame emotion classification with temporal window smoothing
   */
  public processFrameInference(rawEmotion: string, rawConfidence: number): EmotionState {
    const normalized = this.normalizeEmotion(rawEmotion);
    const now = performance.now();

    // Push into sliding window
    this.windowBuffer.push({ emotion: normalized, confidence: rawConfidence, timestamp: now });
    if (this.windowBuffer.length > this.windowSize) {
      this.windowBuffer.shift();
    }

    // Calculate windowed frequency distribution & temporal stability
    const counts: Record<string, number> = {};
    let totalConfidence = 0;

    this.windowBuffer.forEach((item) => {
      counts[item.emotion] = (counts[item.emotion] || 0) + 1;
      totalConfidence += item.confidence;
    });

    // Find dominant emotion in window
    let dominantEmotion: EmotionLabel = normalized;
    let maxCount = 0;

    Object.entries(counts).forEach(([emo, cnt]) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        dominantEmotion = emo as EmotionLabel;
      }
    });

    const temporalStability = maxCount / this.windowBuffer.length;
    const avgConfidence = totalConfidence / this.windowBuffer.length;
    const vector = EMOTION_VECTORS[dominantEmotion] || EMOTION_VECTORS.neutral;

    const state: EmotionState = {
      rawEmotion,
      normalizedEmotion: dominantEmotion,
      confidence: Math.round(avgConfidence * 100) / 100,
      valenceScore: vector.valence,
      energyScore: energyModifier(vector.energy, dominantEmotion),
      temporalStability: Math.round(temporalStability * 100) / 100,
      timestamp: Date.now(),
    };

    logger.info('EmotionLayer', `Inferred emotion: ${dominantEmotion} (stability: ${state.temporalStability})`);
    return state;
  }

  public getFallbackState(): EmotionState {
    return {
      rawEmotion: 'neutral',
      normalizedEmotion: 'neutral',
      confidence: 1.0,
      valenceScore: 0.5,
      energyScore: 0.5,
      temporalStability: 1.0,
      timestamp: Date.now(),
    };
  }
}

function energyModifier(baseEnergy: number, emotion: EmotionLabel): number {
  if (emotion === 'happy') return Math.min(1.0, baseEnergy + 0.05);
  if (emotion === 'sad') return Math.max(0.1, baseEnergy - 0.05);
  return baseEnergy;
}

export const emotionInference = EmotionInferenceService.getInstance();
