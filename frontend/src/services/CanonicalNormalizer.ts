/**
 * Music Mirror — Canonical Domain Normalizer & Entity Resolution
 * Transforms raw provider candidates into canonical Tracks with provenance tracking.
 */

import type {
  NormalizedCandidate,
  Track,
  MetadataRecord,
  MetadataQualityScore,
} from '../domain/canonical';
import { VariantClassifier } from './VariantClassifier';

const RECORD_LABELS = new Set([
  't-series',
  'tseries',
  'sony music',
  'sony music india',
  'sony music south',
  'sony music entertainment',
  'warner music',
  'warner music india',
  'universal music',
  'universal music group',
  'aditya music',
  'lahari music',
  'zee music',
  'zee music company',
  'zee music south',
  'saregama',
  'saregama music',
  'saregama telugu',
  'yrf',
  'yash raj films',
  'tips official',
  'tips music',
  'speed records',
  'eros now',
  'aditya music telugu',
]);

export interface ExtractedArtistTitle {
  title: string;
  artist: string;
  artists: string[];
}

export class CanonicalNormalizer {
  /**
   * Cleans YouTube video titles by stripping noise tags, video resolution qualifiers, and brackets.
   */
  public static cleanTitle(rawTitle: string): string {
    if (!rawTitle) return '';
    return rawTitle
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      // Strip bracketed qualifiers: [Official Video], (4K), [Full Audio], (Slowed + Reverb), etc.
      .replace(/\[\s*(official|video|audio|music|4k|hd|lyrics?|full|remastered|visualizer|hq|live|slowed|reverb|nightcore).*?\]/gi, '')
      .replace(/\(\s*(official|video|audio|music|4k|hd|lyrics?|full|remastered|visualizer|hq|live|slowed|reverb|nightcore).*?\)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Splits standard "Artist - Title" strings.
   */
  public static splitArtistTitle(text: string): { artist: string; title: string } | null {
    if (!text || !text.includes(' - ')) return null;
    const parts = text.split(' - ');
    if (parts.length >= 2) {
      const artist = parts[0].trim();
      const title = parts.slice(1).join(' - ').trim();
      if (artist.length > 0 && artist.length < 50 && title.length > 0) {
        return { artist, title };
      }
    }
    return null;
  }

  /**
   * Resolves entities with confidence and performing artist flag.
   */
  public static resolveEntities(
    rawTitle: string,
    channelName: string,
    _isVerified: boolean = false
  ): { artist: string; title: string; isPerformingArtist: boolean; confidence: number } {
    const cleanedTitle = this.cleanTitle(rawTitle);
    const cleanChannel = channelName.trim();
    const lowerChannel = cleanChannel.toLowerCase();

    // 1. Topic channel: "Artist - Topic"
    if (lowerChannel.endsWith(' - topic')) {
      const artist = cleanChannel.slice(0, -8).trim();
      return {
        artist,
        title: cleanedTitle,
        isPerformingArtist: true,
        confidence: 0.95,
      };
    }

    // 2. Check title for "Artist - Title"
    const split = this.splitArtistTitle(cleanedTitle);
    const isRecordLabel = RECORD_LABELS.has(lowerChannel) || Array.from(RECORD_LABELS).some(lbl => lowerChannel.includes(lbl));

    if (split) {
      return {
        artist: split.artist,
        title: split.title,
        isPerformingArtist: true,
        confidence: isRecordLabel ? 0.9 : 0.85,
      };
    }

    // 3. If Record Label channel and no separator in title
    if (isRecordLabel) {
      return {
        artist: 'Various Artists',
        title: cleanedTitle,
        isPerformingArtist: false,
        confidence: 0.6,
      };
    }

    // 4. Default fallback to channel name
    return {
      artist: cleanChannel || 'YouTube Artist',
      title: cleanedTitle,
      isPerformingArtist: false,
      confidence: 0.5,
    };
  }

  /**
   * Resolves musical artist versus channel publisher.
   */
  public static resolveArtistAndTitle(rawTitle: string, channelName: string): ExtractedArtistTitle {
    const { artist, title } = this.resolveEntities(rawTitle, channelName);
    const splitArtists = artist
      .split(/,|&|feat\.|ft\./i)
      .map(a => a.trim())
      .filter(Boolean);

    return {
      title,
      artist,
      artists: splitArtists.length > 0 ? splitArtists : [artist],
    };
  }

  /**
   * Transforms a NormalizedCandidate into a canonical domain Track.
   */
  public static candidateToTrack(candidate: NormalizedCandidate): Track {
    const { title, artist, artists } = this.resolveArtistAndTitle(
      candidate.title || candidate.rawTitle,
      candidate.channelName
    );

    const variant = candidate.variant || VariantClassifier.classify(
      candidate.title,
      candidate.channelName,
      candidate.channelIsTopic,
      candidate.channelIsVevo
    );

    const provenance: Record<string, MetadataRecord> = {
      title: {
        field: 'title',
        value: title,
        provider: candidate.provider,
        retrievedAt: Date.now(),
        confidence: 0.95,
      },
      artist: {
        field: 'artist',
        value: artist,
        provider: candidate.provider,
        retrievedAt: Date.now(),
        confidence: artist === 'Various Artists' ? 0.6 : 0.9,
      },
      variant: {
        field: 'variant',
        value: variant,
        provider: candidate.provider,
        retrievedAt: Date.now(),
        confidence: 0.85,
      },
    };

    const quality: MetadataQualityScore = {
      identityConfidence: 0.9,
      artistConfidence: artist === 'Various Artists' ? 0.6 : 0.9,
      albumConfidence: 0.5,
      durationConfidence: candidate.durationSeconds > 0 ? 1.0 : 0.5,
      sourceConfidence: candidate.playability.status === 'PLAYABLE' ? 1.0 : 0.5,
      completeness: 0.85,
      freshness: 1.0,
      overallScore: candidate.relevanceScore ?? 0.85,
    };

    return {
      id: candidate.id,
      title,
      normalizedTitle: title.toLowerCase().trim(),
      artist,
      artists,
      artworkUrl: candidate.thumbnailUrl,
      variant,
      playability: candidate.playability,
      discoverySource: 'LIVE_PROVIDER_RESULT',
      relevanceScore: candidate.relevanceScore,
      metadata: {
        durationSeconds: candidate.durationSeconds,
        durationFormatted: candidate.durationFormatted,
        releaseDate: candidate.publishedAt,
        genre: 'Discovery',
        canonicalGenres: ['Discovery'],
        language: 'Various',
        isExplicit: false,
        popularity: candidate.viewCount ? Math.min(100, Math.round(candidate.viewCount / 10000)) : 80,
        channelName: candidate.channelName,
        isVerifiedChannel: Boolean(candidate.channelIsVerified || (candidate as any).isVerifiedChannel || candidate.channelIsVevo || candidate.channelIsTopic),
      },
      acousticFeatures: candidate.acousticFeatures || {
        valence: 0.5,
        energy: 0.5,
        tempo: 120,
      },
      primarySource: {
        id: `src_${candidate.id}`,
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
      },
      availableSources: [],
      album: candidate.albumName || null,
      isrc: candidate.isrc || null,
      spotifyId: candidate.spotifyId || undefined,
      metadataQuality: quality,
      provenance,
      name: title,
      youtubeId: candidate.providerContentId,
    };
  }
}
