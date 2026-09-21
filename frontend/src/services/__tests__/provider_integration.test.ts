import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VariantClassifier } from '../VariantClassifier';
import { CanonicalNormalizer } from '../CanonicalNormalizer';
import { youtubePlaybackAdapter } from '../YouTubePlaybackAdapter';
import { youtubeProviderAdapter } from '../YouTubeProviderAdapter';
import type { NormalizedCandidate } from '../../domain/canonical';

describe('Decoupled Provider & Normalization Architecture', () => {

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('VariantClassifier', () => {
    it('classifies topic channels as OFFICIAL_TRACK', () => {
      expect(VariantClassifier.classify('Samajavaragamana', 'Sid Sriram - Topic', true)).toBe('OFFICIAL_TRACK');
      expect(VariantClassifier.classify('Song Title', 'Artist - Topic', false)).toBe('OFFICIAL_TRACK');
    });

    it('classifies official music videos correctly', () => {
      expect(VariantClassifier.classify('Artist - Song (Official Music Video)', 'ArtistVEVO', false, true)).toBe('OFFICIAL_VIDEO');
      expect(VariantClassifier.classify('Song Name [Official Video]', 'Label Records')).toBe('OFFICIAL_VIDEO');
    });

    it('classifies lyric videos', () => {
      expect(VariantClassifier.classify('Song Title (Lyric Video)', 'Artist Channel')).toBe('LYRIC_VIDEO');
      expect(VariantClassifier.classify('Song Title (Official Lyrics)', 'Artist Channel')).toBe('LYRIC_VIDEO');
    });

    it('classifies live performances', () => {
      expect(VariantClassifier.classify('Song Title (Live at Wembley)', 'Artist Channel')).toBe('LIVE_VERSION');
      expect(VariantClassifier.classify('Song Title [Live in Concert]', 'Artist Channel')).toBe('LIVE_VERSION');
    });

    it('classifies remix versions', () => {
      expect(VariantClassifier.classify('Song Title (Club Remix)', 'DJ Mixer')).toBe('REMIX');
      expect(VariantClassifier.classify('Song Title - VIP Mix', 'DJ Mixer')).toBe('REMIX');
    });

    it('classifies covers', () => {
      expect(VariantClassifier.classify('Song Title - Acoustic Cover', 'Indie Singer')).toBe('COVER');
    });

    it('classifies unofficial or nightcore uploads', () => {
      expect(VariantClassifier.classify('Song Title (Nightcore)', 'SpeedUp Audio')).toBe('UNOFFICIAL_UPLOAD');
      expect(VariantClassifier.classify('Song Title (Slowed + Reverb)', 'Chill Guy')).toBe('UNOFFICIAL_UPLOAD');
    });

    it('falls back to UNKNOWN if no patterns match', () => {
      expect(VariantClassifier.classify('Track Title', 'Channel Name')).toBe('UNKNOWN');
    });
  });

  describe('CanonicalNormalizer', () => {
    it('strips bracketed noise and clean titles', () => {
      expect(CanonicalNormalizer.cleanTitle('Samajavaragamana [Official Video] (Full Song)')).toBe('Samajavaragamana');
      expect(CanonicalNormalizer.cleanTitle('Inkem Inkem (Lyric Video)')).toBe('Inkem Inkem');
      expect(CanonicalNormalizer.cleanTitle('Song Title (Slowed + Reverb)')).toBe('Song Title');
    });

    it('splits Artist - Title correctly', () => {
      const split = CanonicalNormalizer.splitArtistTitle('Sid Sriram - Samajavaragamana');
      expect(split).toEqual({ artist: 'Sid Sriram', title: 'Samajavaragamana' });

      const noSplit = CanonicalNormalizer.splitArtistTitle('Just Title Without Separator');
      expect(noSplit).toBeNull();
    });

    it('resolves topic channels to clean artist names', () => {
      const res = CanonicalNormalizer.resolveEntities('Song Title', 'Sid Sriram - Topic', true);
      expect(res.artist).toBe('Sid Sriram');
      expect(res.isPerformingArtist).toBe(true);
    });

    it('identifies record label channels and extracts performing artist from title', () => {
      const res = CanonicalNormalizer.resolveEntities('Sid Sriram - Samajavaragamana (Official Video)', 'Aditya Music', true);
      expect(res.artist).toBe('Sid Sriram');
      expect(res.title).toBe('Samajavaragamana');
      expect(res.isPerformingArtist).toBe(true);
      expect(res.confidence).toBe(0.9);
    });

    it('falls back gracefully when channel is unknown and title has no separator', () => {
      const res = CanonicalNormalizer.resolveEntities('Random Song Title', 'Random User Uploader', false);
      expect(res.artist).toBe('Random User Uploader');
      expect(res.title).toBe('Random Song Title');
      expect(res.isPerformingArtist).toBe(false);
      expect(res.confidence).toBe(0.5);
    });

    it('converts NormalizedCandidate to full canonical Track', () => {
      const candidate: NormalizedCandidate = {
        id: 'yt_dQw4w9WgXcQ',
        provider: 'youtube',
        providerContentId: 'dQw4w9WgXcQ',
        title: 'Never Gonna Give You Up',
        rawTitle: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
        channelName: 'Rick Astley',
        detectedArtist: 'Rick Astley',
        channelIsVerified: true,
        durationSeconds: 213,
        durationFormatted: '3:33',
        variant: 'OFFICIAL_VIDEO',
        playability: {
          status: 'PLAYABLE',
          testedCapability: 'officialEmbed',
          verifiedAt: Date.now(),
        },
      };

      const track = CanonicalNormalizer.candidateToTrack(candidate);
      expect(track.id).toBe('yt_dQw4w9WgXcQ');
      expect(track.artist).toBe('Rick Astley');
      expect(track.title).toBe('Never Gonna Give You Up');
      expect(track.variant).toBe('OFFICIAL_VIDEO');
      expect(track.playability?.status).toBe('PLAYABLE');
      expect(track.metadata.isVerifiedChannel).toBe(true);
    });
  });

  describe('YouTubePlaybackAdapter', () => {
    it('mounts and unmounts player iframe without errors', () => {
      const mockContainer = { innerHTML: '' } as unknown as HTMLElement;
      youtubePlaybackAdapter.mount(mockContainer, 'dQw4w9WgXcQ');

      expect(mockContainer.innerHTML).toContain('iframe id="mm-yt-iframe"');
      expect(mockContainer.innerHTML).toContain('dQw4w9WgXcQ');
      expect(youtubePlaybackAdapter.getCurrentVideoId()).toBe('dQw4w9WgXcQ');

      youtubePlaybackAdapter.unmount(mockContainer);
      expect(mockContainer.innerHTML).toBe('');
      expect(youtubePlaybackAdapter.getCurrentVideoId()).toBeNull();
    });

    it('sends player commands without throwing in headless DOM', () => {
      expect(() => {
        youtubePlaybackAdapter.play();
        youtubePlaybackAdapter.pause();
        youtubePlaybackAdapter.seek(30);
        youtubePlaybackAdapter.setVolume(50);
        youtubePlaybackAdapter.mute();
        youtubePlaybackAdapter.unMute();
      }).not.toThrow();
    });
  });

  describe('YouTubeProviderAdapter', () => {
    it('assesses playability correctly based on video ID format', async () => {
      const valid = await youtubeProviderAdapter.checkPlayability('dQw4w9WgXcQ');
      expect(valid.status).toBe('PLAYABLE');
      expect(valid.testedCapability).toBe('officialEmbed');

      const invalid = await youtubeProviderAdapter.checkPlayability('short_id');
      expect(invalid.status).toBe('UNAVAILABLE');
    });

    it('creates AudioSource with capability officialEmbed', async () => {
      const candidate: NormalizedCandidate = {
        id: 'yt_12345678901',
        provider: 'youtube',
        providerContentId: '12345678901',
        title: 'Test',
        rawTitle: 'Test',
        channelName: 'Channel',
        durationSeconds: 180,
        durationFormatted: '3:00',
        variant: 'UNKNOWN',
        playability: { status: 'PLAYABLE', testedCapability: 'officialEmbed', verifiedAt: Date.now() },
      };

      const source = await youtubeProviderAdapter.getPlaybackSource(candidate);
      expect(source.sourceType).toBe('youtube');
      expect(source.sourceId).toBe('12345678901');
      expect(source.capability).toBe('officialEmbed');
      expect(source.status).toBe('active');
    });
  });
});
