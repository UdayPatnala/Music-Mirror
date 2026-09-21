/**
 * Music Mirror — Video Variant & Version Classification Engine
 * Analyzes video title, channel, description, and metadata to classify video content type.
 */

import type { VariantClassification } from '../domain/canonical';

export class VariantClassifier {
  private static readonly LIVE_PATTERNS = [
    /\b(live\s+at|live\s+in\s+concert|live\s+performance|tour\s+20\d\d|unplugged|acoustic\s+live)\b/i,
  ];

  private static readonly REMIX_PATTERNS = [
    /\b(remix|club\s+mix|extended\s+mix|edm\s+mix|vip\s+(remix|mix)|vip\s+mix|dubstep\s+mix|dance\s+remix)\b/i,
  ];

  private static readonly COVER_PATTERNS = [
    /\b(cover\s+by|cover\s+song|tribute|acoustic\s+cover|violin\s+cover|piano\s+cover|guitar\s+cover|remake)\b/i,
  ];

  private static readonly LYRIC_PATTERNS = [
    /\b(lyric\s+video|official\s+lyric\s+video|with\s+lyrics|lyrics)\b/i,
  ];

  private static readonly UNOFFICIAL_PATTERNS = [
    /\b(slowed\s*(\+|&|and)\s*reverb|slowed\s*reverb|bass\s*boosted|nightcore|8d\s*audio|reaction|review|podcast)\b/i,
  ];

  private static readonly OFFICIAL_VIDEO_PATTERNS = [
    /\b(official\s+music\s+video|official\s+video|music\s+video)\b/i,
  ];

  private static readonly OFFICIAL_TRACK_PATTERNS = [
    /\b(official\s+audio|original\s+soundtrack|ost|audio\s+song|full\s+song|studio\s+audio)\b/i,
  ];

  /**
   * Classify a candidate's video variant based on title and channel context.
   */
  public static classify(
    title: string,
    channelName: string = '',
    channelIsTopic: boolean = false,
    channelIsVevo: boolean = false
  ): VariantClassification {
    const cleanTitle = title.trim();
    const cleanChannel = channelName.trim();

    // 1. Topic channel is canonical auto-generated studio track
    if (channelIsTopic || cleanChannel.toLowerCase().endsWith(' - topic')) {
      return 'OFFICIAL_TRACK';
    }

    // 2. Unofficial uploads, modifications, reaction videos
    if (this.UNOFFICIAL_PATTERNS.some(p => p.test(cleanTitle))) {
      return 'UNOFFICIAL_UPLOAD';
    }

    // 3. Covers and remakes
    if (this.COVER_PATTERNS.some(p => p.test(cleanTitle))) {
      return 'COVER';
    }

    // 4. Live concerts and performances
    if (this.LIVE_PATTERNS.some(p => p.test(cleanTitle))) {
      return 'LIVE_VERSION';
    }

    // 5. Remixes and alternate edits
    if (this.REMIX_PATTERNS.some(p => p.test(cleanTitle))) {
      return 'REMIX';
    }

    // 6. Lyric videos
    if (this.LYRIC_PATTERNS.some(p => p.test(cleanTitle))) {
      return 'LYRIC_VIDEO';
    }

    // 7. Official Music Video
    if (channelIsVevo || this.OFFICIAL_VIDEO_PATTERNS.some(p => p.test(cleanTitle))) {
      return 'OFFICIAL_VIDEO';
    }

    // 8. Official Track Audio
    if (this.OFFICIAL_TRACK_PATTERNS.some(p => p.test(cleanTitle))) {
      return 'OFFICIAL_TRACK';
    }

    return 'UNKNOWN';
  }
}
