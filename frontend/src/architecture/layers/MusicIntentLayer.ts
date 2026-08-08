/**
 * MusicMirror Music Intent Engine (STAGE 03 Implementation)
 * Deterministic, Explainable, Provider-Agnostic Music Discovery Intent Generator
 */

import type {
  EmotionState,
  EmotionLabel,
  UserPreference,
  MusicIntent,
  IntentPolicy,
  IntentSpecificity,
  ProviderQueryConstraints,
} from '../types/domain';
import { logger } from './ObservabilityLayer';

// Canonical Music Vocabulary
export const CANONICAL_MOOD_DESCRIPTORS: Record<EmotionLabel, string[]> = {
  happy: ['upbeat', 'cheerful', 'bright', 'joyful'],
  sad: ['reflective', 'mellow', 'tender', 'gentle'],
  angry: ['intense', 'driving', 'energetic', 'raw'],
  neutral: ['balanced', 'calm', 'steady', 'relaxed'],
  surprise: ['dynamic', 'expressive', 'vibrant', 'lively'],
  fearful: ['soothing', 'comforting', 'soft', 'peaceful'],
  disgusted: ['grounded', 'atmospheric', 'mellow'],
};

export const CANONICAL_STYLE_DESCRIPTORS: Record<EmotionLabel, string[]> = {
  happy: ['pop', 'synthpop', 'melody', 'danceable'],
  sad: ['ballad', 'acoustic', 'ambient', 'soul'],
  angry: ['rock', 'alternative', 'electronic', 'uptempo'],
  neutral: ['ambient', 'chillout', 'light pop', 'acoustic'],
  surprise: ['indie pop', 'electronic', 'fusion'],
  fearful: ['ambient', 'soft piano', 'acoustic'],
  disgusted: ['lo-fi', 'downtempo', 'chillout'],
};

export class MusicIntentEngine {
  private static instance: MusicIntentEngine | null = null;

  private lastIntent: MusicIntent | null = null;
  private minIntentLifetimeMs: number = 5000;
  private valenceShiftThreshold: number = 0.15;
  private energyShiftThreshold: number = 0.15;

  private constructor() {}

  public static getInstance(): MusicIntentEngine {
    if (!MusicIntentEngine.instance) {
      MusicIntentEngine.instance = new MusicIntentEngine();
    }
    return MusicIntentEngine.instance;
  }

  public resetState(): void {
    this.lastIntent = null;
  }

  public mapIntent(emotion: EmotionState, preference?: Partial<UserPreference>, forceRefresh = true): MusicIntent {
    return this.generateIntent(emotion, preference, 'MATCH', forceRefresh);
  }

  /**
   * Main Intent Generation Entry Point: Maps EmotionState + UserPreference to primary MusicIntent
   */
  public generateIntent(
    emotion: EmotionState,
    preference?: Partial<UserPreference>,
    policy: IntentPolicy = 'MATCH',
    forceRefresh = false
  ): MusicIntent {
    logger.startPerfMarker('IntentGeneration');

    const sanitizedEmotion = this.ensureValidEmotionState(emotion);
    const userPref = this.sanitizeUserPreferences(preference);

    // 1. Debouncing & Meaningful Change Check (bypass if forceRefresh is true)
    if (!forceRefresh && this.lastIntent && !this.hasMeaningfulChange(sanitizedEmotion, userPref)) {
      logger.info('MusicIntentLayer', 'Reusing active intent (meaningful change threshold not reached)');
      logger.endPerfMarker('IntentGeneration');
      return this.lastIntent;
    }

    // 2. Derive Valence, Arousal, and Energy Targets based on Policy & Goal Modifiers
    const { valenceTarget, arousalTarget, energyTarget, reasonCodes } = this.computeTargetsByPolicy(
      sanitizedEmotion,
      userPref,
      policy
    );

    // 3. Propagate Confidence & Scale Specificity
    const { specificity, bpmRange, targetBpm } = this.computeConfidenceSpecificity(
      sanitizedEmotion.confidence,
      energyTarget
    );

    // 4. Resolve Canonical Descriptors & User Preference Precedence
    const moodDescriptors = CANONICAL_MOOD_DESCRIPTORS[sanitizedEmotion.normalizedEmotion] || CANONICAL_MOOD_DESCRIPTORS.neutral;
    let styleDescriptors = CANONICAL_STYLE_DESCRIPTORS[sanitizedEmotion.normalizedEmotion] || CANONICAL_STYLE_DESCRIPTORS.neutral;

    // Explicit User Preferences take precedence over emotion inferences
    const priorityLanguages = userPref.preferredLanguages && userPref.preferredLanguages.length > 0
      ? userPref.preferredLanguages
      : ['Telugu', 'English', 'Tamil', 'Hindi'];

    const priorityGenres = userPref.preferredGenres && userPref.preferredGenres.length > 0
      ? userPref.preferredGenres
      : ['Pop', 'Telugu Pop', 'Synthpop', 'Soul'];

    if (userPref.preferredGenres && userPref.preferredGenres.length > 0) {
      styleDescriptors = Array.from(new Set([...userPref.preferredGenres, ...styleDescriptors]));
      reasonCodes.push('PREFERENCE_GENRE_PRIORITY');
    }

    const now = Date.now();
    const intent: MusicIntent = {
      intentId: `intent_${now}_${Math.random().toString(36).substring(2, 7)}`,
      emotion: sanitizedEmotion,
      moodDescriptors,
      valenceTarget,
      arousalTarget,
      energyTarget,
      tempoRange: {
        minBpm: bpmRange[0],
        maxBpm: bpmRange[1],
        targetBpm,
      },
      targetValence: valenceTarget,
      targetEnergy: energyTarget,
      targetTempoBpm: targetBpm,
      styleDescriptors,
      vocalPreference: energyTarget < 0.3 ? 'instrumental_preferred' : 'any',
      intensity: energyTarget > 0.75 ? 'intense' : energyTarget < 0.35 ? 'subtle' : 'moderate',
      targetContext: userPref.musicGoal === 'focus' ? 'focus' : energyTarget > 0.7 ? 'active' : 'ambient',
      confidence: sanitizedEmotion.confidence,
      specificity,
      reasonCodes,
      policy,
      priorityLanguages,
      priorityGenres,
      goalModifier: userPref.musicGoal || 'match',
      createdAt: now,
      expiresAt: now + this.minIntentLifetimeMs,
      version: '1.0.0',
    };

    this.lastIntent = intent;
    const duration = logger.endPerfMarker('IntentGeneration');
    logger.info(
      'MusicIntentLayer',
      `Generated Intent [${intent.intentId}] (policy=${policy}, specificity=${specificity}, duration=${duration.toFixed(2)}ms)`
    );

    return intent;
  }

  /**
   * Predictive Prefetch Candidate Intent Generator: Generates primary intent + bounded secondary prefetch candidates
   */
  public generatePrefetchIntentSet(
    emotion: EmotionState,
    preference?: Partial<UserPreference>,
    policy: IntentPolicy = 'MATCH'
  ): { primaryIntent: MusicIntent; secondaryPrefetchIntents: MusicIntent[] } {
    const primaryIntent = this.generateIntent(emotion, preference, policy, true);
    const secondaryPrefetchIntents: MusicIntent[] = [];

    // Bounded candidate generation if confidence is uncertain (< 0.75) or near boundary
    if (emotion.confidence < 0.75 || emotion.normalizedEmotion === 'neutral') {
      const altEmotions: EmotionLabel[] = emotion.normalizedEmotion === 'happy'
        ? ['neutral', 'surprise']
        : emotion.normalizedEmotion === 'sad'
        ? ['neutral', 'fearful']
        : ['happy', 'sad'];

      altEmotions.forEach((altEmo) => {
        const altEmotionState: EmotionState = {
          ...emotion,
          normalizedEmotion: altEmo,
          confidence: Math.round(Math.max(0.4, emotion.confidence - 0.2) * 100) / 100,
        };
        const secIntent = this.generateIntent(altEmotionState, preference, policy, true);
        secondaryPrefetchIntents.push(secIntent);
      });
    }

    return {
      primaryIntent,
      secondaryPrefetchIntents: secondaryPrefetchIntents.slice(0, 2),
    };
  }

  /**
   * Provider-Neutral Constraint Builder: Turns MusicIntent into structured ProviderQueryConstraints
   */
  public buildQueryConstraints(intent: MusicIntent): ProviderQueryConstraints {
    const keywords: string[] = [
      ...intent.moodDescriptors.slice(0, 2),
      ...intent.styleDescriptors.slice(0, 2),
      ...intent.priorityLanguages.slice(0, 1),
    ];

    const valenceMargin = intent.specificity === 'precise' ? 0.15 : intent.specificity === 'moderate' ? 0.25 : 0.40;
    const energyMargin = intent.specificity === 'precise' ? 0.15 : intent.specificity === 'moderate' ? 0.25 : 0.40;

    return {
      queryKeywords: Array.from(new Set(keywords.map((k) => k.toLowerCase()))),
      valenceRange: [
        Math.max(0.0, Math.round((intent.valenceTarget - valenceMargin) * 100) / 100),
        Math.min(1.0, Math.round((intent.valenceTarget + valenceMargin) * 100) / 100),
      ],
      energyRange: [
        Math.max(0.0, Math.round((intent.energyTarget - energyMargin) * 100) / 100),
        Math.min(1.0, Math.round((intent.energyTarget + energyMargin) * 100) / 100),
      ],
      bpmRange: [intent.tempoRange.minBpm, intent.tempoRange.maxBpm],
      targetGenres: intent.priorityGenres,
      targetLanguages: intent.priorityLanguages,
      maxCandidateCount: intent.specificity === 'precise' ? 10 : 20,
    };
  }

  /**
   * Pluggable Policy Computation Engine
   */
  private computeTargetsByPolicy(
    emotion: EmotionState,
    preference: UserPreference,
    policy: IntentPolicy
  ): { valenceTarget: number; arousalTarget: number; energyTarget: number; reasonCodes: string[] } {
    let valence = emotion.valenceScore;
    let arousal = emotion.arousalScore;
    let energy = emotion.energyScore;
    const reasonCodes: string[] = [`EMOTION_${emotion.normalizedEmotion.toUpperCase()}`];

    // 1. Apply Policy
    switch (policy) {
      case 'REGULATE':
        // Counterbalance sad/angry or low valence
        if (valence < 0.4) {
          valence = Math.min(0.70, valence + 0.30);
          energy = Math.min(0.65, energy + 0.20);
          reasonCodes.push('POLICY_REGULATE_UPLIFT');
        } else if (energy > 0.8) {
          energy = Math.max(0.50, energy - 0.30);
          arousal = Math.max(0.50, arousal - 0.25);
          reasonCodes.push('POLICY_REGULATE_SOOTHE');
        }
        break;

      case 'BALANCE':
        valence = 0.55;
        arousal = 0.50;
        energy = 0.50;
        reasonCodes.push('POLICY_BALANCE_NEUTRAL');
        break;

      case 'PERSONALIZED_BLEND':
        // 70% user preference preference, 30% emotion
        valence = Math.round((0.7 * 0.65 + 0.3 * valence) * 100) / 100;
        energy = Math.round((0.7 * 0.60 + 0.3 * energy) * 100) / 100;
        reasonCodes.push('POLICY_PERSONALIZED_BLEND');
        break;

      case 'MATCH':
      default:
        reasonCodes.push('POLICY_MATCH_DIRECT');
        break;
    }

    // 2. Apply User Goal Modifier
    if (preference.musicGoal === 'lift') {
      valence = Math.min(1.0, valence + 0.20);
      energy = Math.min(1.0, energy + 0.15);
      reasonCodes.push('GOAL_LIFT');
    } else if (preference.musicGoal === 'relax') {
      energy = Math.max(0.15, energy - 0.25);
      reasonCodes.push('GOAL_RELAX');
    } else if (preference.musicGoal === 'focus') {
      energy = 0.50;
      arousal = 0.45;
      reasonCodes.push('GOAL_FOCUS');
    }

    return {
      valenceTarget: Math.round(Math.min(1.0, Math.max(0.0, valence)) * 100) / 100,
      arousalTarget: Math.round(Math.min(1.0, Math.max(0.0, arousal)) * 100) / 100,
      energyTarget: Math.round(Math.min(1.0, Math.max(0.0, energy)) * 100) / 100,
      reasonCodes,
    };
  }

  /**
   * Confidence Propagation & Specificity Scaling
   */
  private computeConfidenceSpecificity(
    confidence: number,
    energyTarget: number
  ): { specificity: IntentSpecificity; bpmRange: [number, number]; targetBpm: number } {
    const targetBpm = Math.round(70 + energyTarget * 70);

    if (confidence >= 0.75) {
      return {
        specificity: 'precise',
        bpmRange: [Math.max(50, targetBpm - 10), Math.min(180, targetBpm + 10)],
        targetBpm,
      };
    } else if (confidence >= 0.50) {
      return {
        specificity: 'moderate',
        bpmRange: [Math.max(50, targetBpm - 20), Math.min(180, targetBpm + 20)],
        targetBpm,
      };
    } else {
      return {
        specificity: 'broad',
        bpmRange: [Math.max(50, targetBpm - 35), Math.min(180, targetBpm + 35)],
        targetBpm,
      };
    }
  }

  /**
   * Meaningful Change & Debouncing Detection
   */
  private hasMeaningfulChange(newEmotion: EmotionState, _newPref: UserPreference): boolean {
    if (!this.lastIntent) return true;
    if (Date.now() - this.lastIntent.createdAt > this.minIntentLifetimeMs) return true;

    if (newEmotion.normalizedEmotion !== this.lastIntent.emotion.normalizedEmotion) return true;
    if (Math.abs(newEmotion.valenceScore - this.lastIntent.emotion.valenceScore) > this.valenceShiftThreshold) return true;
    if (Math.abs(newEmotion.energyScore - this.lastIntent.emotion.energyScore) > this.energyShiftThreshold) return true;

    return false;
  }

  private ensureValidEmotionState(emotion?: EmotionState): EmotionState {
    if (!emotion || typeof emotion !== 'object') {
      return {
        rawEmotion: 'neutral',
        normalizedEmotion: 'neutral',
        confidence: 1.0,
        valenceScore: 0.50,
        arousalScore: 0.50,
        energyScore: 0.50,
        temporalStability: 1.0,
        probabilities: { happy: 0, sad: 0, angry: 0, neutral: 1, surprise: 0, fearful: 0, disgusted: 0 },
        availabilityStatus: 'unavailable',
        isStabilized: true,
        timestamp: Date.now(),
      };
    }
    return emotion;
  }

  private sanitizeUserPreferences(pref?: Partial<UserPreference>): UserPreference {
    return {
      name: pref?.name || 'Guest User',
      email: pref?.email || 'guest@musicmirror.ai',
      preferredGenres: Array.isArray(pref?.preferredGenres) && pref.preferredGenres.length > 0 ? pref.preferredGenres : ['Telugu Pop', 'Synthpop'],
      preferredLanguages: Array.isArray(pref?.preferredLanguages) && pref.preferredLanguages.length > 0 ? pref.preferredLanguages : ['Telugu', 'English'],
      musicGoal: (pref?.musicGoal as UserPreference['musicGoal']) || 'match',
    };
  }
}

export const MusicIntentEngineInstance = MusicIntentEngine.getInstance();
export const intentMapper = MusicIntentEngineInstance;
export const IntentMapperService = MusicIntentEngine;
