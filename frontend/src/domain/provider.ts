/**
 * Music Mirror — Generic Provider Boundary & Interface Contract
 * Strictly isolates external media providers from canonical domain core.
 */

import type {
  NormalizedCandidate,
  PlayabilityAssessment,
  AudioSource,
  DiscoverySourceType,
} from './canonical';

export type ProviderErrorCode =
  | 'INVALID_CONFIGURATION'
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'NOT_FOUND'
  | 'RESTRICTED'
  | 'UNAVAILABLE'
  | 'MALFORMED_RESPONSE'
  | 'UNKNOWN';

export class ProviderError extends Error {
  public readonly code: ProviderErrorCode;
  public readonly providerId: string;
  public readonly recoverable: boolean;
  public readonly details?: unknown;

  constructor(
    providerId: string,
    code: ProviderErrorCode,
    message: string,
    recoverable: boolean = false,
    details?: unknown
  ) {
    super(`[${providerId}] ${code}: ${message}`);
    this.name = 'ProviderError';
    this.providerId = providerId;
    this.code = code;
    this.recoverable = recoverable;
    this.details = details;
  }
}

export interface ProviderSearchOptions {
  limit?: number;
  expectedDurationMs?: number;
  targetArtist?: string;
  language?: string;
  signal?: AbortSignal;
}

export interface ProviderSearchResponse {
  query: string;
  normalizedQuery: string;
  providerId: string;
  candidates: NormalizedCandidate[];
  totalCandidates: number;
  sourceType: DiscoverySourceType;
  latencyMs: number;
}

export interface MusicProvider {
  readonly providerId: string;
  readonly displayName: string;

  search(query: string, options?: ProviderSearchOptions): Promise<ProviderSearchResponse>;
  getMetadata(contentId: string): Promise<NormalizedCandidate | null>;
  checkPlayability(contentId: string): Promise<PlayabilityAssessment>;
  getPlaybackSource(candidate: NormalizedCandidate): Promise<AudioSource>;
}
