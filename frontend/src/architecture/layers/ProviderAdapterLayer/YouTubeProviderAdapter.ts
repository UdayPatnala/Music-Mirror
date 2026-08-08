import type { MusicProviderAdapter } from './MusicProviderAdapter';
import type { MusicIntent, MusicCandidate } from '../../types/domain';
import { logger } from '../ObservabilityLayer';

const TRACK_YOUTUBE_IDS: Record<string, string> = {
  "buttabomma": "A6BJ-PgNWXA",
  "samajavaragamana": "E3BnMDc9ATE",
  "ennenno janmala": "_dXwkfq5YG8",
  "ramuloo ramulaa": "K9aQFnq1xv0",
  "inkem inkem inkem kaavale": "HA-Sjb5BCMA",
  "srivalli": "RACf1mY9bJI",
  "naatu naatu": "qfSRDoxzKGA",
  "oo antava": "FHe9nf1azts",
  "jaragandi": "HUJfPpESSWg",
  "josh josh": "VRbSiUuSqBA",
  "vachinde": "2XjJxVLqSgE",
  "kalyana vaibhogame": "cxZe-Jxm5WY",
  "rowdy baby": "0vGcBCBBGGQ",
  "arabic kuthu": "KSELOf81Ecg",
  "vaathi coming": "VK2L7FyXN2Q",
  "kannazhaga": "9oNvxVFsm5U",
  "badtameez dil": "II2EO3Nw4m0",
  "gallan goodiyan": "jCEdTq3j-0U",
  "tum hi ho": "Umqb9KENgmk",
  "kesariya": "BddP6PYo2gs",
  "raataan lambiyan": "hVV2T_H2vHc",
  "dil diyan gallan": "Uu45KY9cT3A",
  "agar tum saath ho": "UPq3OyJAanY",
  "blinding lights": "4NRXx6U8ABQ",
  "levitating": "TUVcZfQe-Kw",
  "can't stop the feeling!": "ru0K8uYEZWw",
  "uptown funk": "OPf0YbXqDm0",
  "happy": "ZbZSe6N_BXs",
  "good as hell": "smDa04GcnzA",
  "walking on sunshine": "iPUmE-tne5U",
  "sugar": "09R8_2nJtjg",
  "sunflower": "ApXoWvfEYVU",
  "don't start now": "oygrmJFKYZY",
  "shake it off": "nfWlot6h_JM",
  "someone like you": "hLQl3WQQoQ0",
  "fix you": "k4V3Mo61hJM",
  "drivers license": "ZmDBbnmKpqQ",
  "all of me": "450p7goxZqg",
  "believer": "7wtfhZwyrYY",
};

export class YouTubeProviderAdapter implements MusicProviderAdapter {
  public getProviderId(): string {
    return 'youtube';
  }

  public getProviderName(): string {
    return 'YouTube Legitimate IFrame Embed';
  }

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async searchCandidates(intent: MusicIntent, limit: number = 10): Promise<MusicCandidate[]> {
    logger.info('YouTubeProviderAdapter', `Querying candidates for intent valence=${intent.targetValence}, energy=${intent.targetEnergy}`);
    
    // Simulate candidate discovery matching intent parameters
    const candidates: MusicCandidate[] = [
      {
        id: 'yt_buttabomma',
        title: 'Buttabomma',
        artist: 'Armaan Malik',
        genre: 'Telugu Pop',
        language: 'Telugu',
        audioFeatures: { valence: 0.92, energy: 0.85, bpm: 120 },
        providerId: 'youtube',
        playbackRef: 'A6BJ-PgNWXA',
        recommendationScore: 0.95,
        recommendationReason: 'High acoustic similarity (95%) · Matches Telugu language preference',
      },
      {
        id: 'yt_samajavaragamana',
        title: 'Samajavaragamana',
        artist: 'Sid Sriram',
        genre: 'Telugu Soul',
        language: 'Telugu',
        audioFeatures: { valence: 0.88, energy: 0.78, bpm: 110 },
        providerId: 'youtube',
        playbackRef: 'E3BnMDc9ATE',
        recommendationScore: 0.92,
        recommendationReason: '92% mood match · Telugu Soul',
      },
      {
        id: 'yt_blinding_lights',
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        genre: 'Synthpop',
        language: 'English',
        audioFeatures: { valence: 0.82, energy: 0.73, bpm: 171 },
        providerId: 'youtube',
        playbackRef: '4NRXx6U8ABQ',
        recommendationScore: 0.88,
        recommendationReason: 'Synthpop energy match',
      },
      {
        id: 'yt_tum_hi_ho',
        title: 'Tum Hi Ho',
        artist: 'Arijit Singh',
        genre: 'Bollywood Ballad',
        language: 'Hindi',
        audioFeatures: { valence: 0.35, energy: 0.40, bpm: 90 },
        providerId: 'youtube',
        playbackRef: 'Umqb9KENgmk',
        recommendationScore: 0.85,
        recommendationReason: 'Reflective mood match · Hindi',
      },
      {
        id: 'yt_rowdy_baby',
        title: 'Rowdy Baby',
        artist: 'Dhanush & Dhee',
        genre: 'Tamil Dance',
        language: 'Tamil',
        audioFeatures: { valence: 0.95, energy: 0.92, bpm: 125 },
        providerId: 'youtube',
        playbackRef: '0vGcBCBBGGQ',
        recommendationScore: 0.90,
        recommendationReason: 'High energy dance match · Tamil',
      },
    ];

    return candidates.slice(0, limit);
  }

  public getPlaybackEmbedUrl(candidate: MusicCandidate): string {
    const videoId = candidate.playbackRef || TRACK_YOUTUBE_IDS[candidate.title.toLowerCase()] || 'A6BJ-PgNWXA';
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
  }
}
