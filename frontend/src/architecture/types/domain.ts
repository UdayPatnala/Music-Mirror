export type EmotionLabel = 'happy' | 'sad' | 'angry' | 'neutral' | 'surprise' | 'fearful' | 'disgusted';

export interface EmotionState {
  rawEmotion: string;
  normalizedEmotion: EmotionLabel;
  confidence: number;
  valenceScore: number; // 0.0 to 1.0
  energyScore: number;  // 0.0 to 1.0
  temporalStability: number; // 0.0 to 1.0 (confidence across temporal window)
  timestamp: number;
}

export interface UserPreference {
  userId?: string;
  name: string;
  email: string;
  preferredGenres: string[];
  preferredLanguages: string[];
  musicGoal: 'match' | 'lift' | 'relax' | 'focus';
}

export interface MusicIntent {
  intentId: string;
  emotion: EmotionState;
  targetValence: number; // 0.0 to 1.0
  targetEnergy: number;  // 0.0 to 1.0
  targetTempoBpm: number; // e.g. 60 to 180
  priorityLanguages: string[];
  priorityGenres: string[];
  goalModifier: string;
  timestamp: number;
}

export interface MusicCandidate {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre: string;
  language: string;
  albumArtUrl?: string;
  audioFeatures: {
    valence: number;
    energy: number;
    bpm: number;
  };
  providerId: string;
  playbackRef: string; // YouTube Video ID or local URL
  recommendationScore: number;
  recommendationReason: string;
}

export interface PlaybackState {
  currentCandidate: MusicCandidate | null;
  isPlaying: boolean;
  progressPercent: number; // 0 - 100
  durationSeconds: number;
  volume: number; // 0 - 100
  providerId: string;
  activeMood: EmotionLabel;
  queue: MusicCandidate[];
}

export interface ApplicationError {
  code: string;
  layer: 'Presentation' | 'Emotion' | 'Intent' | 'Discovery' | 'Provider' | 'Playback' | 'Persistence';
  message: string;
  recoverable: boolean;
  fallbackStrategy?: string;
  details?: Record<string, unknown>;
  timestamp: number;
}
