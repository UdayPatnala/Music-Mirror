/**
 * Music Mirror — Spotify Provider Adapter
 * Implements the MusicProvider contract for Spotify secondary metadata discovery and entity resolution.
 * Decouples Spotify Web API schemas from the MM core domain.
 */

import { apiClient } from '../api/client';
import type {
  MusicProvider,
  ProviderSearchOptions,
  ProviderSearchResponse,
} from '../domain/provider';
import { ProviderError } from '../domain/provider';
import type {
  NormalizedCandidate,
  PlayabilityAssessment,
  AudioSource,
} from '../domain/canonical';

export class SpotifyProviderAdapter implements MusicProvider {
  public readonly providerId = 'spotify';
  public readonly displayName = 'Spotify';

  private static instance: SpotifyProviderAdapter | null = null;

  public static getInstance(): SpotifyProviderAdapter {
    if (!this.instance) {
      this.instance = new SpotifyProviderAdapter();
    }
    return this.instance;
  }

  /**
   * Search Spotify for candidate music tracks.
   * Provides authoritative track metadata, performing artists, album info, and ISRC.
   */
  public async search(query: string, options?: ProviderSearchOptions): Promise<ProviderSearchResponse> {
    const start = Date.now();
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      return {
        query: '',
        normalizedQuery: '',
        providerId: this.providerId,
        candidates: [],
        totalCandidates: 0,
        sourceType: 'LIVE_PROVIDER_RESULT',
        latencyMs: 0,
      };
    }

    try {
      const resp = await apiClient.searchSpotify(cleanQuery, options?.limit ?? 10);
      const candidates: NormalizedCandidate[] = (resp.tracks || []).map((t: any) => {
        const primaryArtist = t.artists?.[0] || 'Unknown Artist';
        const durSec = Math.round((t.duration_ms || 0) / 1000);
        const mins = Math.floor(durSec / 60);
        const secs = durSec % 60;
        const durationFormatted = `${mins}:${secs.toString().padStart(2, '0')}`;

        return {
          id: `sp_${t.id}`,
          provider: 'spotify',
          providerContentId: t.id,
          title: t.name,
          rawTitle: `${primaryArtist} - ${t.name}`,
          detectedArtist: primaryArtist,
          channelName: primaryArtist,
          durationSeconds: durSec,
          durationFormatted,
          publishedAt: t.release_date,
          thumbnailUrl: t.artwork_url,
          watchUrl: t.spotify_url,
          variant: 'OFFICIAL_TRACK',
          spotifyId: t.id,
          isrc: t.isrc,
          albumName: t.album_name,
          playability: {
            status: 'UNAVAILABLE', // Playback availability is separate from metadata presence
            testedCapability: 'metadataOnly',
            restrictionReason: 'Spotify is a secondary metadata provider in MM (playback delegated to official player)',
            verifiedAt: Date.now(),
          },
          relevanceScore: t.popularity ? t.popularity / 100 : 0.8,
        };
      });

      return {
        query: cleanQuery,
        normalizedQuery: cleanQuery.toLowerCase(),
        providerId: this.providerId,
        candidates,
        totalCandidates: candidates.length,
        sourceType: 'LIVE_PROVIDER_RESULT',
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      throw new ProviderError(
        `Spotify search failed: ${err instanceof Error ? err.message : String(err)}`,
        'NETWORK_ERROR',
        this.providerId
      );
    }
  }

  /**
   * Retrieve metadata for a specific Spotify track ID.
   */
  public async getMetadata(contentId: string): Promise<NormalizedCandidate | null> {
    if (!contentId) return null;

    try {
      const t = await apiClient.getSpotifyTrack(contentId);
      if (!t) return null;

      const primaryArtist = t.artists?.[0] || 'Unknown Artist';
      const durSec = Math.round((t.duration_ms || 0) / 1000);
      const mins = Math.floor(durSec / 60);
      const secs = durSec % 60;

      return {
        id: `sp_${t.id}`,
        provider: 'spotify',
        providerContentId: t.id,
        title: t.name,
        rawTitle: `${primaryArtist} - ${t.name}`,
        detectedArtist: primaryArtist,
        channelName: primaryArtist,
        durationSeconds: durSec,
        durationFormatted: `${mins}:${secs.toString().padStart(2, '0')}`,
        publishedAt: t.release_date,
        thumbnailUrl: t.artwork_url,
        watchUrl: t.spotify_url,
        variant: 'OFFICIAL_TRACK',
        spotifyId: t.id,
        isrc: t.isrc,
        albumName: t.album_name,
        playability: {
          status: 'UNAVAILABLE',
          testedCapability: 'metadataOnly',
          verifiedAt: Date.now(),
        },
        relevanceScore: t.popularity ? t.popularity / 100 : 0.8,
      };
    } catch {
      return null;
    }
  }

  /**
   * Assess playability of a Spotify candidate.
   * Explicitly decoupled: metadata presence != playback availability.
   */
  public async checkPlayability(_contentId: string): Promise<PlayabilityAssessment> {
    return {
      status: 'UNAVAILABLE',
      testedCapability: 'metadataOnly',
      restrictionReason: 'Metadata-only provider. Delegated to primary playback provider.',
      verifiedAt: Date.now(),
    };
  }

  /**
   * Maps a Spotify candidate into a domain AudioSource.
   */
  public async getPlaybackSource(candidate: NormalizedCandidate): Promise<AudioSource> {
    return {
      id: `src_${candidate.id}`,
      trackId: candidate.id,
      sourceType: 'stream',
      sourceId: candidate.providerContentId,
      sourceUrl: candidate.watchUrl,
      playbackRef: candidate.providerContentId,
      capability: 'metadataOnly',
      status: 'unavailable',
      reliabilityScore: 0.9,
      healthScore: 1.0,
      failureCount: 0,
    };
  }
}

export const spotifyProviderAdapter = SpotifyProviderAdapter.getInstance();
