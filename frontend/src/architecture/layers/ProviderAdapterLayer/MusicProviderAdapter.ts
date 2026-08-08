import type { MusicIntent, MusicCandidate } from '../../types/domain';

export interface MusicProviderAdapter {
  getProviderId(): string;
  getProviderName(): string;
  isAvailable(): Promise<boolean>;
  searchCandidates(intent: MusicIntent, limit?: number): Promise<MusicCandidate[]>;
  getPlaybackEmbedUrl(candidate: MusicCandidate): string;
}
