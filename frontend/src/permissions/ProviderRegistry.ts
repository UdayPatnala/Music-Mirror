/**
 * Music Mirror — Provider Registry (Spec §13)
 *
 * Maintains a registry of every external provider MM communicates with.
 * For every external provider record:
 *   provider, purpose, data_sent, data_received, authentication_required,
 *   retention_known, user_control, failure_behavior
 *
 * Rules:
 *   - Never send more data than the provider requires.
 *   - Do not silently introduce a new third-party service.
 *   - Adding a new provider must trigger a privacy/data-flow review.
 *   - Do not automatically add permissions for services not actually implemented.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProviderCategory =
  | 'MUSIC_PROVIDER'
  | 'AUTH_PROVIDER'
  | 'AI_LLM_PROVIDER'
  | 'METADATA_PROVIDER'
  | 'ANALYTICS_PROVIDER'
  | 'CDN_STORAGE'
  | 'INTERNAL_BACKEND';

export type FailureBehavior =
  | 'DEGRADE_GRACEFULLY'      // Feature continues with reduced capability
  | 'FALLBACK_TO_ALTERNATIVE' // Switch to backup provider
  | 'DISABLE_FEATURE'         // Turn off the feature that requires this provider
  | 'SHOW_ERROR'              // Surface error to user; no retry
  | 'RETRY_WITH_BACKOFF';     // Retry with exponential backoff

export type UserControlLevel =
  | 'NONE'       // No user control — provider is required for core function
  | 'OPT_OUT'    // User can disable the feature that uses this provider
  | 'OPT_IN'     // User must explicitly enable the feature that uses this provider
  | 'REMOVABLE'; // User can fully disconnect this provider

export interface ProviderRecord {
  /** Short identifier for this provider */
  id: string;
  /** Human-readable name */
  name: string;
  /** Category of service */
  category: ProviderCategory;
  /** Why MM uses this provider — must be specific */
  purpose: string;
  /** What data MM sends to this provider (data minimization checklist) */
  dataSent: string[];
  /** What data MM receives from this provider */
  dataReceived: string[];
  /** Whether an API key or user auth token is required */
  authenticationRequired: boolean;
  /** Whether the provider's retention policy is known and documented */
  retentionKnown: boolean;
  /** How much control the user has over this provider relationship */
  userControl: UserControlLevel;
  /** What happens if this provider is unavailable */
  failureBehavior: FailureBehavior;
  /** Whether this provider is currently active in production */
  active: boolean;
  /** URL to the provider's privacy policy, if known */
  privacyPolicyUrl?: string;
}

// ---------------------------------------------------------------------------
// Registry of all current providers
// ---------------------------------------------------------------------------

/**
 * MM current provider registry.
 *
 * IMPORTANT: Adding any new provider to this list requires a privacy/data-flow
 * review. Do not add providers that are only theoretically useful.
 * Only list providers that are actually integrated and in use.
 */
const PROVIDER_REGISTRY: readonly ProviderRecord[] = [
  {
    id: 'youtube_api',
    name: 'YouTube Data API v3',
    category: 'MUSIC_PROVIDER',
    purpose: 'Search for music videos matching the user\'s emotional query. Retrieve video metadata (title, channel, duration, thumbnail).',
    dataSent: [
      'Search query string (derived from emotion label + optional user note)',
      'API key (server-side only, not exposed to client)',
    ],
    dataReceived: [
      'Video ID',
      'Video title',
      'Channel name',
      'Channel ID',
      'Duration (ISO 8601)',
      'Thumbnail URLs',
      'View count (used for ranking, discarded after candidate pool construction)',
      'Publish date (used for recency scoring, discarded after ranking)',
    ],
    authenticationRequired: true,
    retentionKnown: false, // Google retains API query logs per their own policy
    userControl: 'OPT_OUT',
    failureBehavior: 'FALLBACK_TO_ALTERNATIVE',
    active: true,
    privacyPolicyUrl: 'https://policies.google.com/privacy',
  },
  {
    id: 'youtube_iframe',
    name: 'YouTube IFrame Player API',
    category: 'MUSIC_PROVIDER',
    purpose: 'Embed and play YouTube videos in the browser. Provides playback events (play, pause, error codes) for the failover ladder.',
    dataSent: [
      'Video ID (embedded in iframe src URL)',
      'Player parameters (autoplay, mute, origin domain)',
    ],
    dataReceived: [
      'Playback state events (playing, paused, buffering)',
      'Error codes (100, 101, 150 — used for failover ladder)',
      'Video duration',
    ],
    authenticationRequired: false,
    retentionKnown: false, // Google collects playback telemetry per their policy
    userControl: 'OPT_OUT',
    failureBehavior: 'FALLBACK_TO_ALTERNATIVE',
    active: true,
    privacyPolicyUrl: 'https://policies.google.com/privacy',
  },
  {
    id: 'mm_backend',
    name: 'Music Mirror Backend API',
    category: 'INTERNAL_BACKEND',
    purpose: 'Retrieve emotion-based track recommendations, transition journeys, health checks, user preferences, and catalog data from the MM server.',
    dataSent: [
      'Emotion ID (e.g., "serene", "joyful") — not personally identifiable',
      'Mirror policy (REFLECT/REGULATE/CATHARSIS/BALANCE)',
      'Optional user note (text only, not transmitted unless explicitly sent)',
      'Authorization header (Bearer token for user-scoped endpoints)',
    ],
    dataReceived: [
      'Track list (title, artist, duration, YouTube video ID)',
      'Acoustic features (valence, energy, tempo)',
      'Recommendation metadata',
      'Health status',
    ],
    authenticationRequired: true,
    retentionKnown: true, // Controlled by the MM team
    userControl: 'NONE',
    failureBehavior: 'DEGRADE_GRACEFULLY', // MM continues in STANDALONE mode
    active: true,
  },
  {
    id: 'face_api_js',
    name: 'face-api.js (local ML models)',
    category: 'AI_LLM_PROVIDER',
    purpose: 'Perform local facial expression inference from camera frames to assist emotion selection. No data leaves the device.',
    dataSent: [], // NO network transmission — entirely local execution
    dataReceived: [
      'Emotion label (happy/sad/angry/neutral/surprised/fearful/disgusted)',
      'Confidence score (0.0 – 1.0)',
    ],
    authenticationRequired: false,
    retentionKnown: true, // Local only, no retention
    userControl: 'OPT_IN', // Camera must be explicitly enabled by user
    failureBehavior: 'DISABLE_FEATURE', // Camera feature is completely optional
    active: true,
    privacyPolicyUrl: 'https://github.com/justadudewhohacks/face-api.js',
  },
] as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get all registered providers.
 */
export function getAllProviders(): readonly ProviderRecord[] {
  return PROVIDER_REGISTRY;
}

/**
 * Get all currently active providers.
 */
export function getActiveProviders(): ProviderRecord[] {
  return PROVIDER_REGISTRY.filter(p => p.active);
}

/**
 * Get a provider by its ID.
 * Returns null if the provider is not registered.
 */
export function getProvider(id: string): ProviderRecord | null {
  return PROVIDER_REGISTRY.find(p => p.id === id) ?? null;
}

/**
 * Get all providers that send personal data externally.
 * Useful for privacy audits (spec §31).
 */
export function getProvidersTransmittingData(): ProviderRecord[] {
  return PROVIDER_REGISTRY.filter(p => p.active && p.dataSent.length > 0);
}

/**
 * Get all providers in a given category.
 */
export function getProvidersByCategory(category: ProviderCategory): ProviderRecord[] {
  return PROVIDER_REGISTRY.filter(p => p.category === category);
}

/**
 * Get providers where retention policy is not known.
 * These should be disclosed to the user appropriately.
 */
export function getProvidersWithUnknownRetention(): ProviderRecord[] {
  return PROVIDER_REGISTRY.filter(p => p.active && !p.retentionKnown);
}

/**
 * Check whether a given provider ID is registered.
 * Used during feature approval gate (spec §32).
 */
export function isProviderRegistered(id: string): boolean {
  return PROVIDER_REGISTRY.some(p => p.id === id);
}
