/**
 * Music Mirror — YouTube Provider Adapter
 * Implements the MusicProvider contract for YouTube discovery and metadata.
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
import { VariantClassifier } from './VariantClassifier';
import { isValidVideoId } from './YouTubeDiscoveryService';

export class YouTubeProviderAdapter implements MusicProvider {
  public readonly providerId = 'youtube';
  public readonly displayName = 'YouTube';

  private static instance: YouTubeProviderAdapter | null = null;

  public static getInstance(): YouTubeProviderAdapter {
    if (!this.instance) {
      this.instance = new YouTubeProviderAdapter();
    }
    return this.instance;
  }

  /**
   * Search YouTube for candidate music tracks.
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
      const searchResult = await apiClient.searchYouTubeVideos(
        cleanQuery,
        options?.limit ?? 10,
        options?.expectedDurationMs,
        options?.targetArtist
      );

      const candidates: NormalizedCandidate[] = searchResult.tracks.map(t => {
        const rawVideoId = t.youtubeId || t.primarySource.sourceId || t.id.replace(/^yt_/, '');
        const isPlayable = isValidVideoId(rawVideoId);

        const playability: PlayabilityAssessment = {
          status: isPlayable ? 'PLAYABLE' : 'UNAVAILABLE',
          testedCapability: 'officialEmbed',
          verifiedAt: Date.now(),
          restrictionReason: isPlayable ? undefined : 'Malformed or invalid video ID format',
        };

        const variant = t.variant || VariantClassifier.classify(
          t.title,
          t.metadata.channelName || '',
          Boolean(t.metadata.isVerifiedChannel)
        );

        return {
          id: t.id,
          provider: 'youtube',
          providerContentId: rawVideoId,
          title: t.title,
          rawTitle: t.name || t.title,
          detectedArtist: t.artist !== t.metadata.channelName ? t.artist : null,
          channelName: t.metadata.channelName || t.artist,
          channelIsVerified: t.metadata.isVerifiedChannel,
          durationSeconds: t.metadata.durationSeconds,
          durationFormatted: t.metadata.durationFormatted,
          publishedAt: t.metadata.releaseDate,
          thumbnailUrl: t.artworkUrl,
          watchUrl: t.primarySource.sourceUrl,
          variant,
          playability,
          relevanceScore: t.relevanceScore,
          acousticFeatures: t.acousticFeatures,
        };
      });

      return {
        query: searchResult.query,
        normalizedQuery: searchResult.normalizedQuery,
        providerId: this.providerId,
        candidates,
        totalCandidates: candidates.length,
        sourceType: searchResult.isCached ? 'CACHED_PROVIDER_RESULT' : 'LIVE_PROVIDER_RESULT',
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      throw new ProviderError(
        this.providerId,
        'NETWORK_ERROR',
        err.message || 'YouTube search failed',
        true,
        err
      );
    }
  }

  public async getMetadata(contentId: string): Promise<NormalizedCandidate | null> {
    if (!isValidVideoId(contentId)) {
      throw new ProviderError(
        this.providerId,
        'NOT_FOUND',
        `Invalid YouTube content ID: ${contentId}`,
        false
      );
    }

    const playability = await this.checkPlayability(contentId);

    return {
      id: `yt_${contentId}`,
      provider: this.providerId,
      providerContentId: contentId,
      title: 'YouTube Track',
      rawTitle: 'YouTube Track',
      channelName: 'YouTube Artist',
      durationSeconds: 180,
      durationFormatted: '3:00',
      thumbnailUrl: `https://img.youtube.com/vi/${contentId}/hqdefault.jpg`,
      watchUrl: `https://www.youtube.com/watch?v=${contentId}`,
      variant: 'UNKNOWN',
      playability,
      relevanceScore: 0.85,
    };
  }

  public async checkPlayability(contentId: string): Promise<PlayabilityAssessment> {
    const valid = isValidVideoId(contentId);
    return {
      status: valid ? 'PLAYABLE' : 'UNAVAILABLE',
      testedCapability: 'officialEmbed',
      verifiedAt: Date.now(),
      restrictionReason: valid ? undefined : 'Invalid 11-character video ID',
    };
  }

  public async getPlaybackSource(candidate: NormalizedCandidate): Promise<AudioSource> {
    return {
      id: `src_yt_${candidate.providerContentId}`,
      trackId: candidate.id,
      sourceType: 'youtube',
      sourceId: candidate.providerContentId,
      sourceUrl: candidate.watchUrl || `https://www.youtube.com/watch?v=${candidate.providerContentId}`,
      playbackRef: candidate.providerContentId,
      capability: 'officialEmbed',
      status: candidate.playability.status === 'PLAYABLE' ? 'active' : 'unavailable',
      reliabilityScore: candidate.relevanceScore ?? 0.85,
      healthScore: 1.0,
      failureCount: 0,
    };
  }
}

export const youtubeProviderAdapter = YouTubeProviderAdapter.getInstance();
