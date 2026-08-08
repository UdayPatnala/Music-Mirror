import type {
  MusicIntent,
  MusicCandidate,
  ProviderCapabilities,
  DiscoveryProviderStatus,
  ProviderQueryConstraints,
} from '../../types/domain';

export interface MusicProviderAdapter {
  getProviderId(): string;
  getProviderName(): string;
  getCapabilities(): ProviderCapabilities;
  getStatus(): DiscoveryProviderStatus;
  isAvailable(): Promise<boolean>;
  searchCandidates(
    intent: MusicIntent,
    constraints: ProviderQueryConstraints,
    limit?: number,
    signal?: AbortSignal
  ): Promise<MusicCandidate[]>;
  getPlaybackEmbedUrl(candidate: MusicCandidate): string;
}
