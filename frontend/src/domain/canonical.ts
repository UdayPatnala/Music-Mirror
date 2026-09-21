/**
 * Music Mirror — Canonical Domain Model
 * Single authoritative source of truth for all domain entities.
 */

// ─── Metadata Provenance & Quality ─────────────────────────────────

export interface MetadataRecord<T = unknown> {
  field: string;
  value: T;
  provider: string;
  retrievedAt: number;
  confidence: number;
  version?: string;
}

export interface MetadataQualityScore {
  identityConfidence: number;
  artistConfidence: number;
  albumConfidence: number;
  durationConfidence: number;
  sourceConfidence: number;
  completeness: number;
  freshness: number;
  overallScore: number;
}

// ─── Core Music Entities ───────────────────────────────────────────

export interface Artist {
  id: string;
  name: string;
  normalizedName: string;
  aliases?: string[];
  externalIds?: Record<string, string>;
  imageUrl?: string | null;
  genres: string[];
}

export interface Album {
  id: string;
  title: string;
  normalizedTitle: string;
  artistId?: string;
  artistIds?: string[];
  releaseDate?: string | null;
  albumType?: 'album' | 'single' | 'ep' | 'compilation';
  artwork?: string | null;
  coverImageUrl?: string | null;
  externalIds?: Record<string, string>;
}

export type PlaybackCapability =
  | 'officialEmbed'
  | 'directStream'
  | 'localFile'
  | 'metadataOnly'
  | 'unavailable';

export type VariantClassification =
  | 'OFFICIAL_TRACK'
  | 'OFFICIAL_VIDEO'
  | 'LYRIC_VIDEO'
  | 'LIVE_VERSION'
  | 'REMIX'
  | 'COVER'
  | 'UNOFFICIAL_UPLOAD'
  | 'UNKNOWN';

export type PlayabilityStatus =
  | 'PLAYABLE'
  | 'RESTRICTED'
  | 'UNAVAILABLE'
  | 'UNKNOWN'
  | 'ERROR';

export type DiscoverySourceType =
  | 'LIVE_PROVIDER_RESULT'
  | 'CACHED_PROVIDER_RESULT'
  | 'LOCAL_CATALOG_RESULT'
  | 'OFFLINE_RESULT';

export interface PlayabilityAssessment {
  status: PlayabilityStatus;
  testedCapability: PlaybackCapability;
  restrictionReason?: string;
  verifiedAt: number;
}

export interface NormalizedCandidate {
  id: string;
  provider: string;
  providerContentId: string;
  title: string;
  rawTitle: string;
  detectedArtist?: string | null;
  channelName: string;
  channelIsVerified?: boolean;
  channelIsTopic?: boolean;
  channelIsVevo?: boolean;
  durationSeconds: number;
  durationFormatted: string;
  publishedAt?: string | null;
  viewCount?: number;
  thumbnailUrl?: string | null;
  watchUrl?: string | null;
  variant: VariantClassification;
  playability: PlayabilityAssessment;
  relevanceScore?: number;
  acousticFeatures?: AcousticFeatures;
}

export interface Source {
  id: string;
  trackId: string;
  provider: string;
  externalId: string;
  sourceType: 'youtube' | 'jamendo' | 'local' | 'stream' | 'fallback';
  playbackRef: string;
  urlOrReference?: string | null;
  availability: 'AVAILABLE' | 'RESTRICTED' | 'UNAVAILABLE' | 'GEO_BLOCKED';
  region?: string;
  quality?: string;
  lastChecked: number;
  provenance?: Record<string, MetadataRecord>;
}

export interface AudioSource {
  id: string;
  trackId: string;
  sourceType: 'youtube' | 'jamendo' | 'local' | 'stream' | 'fallback';
  sourceId: string; // e.g. 11-char YouTube video ID or stream track ID
  sourceUrl?: string | null;
  playbackRef: string; // Video ID, stream URL, or local object URL
  capability: PlaybackCapability;
  status: 'active' | 'degraded' | 'unavailable' | 'quarantined';
  reliabilityScore: number; // 0.0 to 1.0
  healthScore: number;      // 0.0 to 1.0
  failureCount: number;
}

export interface AcousticFeatures {
  valence: number;      // 0.0 (sad/gloomy) to 1.0 (happy/cheerful)
  energy: number;       // 0.0 (calm/serene) to 1.0 (intense/energetic)
  tempo: number;        // BPM e.g. 60 - 180
  danceability?: number;// 0.0 to 1.0
  acousticness?: number;// 0.0 to 1.0
  instrumentalness?: number; // 0.0 to 1.0
}

export interface TrackMetadata {
  durationSeconds: number;
  durationFormatted: string; // "M:SS"
  releaseDate?: string | null;
  genre: string;
  canonicalGenres: string[];
  language: string;
  isExplicit: boolean;
  popularity: number;        // 0 to 100
  channelName?: string | null;
  isVerifiedChannel?: boolean;
}

export interface Track {
  id: string;
  title: string;
  normalizedTitle: string;
  artist: string;
  artists: string[];
  artistIds?: string[];
  album?: string | null;
  albumId?: string | null;
  duration?: number;
  releaseDate?: string | null;
  trackNumber?: number;
  discNumber?: number;
  explicit?: boolean;
  language?: string;
  genres?: string[];
  isrc?: string | null;
  externalIds?: Record<string, string>;
  metadataQuality?: MetadataQualityScore;
  metadataStatus?: 'VALIDATED' | 'PROVISIONAL' | 'CONFLICT' | 'QUARANTINED';
  artworkUrl?: string | null;
  metadata: TrackMetadata;
  acousticFeatures: AcousticFeatures;
  primarySource: AudioSource;
  availableSources: AudioSource[];
  provenance?: Record<string, MetadataRecord>;
  relevanceScore?: number;
  recommendationReason?: string;
  variant?: VariantClassification;
  playability?: PlayabilityAssessment;
  discoverySource?: DiscoverySourceType;
  // Aliases for compatibility
  name?: string;
  youtubeId?: string;
  previewUrl?: string | null;
}

// ─── Playback Lifecycle & Engine ───────────────────────────────────

export type PlaybackStatus =
  | 'IDLE'
  | 'LOADING'
  | 'READY'
  | 'PLAYING'
  | 'PAUSED'
  | 'BUFFERING'
  | 'SEEKING'
  | 'ENDED'
  | 'ERROR'
  | 'STOPPED';

export interface PlaybackState {
  status: PlaybackStatus;
  trackId?: string | null;
  sourceId?: string | null;
  position?: number;
  duration?: number;
  volume?: number;
  queueId?: string;
  requestId?: string;
  error: CoreError | null;
  currentTrack: Track | null;
  nextTrack: Track | null;
  currentTimeSeconds: number;
  durationSeconds: number;
  progressPercent: number; // 0 to 100
  volumePercent: number;    // 0 to 100
  isMuted: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  activeProviderId: string;
  sequenceToken: number;
}

export interface PlaybackControls {
  play: (track?: Track) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => void;
  seek: (seconds: number) => Promise<void>;
  setVolume: (volumePercent: number) => void;
  toggleMute: () => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
}

// ─── Queue Management ──────────────────────────────────────────────

export interface QueueState {
  items: Track[];
  currentIndex: number;
  history: string[]; // Track IDs
  maxHistorySize: number;
  repeatMode: 'off' | 'all' | 'one';
  shuffle: boolean;
}

// ─── User Preferences & Identity ───────────────────────────────────

export interface UserPreferences {
  userId: string;
  name: string;
  email: string;
  preferredGenres: string[];
  preferredLanguages: string[];
  preferredMoods: string[];
  preferredArtists: string[];
  musicGoal: 'match' | 'lift' | 'relax' | 'focus';
  discoveryMode: 'more_familiar' | 'balanced' | 'more_exploratory';
  volume: number;
  autoPlay: boolean;
  theme: 'dark' | 'light';
}

export interface FavoriteItem {
  track: Track;
  savedAt: number;
}

export interface HistoryEntry {
  track: Track;
  playedAt: number;
  durationListenedSeconds: number;
  wasCompleted: boolean;
  wasSkipped: boolean;
}

// ─── Error Taxonomy ────────────────────────────────────────────────

export type ErrorCategory =
  | 'USER_ERROR'
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR'
  | 'PLAYBACK_ERROR'
  | 'DATA_ERROR'
  | 'CONFIG_ERROR'
  | 'STORAGE_ERROR';

export interface CoreError {
  category: ErrorCategory;
  code: string;
  message: string;
  recoverable: boolean;
  timestamp: number;
  context?: Record<string, unknown>;
}

// ─── Search & Recommendations ──────────────────────────────────────

export interface SearchFilter {
  query: string;
  genre?: string;
  mood?: string;
  language?: string;
  limit?: number;
  minEnergy?: number;
  maxEnergy?: number;
  minValence?: number;
  maxValence?: number;
}

export interface StructuredMusicIntent {
  mood: string[];
  energy: number;
  tempoPreference?: number;
  genres: string[];
  languages: string[];
  era?: string;
  explicitPreference?: boolean;
  novelty?: number;
  confidence: number;
  policy?: 'REFLECT' | 'REGULATE' | 'CATHARSIS' | 'BALANCE';
}

export interface SearchResult {
  query: string;
  normalizedQuery: string;
  provider?: string;
  results?: Track[];
  retrievedAt?: number;
  latency?: number;
  error?: CoreError | null;
  isCached: boolean;
  discoverySource?: DiscoverySourceType;
  tracks: Track[];
  totalResults: number;
  latencyMs: number;
}

export interface RecommendationResult {
  emotion: string;
  normalizedEmotion: string;
  goal: string;
  tracks: Track[];
  journeySteps?: Track[];
}

// ─── System Health & Telemetry ─────────────────────────────────────

export interface SystemHealth {
  status: 'READY' | 'DEGRADED' | 'OFFLINE';
  backendConnected: boolean;
  databaseHealthy: boolean;
  activeProvider: string;
  version: string;
  lastCheckedTimestamp: number;
}
