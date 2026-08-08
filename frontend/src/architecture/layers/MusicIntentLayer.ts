import type { EmotionState, UserPreference, MusicIntent } from '../types/domain';
import { logger } from './ObservabilityLayer';

export class IntentMapperService {
  private static instance: IntentMapperService | null = null;

  private constructor() {}

  public static getInstance(): IntentMapperService {
    if (!IntentMapperService.instance) {
      IntentMapperService.instance = new IntentMapperService();
    }
    return IntentMapperService.instance;
  }

  public mapIntent(emotion: EmotionState, preference: UserPreference): MusicIntent {
    let targetValence = emotion.valenceScore;
    let targetEnergy = emotion.energyScore;
    let targetTempoBpm = 110;

    const goal = preference.musicGoal || 'match';

    // Apply Goal Modifiers
    switch (goal) {
      case 'lift':
        targetValence = Math.min(1.0, targetValence + 0.25);
        targetEnergy = Math.min(1.0, targetEnergy + 0.20);
        targetTempoBpm = 128;
        break;

      case 'relax':
        targetValence = Math.max(0.2, targetValence);
        targetEnergy = Math.max(0.1, targetEnergy - 0.25);
        targetTempoBpm = 85;
        break;

      case 'focus':
        targetEnergy = 0.50;
        targetTempoBpm = 100;
        break;

      case 'match':
      default:
        targetTempoBpm = Math.round(70 + targetEnergy * 70);
        break;
    }

    const intent: MusicIntent = {
      intentId: `intent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      emotion,
      targetValence: Math.round(targetValence * 100) / 100,
      targetEnergy: Math.round(targetEnergy * 100) / 100,
      targetTempoBpm,
      priorityLanguages: preference.preferredLanguages && preference.preferredLanguages.length ? preference.preferredLanguages : ['Telugu', 'English', 'Tamil', 'Hindi'],
      priorityGenres: preference.preferredGenres && preference.preferredGenres.length ? preference.preferredGenres : ['Pop', 'Telugu Pop', 'Synthpop', 'Soul'],
      goalModifier: goal,
      timestamp: Date.now(),
    };

    logger.info('MusicIntentLayer', `Created Intent [${intent.intentId}]: Valence=${intent.targetValence}, Energy=${intent.targetEnergy}, Goal=${goal}`);
    return intent;
  }
}

export const intentMapper = IntentMapperService.getInstance();
