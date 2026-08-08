/**
 * MusicMirror Domain Contracts & Layer Interfaces
 * Clean 10-Layer Architecture Definitions
 */

// ==========================================
// 1. EMOTION LAYER CONTRACTS
// ==========================================

export interface EmotionVector {
  happy: number;
  sad: number;
  angry: number;
  surprised: number;
  neutral: number;
  fearful: number;
  disgusted: number;
}

export interface EmotionState {
  dominantEmotion: string;
  confidence: number;
  scores: EmotionVector;
  isStable: boolean;
  temporalSampleCount: number;
  timestamp: number;
}

// ==========================================
// 2. MUSIC INTENT LAYER CONTRACTS
// ==========================================

export interface MusicIntent {
  targetValence: number;   // 0.0 (sad/gloomy) to 1.0 (happy/cheerful)
  targetEnergy: number;    // 0.0 (calm/serene) to 1.0 (intense/energetic)
  targetTempo: number;     // BPM (e.g., 60-160)
  moodLabel: string;
  preferredGenres: string[];
  preferredLanguages: string[];
}

// ==========================================
// 3. DISCOVERY & PROVIDER ADAPTER CONTRACTS
// ==========================================

export interface ProviderData {
  youtubeId?: string;
  streamUrl?: string;
  externalUrl?: string;
  trackId?: string;
}

export interface MusicCandidate {
  id: string;
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  durationSeconds?: number;
  valence: number;
  energy: number;
  tempo: number;
  genre: string;
  language: string;
  providerId: string;
  providerData: ProviderData;
  recommendationScore: number;
  recommendationReason: string;
}

export interface ProviderAdapter {
  readonly id: string;
  readonly name: string;
  isAvailable(): Promise<boolean>;
  discover(intent: MusicIntent, preferences: UserPreferences): Promise<MusicCandidate[]>;
}

// ==========================================
// 4. PLAYBACK LAYER CONTRACTS
// ==========================================

export type PlaybackStatus = 'idle' | 'buffering' | 'playing' | 'paused' | 'error';

export interface PlaybackState {
  currentTrack: MusicCandidate | null;
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  error: string | null;
}

// ==========================================
// 5. PREFERENCE & PERSISTENCE CONTRACTS
// ==========================================

export interface UserPreferences {
  primaryLanguages: string[]; // Standard priority: ['Telugu', 'English', 'Tamil', 'Hindi']
  favoriteGenres: string[];
  autoPlayOnEmotion: boolean;
  theme: 'dark' | 'light' | 'cyberpunk';
  dislikedTrackIds: string[];
}

export interface SessionState {
  sessionId: string;
  startTime: number;
  currentEmotion: EmotionState | null;
  currentIntent: MusicIntent | null;
  history: {
    track: MusicCandidate;
    emotion: string;
    playedAt: number;
    durationListened: number;
    wasSkipped: boolean;
  }[];
}

// ==========================================
// 6. OBSERVABILITY & ERROR LAYER CONTRACTS
// ==========================================

export type ErrorSeverity = 'fatal' | 'degraded' | 'warning';

export interface ApplicationError {
  code: string;
  severity: ErrorSeverity;
  message: string;
  layer: 'Presentation' | 'Orchestration' | 'Emotion' | 'Intent' | 'Discovery' | 'Provider' | 'Playback' | 'Preference' | 'Persistence' | 'Observability';
  timestamp: number;
  recoverable: boolean;
  context?: Record<string, unknown>;
}
