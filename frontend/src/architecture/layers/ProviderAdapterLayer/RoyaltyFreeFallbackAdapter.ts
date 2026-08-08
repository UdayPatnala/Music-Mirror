/**
 * Royalty-Free Offline Fallback Provider Adapter
 * Ensures 100% MusicMirror usability even when completely offline or external APIs are down
 */

import type { MusicProviderAdapter } from './MusicProviderAdapter';
import type {
  MusicIntent,
  MusicCandidate,
  ProviderCapabilities,
  DiscoveryProviderStatus,
  ProviderQueryConstraints,
} from '../../types/domain';
import { logger } from '../ObservabilityLayer';

export class RoyaltyFreeFallbackAdapter implements MusicProviderAdapter {
  private status: DiscoveryProviderStatus = 'active';

  public getProviderId(): string {
    return 'royalty_free_fallback';
  }

  public getProviderName(): string {
    return 'MusicMirror Offline Royalty-Free Catalog';
  }

  public getCapabilities(): ProviderCapabilities {
    return {
      search: true,
      metadata: true,
      artwork: true,
      streaming: true,
      officialEmbed: false,
      officialWebPlayback: true,
      authenticationRequired: false,
      rateLimitPerMinute: 1000,
      attributionRequired: false,
      attributionText: 'MusicMirror Open Royalty-Free Audio Library',
    };
  }

  public getStatus(): DiscoveryProviderStatus {
    return this.status;
  }

  public async isAvailable(): Promise<boolean> {
    return true; // Always available
  }

  public async searchCandidates(
    intent: MusicIntent,
    _constraints?: ProviderQueryConstraints,
    limit: number = 10,
    signal?: AbortSignal
  ): Promise<MusicCandidate[]> {
    if (signal?.aborted) {
      throw new Error('Fallback search aborted by caller');
    }

    logger.info('RoyaltyFreeFallbackAdapter', `Serving offline fallback candidates for intent valence=${intent.targetValence}, energy=${intent.targetEnergy}`);

    const now = Date.now();
    const fallbackCatalog: Array<Partial<MusicCandidate> & { playbackRef: string; title: string; artist: string }> = [
      {
        providerTrackId: 'fallback_gentle_breeze',
        title: 'Gentle Breeze',
        artist: 'Acoustic Calm',
        artists: ['Acoustic Calm'],
        album: 'Peaceful Moments',
        genre: 'Acoustic Ambient',
        canonicalGenres: ['Acoustic Ambient', 'Relaxation'],
        language: 'Instrumental',
        duration: 180,
        audioFeatures: { valence: 0.50, energy: 0.40, bpm: 85 },
        playbackRef: '/audio/fallback_gentle_breeze.mp3',
        providerUrl: null,
        artworkUrl: null,
      },
      {
        providerTrackId: 'fallback_upbeat_morning',
        title: 'Upbeat Morning',
        artist: 'Bright Horizons',
        artists: ['Bright Horizons'],
        album: 'Morning Energy',
        genre: 'Pop Instrumental',
        canonicalGenres: ['Pop Instrumental', 'Upbeat'],
        language: 'Instrumental',
        duration: 165,
        audioFeatures: { valence: 0.85, energy: 0.80, bpm: 124 },
        playbackRef: '/audio/fallback_upbeat_morning.mp3',
        providerUrl: null,
        artworkUrl: null,
      },
    ];

    return fallbackCatalog.slice(0, limit).map((c) => {
      const audioFeatures = c.audioFeatures || { valence: 0.5, energy: 0.5, bpm: 100 };
      return {
        id: `fb_${c.providerTrackId}`,
        providerId: this.getProviderId(),
        providerTrackId: c.providerTrackId!,
        title: c.title,
        artists: c.artists!,
        artist: c.artist,
        album: c.album || null,
        artworkUrl: c.artworkUrl || null,
        albumArtUrl: c.artworkUrl || undefined,
        duration: c.duration || 180,
        releaseInfo: '2025',
        canonicalGenres: c.canonicalGenres!,
        genre: c.genre!,
        language: c.language!,
        musicAttributes: audioFeatures,
        audioFeatures,
        providerUrl: null,
        playbackRef: c.playbackRef,
        playbackCapability: 'directStream',
        explicitContent: false,
        status: 'available',
        relevanceScore: 0.80,
        recommendationScore: 0.80,
        recommendationReason: 'Offline Fallback Candidate',
        sourceMetadata: { source: 'local_royalty_free' },
        retrievalTimestamp: now,
        attributionText: this.getCapabilities().attributionText,
      };
    });
  }

  public getPlaybackEmbedUrl(candidate: MusicCandidate): string {
    return candidate.playbackRef;
  }
}
