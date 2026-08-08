export type EmotionLabel = 'happy' | 'sad' | 'angry' | 'neutral' | 'surprise' | 'fearful' | 'disgusted';

export type EmotionAvailabilityStatus = 'active' | 'initializing' | 'unavailable' | 'permission_denied' | 'error';

export interface EmotionState {
  rawEmotion: string;
  normalizedEmotion: EmotionLabel;
  confidence: number;
  valenceScore: number; // 0.0 to 1.0
  arousalScore: number; // 0.0 to 1.0
  energyScore: number;  // 0.0 to 1.0
  temporalStability: number; // 0.0 to 1.0 (confidence across temporal window)
  probabilities: Record<EmotionLabel, number>;
  availabilityStatus: EmotionAvailabilityStatus;
  isStabilized: boolean;
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

export type IntentPolicy = 'MATCH' | 'REGULATE' | 'BALANCE' | 'PERSONALIZED_BLEND';
export type IntentSpecificity = 'precise' | 'moderate' | 'broad';
export type VocalPreference = 'vocals_preferred' | 'instrumental_preferred' | 'any';
export type IntentIntensity = 'subtle' | 'moderate' | 'intense';
export type TargetContext = 'active' | 'ambient' | 'focus' | 'restful';

export interface TempoRange {
  minBpm: number;
  maxBpm: number;
  targetBpm: number;
}

export interface MusicIntent {
  intentId: string;
  emotion: EmotionState;
  moodDescriptors: string[];
  valenceTarget: number; // 0.0 to 1.0
  arousalTarget: number; // 0.0 to 1.0
  energyTarget: number;  // 0.0 to 1.0
  tempoRange: TempoRange;
  targetValence: number; // backwards-compatible alias
  targetEnergy: number;  // backwards-compatible alias
  targetTempoBpm: number; // backwards-compatible alias
  styleDescriptors: string[];
  vocalPreference: VocalPreference;
  intensity: IntentIntensity;
  targetContext: TargetContext;
  confidence: number;
  specificity: IntentSpecificity;
  reasonCodes: string[];
  policy: IntentPolicy;
  priorityLanguages: string[];
  priorityGenres: string[];
  goalModifier: string;
  createdAt: number;
  expiresAt: number;
  version: string; // e.g. '1.0.0'
}

export interface ProviderQueryConstraints {
  queryKeywords: string[];
  valenceRange: [number, number];
  energyRange: [number, number];
  bpmRange: [number, number];
  targetGenres: string[];
  targetLanguages: string[];
  maxCandidateCount: number;
}

export type PlaybackCapabilityType = 'officialEmbed' | 'officialWebPlayback' | 'directStream' | 'metadataOnly' | 'unavailable';
export type DiscoveryProviderStatus = 'active' | 'rate_limited' | 'degraded' | 'cooling_down' | 'offline';
export type DiscoveryState = 'IDLE' | 'SEARCHING' | 'PREFETCHING' | 'RESULTS_READY' | 'NO_RESULTS' | 'RATE_LIMITED' | 'OFFLINE' | 'PROVIDER_ERROR' | 'UNAVAILABLE';

export interface ProviderCapabilities {
  search: boolean;
  metadata: boolean;
  artwork: boolean;
  streaming: boolean;
  officialEmbed: boolean;
  officialWebPlayback: boolean;
  authenticationRequired: boolean;
  rateLimitPerMinute: number;
  attributionRequired: boolean;
  attributionText?: string;
}

export interface DiscoveryMetrics {
  discoveryLatencyMs: number;
  tIntentToRequestMs: number;
  tProviderResponseMs: number;
  tCandidateProcessingMs: number;
  tPlayabilityResolutionMs: number;
  tDiscoveryReadyMs: number;
  candidateCount: number;
  playableCandidateCount: number;
  cacheHitRate: number;
  prefetchHitRate: number;
  providerErrors: number;
  timeoutCount: number;
  rateLimitEvents: number;
  failoverCount: number;
}

export interface MusicCandidate {
  id: string;
  providerId: string;
  providerTrackId: string;
  title: string;
  artists: string[];
  artist: string; // backwards-compatible alias (primary artist)
  album: string | null;
  artworkUrl: string | null;
  albumArtUrl?: string; // backwards-compatible alias
  duration: number; // in seconds
  releaseInfo: string | null;
  canonicalGenres: string[];
  genre: string; // backwards-compatible alias
  language: string;
  musicAttributes: {
    valence: number;
    energy: number;
    bpm: number;
  };
  audioFeatures: { // backwards-compatible alias
    valence: number;
    energy: number;
    bpm: number;
  };
  providerUrl: string | null;
  playbackRef: string; // Video ID, stream URL, or embed key
  playbackCapability: PlaybackCapabilityType;
  explicitContent: boolean;
  isExplicit?: boolean; // backwards-compatible alias
  status: 'available' | 'restricted' | 'geo_locked' | 'unknown';
  relevanceScore: number; // 0.0 to 1.0
  recommendationScore: number; // backwards-compatible alias
  recommendationReason: string;
  sourceMetadata: Record<string, unknown>;
  retrievalTimestamp: number;
  attributionText?: string;
}

export type SessionState =
  | 'IDLE'
  | 'INITIALIZING'
  | 'SEARCHING'
  | 'PREPARING'
  | 'PLAYING'
  | 'PAUSED'
  | 'BUFFERING'
  | 'TRANSITIONING'
  | 'ERROR'
  | 'NO_PLAYABLE_MUSIC'
  | 'STOPPED';

export type PlaybackEventType =
  | 'load'
  | 'start'
  | 'pause'
  | 'resume'
  | 'timeupdate'
  | 'buffering'
  | 'ended'
  | 'error'
  | 'volumechange';

export interface PlaybackEvent {
  type: PlaybackEventType;
  candidate: MusicCandidate | null;
  positionSeconds: number;
  durationSeconds: number;
  volume: number; // 0.0 to 1.0
  error?: string;
  timestamp: number;
}

export interface PlaybackState {
  currentCandidate: MusicCandidate | null;
  nextCandidate: MusicCandidate | null;
  isPlaying: boolean;
  isPaused: boolean;
  isBuffering: boolean;
  progressPercent: number; // 0 - 100
  currentTimeSeconds: number;
  durationSeconds: number;
  volume: number; // 0 - 100
  isMuted: boolean;
  providerId: string;
  activeMood: EmotionLabel;
  queue: MusicCandidate[];
  sessionState: SessionState;
  sessionToken: number;
  autoplayBlocked: boolean;
  broadeningLevel: number; // 0 to 4
  history: string[]; // Track IDs
  error: string | null;
  attributionText: string | null;
}

export type TransitionDecisionType =
  | 'KEEP_CURRENT'
  | 'PREPARE_NEXT'
  | 'SWITCH_WHEN_READY'
  | 'SWITCH_NOW_ONLY_IF_NECESSARY'
  | 'NO_CHANGE';

export interface SessionTraceEvent {
  eventName:
    | 'sessionStart'
    | 'cameraReady'
    | 'emotionStable'
    | 'intentCreated'
    | 'discoveryStart'
    | 'candidateReady'
    | 'playbackPrepare'
    | 'firstAudio'
    | 'emotionChange'
    | 'intentChange'
    | 'prefetchStart'
    | 'prefetchHit'
    | 'trackStart'
    | 'trackEnd'
    | 'trackSkip'
    | 'error'
    | 'fallback';
  sessionGeneration: number;
  timestamp: number;
  latencyMs?: number;
  meta?: Record<string, unknown>;
}

export interface LatencyBreakdown {
  tCameraReadyToFirstEmotionMs: number;
  tEmotionToStableStateMs: number;
  tStableStateToIntentMs: number;
  tIntentToSearchStartMs: number;
  tSearchStartToCandidateReadyMs: number;
  tCandidateReadyToPlaybackPrepareMs: number;
  tPlaybackPrepareToFirstAudioMs: number;
  tTotalEmotionToFirstAudioMs: number;
}

export interface FeedbackEvent {
  type: 'trackPlayed' | 'trackSkipped' | 'trackCompleted' | 'manualSelection' | 'repeat';
  candidateId: string;
  durationSeconds: number;
  emotion: EmotionLabel;
  timestamp: number;
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

export interface MusicPreferenceProfile {
  version: string; // '1.0.0'
  userId: string;
  explicitContentAllowed: boolean;
  preferredLanguages: string[];
  preferredGenres: Record<string, number>; // genre -> weight (0.0 to 1.0)
  blockedGenres: string[];
  preferredArtists: Record<string, number>; // artist -> weight (-1.0 to 1.0)
  blockedArtists: string[];
  tempoPreference: 'slow' | 'medium' | 'fast' | 'any';
  energyPreference: number; // 0.0 to 1.0
  skipCount: number;
  playCount: number;
  lastUpdatedTimestamp: number;
}

export type FeedbackType =
  | 'LIKE'
  | 'DISLIKE'
  | 'SKIP'
  | 'REPLAY'
  | 'ADD_PREFERENCE'
  | 'REMOVE_PREFERENCE'
  | 'MANUAL_SELECTION'
  | 'COMPLETED';

export interface MusicFeedbackEvent {
  eventId: string;
  type: FeedbackType;
  candidateId: string;
  artist: string;
  genre: string;
  language: string;
  valence: number;
  energy: number;
  playbackDurationSeconds: number;
  completionRatio: number; // 0.0 to 1.0
  timestamp: number;
}

export interface PersonalizationScoreResult {
  candidateId: string;
  isHardBlocked: boolean;
  hardBlockReason?: string;
  intentScore: number;
  preferenceScore: number;
  repetitionPenalty: number;
  finalScore: number;
}
