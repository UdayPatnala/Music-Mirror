import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spotifyProviderAdapter } from '../SpotifyProviderAdapter';
import { CanonicalNormalizer } from '../CanonicalNormalizer';
import { apiClient } from '../../api/client';
import type { NormalizedCandidate } from '../../domain/canonical';

describe('Spotify Secondary Provider Integration', () => {

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('SpotifyProviderAdapter Search & Normalization', () => {
    it('normalizes Spotify search results into NormalizedCandidates', async () => {
      vi.spyOn(apiClient, 'searchSpotify').mockResolvedValue({
        query: 'Blinding Lights',
        total: 1,
        tracks: [
          {
            id: 'sp_track123',
            name: 'Blinding Lights',
            artists: ['The Weeknd'],
            album_name: 'After Hours',
            release_date: '2020-03-20',
            duration_ms: 200000,
            isrc: 'USUM71900012',
            popularity: 95,
            artwork_url: 'https://i.scdn.co/image/ab67616d0000b273',
            spotify_url: 'https://open.spotify.com/track/sp_track123',
          },
        ],
      });

      const res = await spotifyProviderAdapter.search('Blinding Lights', { limit: 1 });
      expect(res.providerId).toBe('spotify');
      expect(res.candidates.length).toBe(1);

      const cand = res.candidates[0];
      expect(cand.id).toBe('sp_sp_track123');
      expect(cand.title).toBe('Blinding Lights');
      expect(cand.detectedArtist).toBe('The Weeknd');
      expect(cand.durationSeconds).toBe(200);
      expect(cand.durationFormatted).toBe('3:20');
      expect(cand.isrc).toBe('USUM71900012');
      expect(cand.albumName).toBe('After Hours');
      expect(cand.variant).toBe('OFFICIAL_TRACK');

      // Crucial: playability is explicitly decoupled from metadata availability
      expect(cand.playability.status).toBe('UNAVAILABLE');
      expect(cand.playability.testedCapability).toBe('metadataOnly');
    });

    it('handles empty or blank search queries gracefully', async () => {
      const res = await spotifyProviderAdapter.search('   ');
      expect(res.candidates).toEqual([]);
      expect(res.totalCandidates).toBe(0);
    });

    it('assesses playability as UNAVAILABLE for playback delegation', async () => {
      const playability = await spotifyProviderAdapter.checkPlayability('sp_track123');
      expect(playability.status).toBe('UNAVAILABLE');
      expect(playability.testedCapability).toBe('metadataOnly');
    });

    it('creates AudioSource with metadataOnly capability and unavailable status', async () => {
      const mockCandidate: NormalizedCandidate = {
        id: 'sp_test',
        provider: 'spotify',
        providerContentId: 'test_id',
        title: 'Song Title',
        rawTitle: 'Artist - Song Title',
        channelName: 'Artist',
        durationSeconds: 180,
        durationFormatted: '3:00',
        variant: 'OFFICIAL_TRACK',
        playability: { status: 'UNAVAILABLE', testedCapability: 'metadataOnly', verifiedAt: Date.now() },
      };

      const source = await spotifyProviderAdapter.getPlaybackSource(mockCandidate);
      expect(source.sourceType).toBe('stream');
      expect(source.capability).toBe('metadataOnly');
      expect(source.status).toBe('unavailable');
    });
  });

  describe('Canonical Track Conversion with Spotify Provenance', () => {
    it('converts a Spotify candidate into a canonical Track preserving ISRC and album', () => {
      const candidate: NormalizedCandidate = {
        id: 'sp_test123',
        provider: 'spotify',
        providerContentId: 'test123',
        title: 'Save Your Tears',
        rawTitle: 'The Weeknd - Save Your Tears',
        detectedArtist: 'The Weeknd',
        channelName: 'The Weeknd',
        durationSeconds: 215,
        durationFormatted: '3:35',
        variant: 'OFFICIAL_TRACK',
        spotifyId: 'test123',
        isrc: 'USUM72000045',
        albumName: 'After Hours',
        playability: { status: 'UNAVAILABLE', testedCapability: 'metadataOnly', verifiedAt: Date.now() },
      };

      const track = CanonicalNormalizer.candidateToTrack(candidate);
      expect(track.id).toBe('sp_test123');
      expect(track.title).toBe('Save Your Tears');
      expect(track.artist).toBe('The Weeknd');
      expect(track.album).toBe('After Hours');
      expect(track.isrc).toBe('USUM72000045');
      expect(track.spotifyId).toBe('test123');
      expect(track.playability?.status).toBe('UNAVAILABLE');
    });
  });
});
