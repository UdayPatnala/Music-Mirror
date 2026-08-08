export * from '../domain/types';

export interface UserProfile {
  name: string;
  email: string;
  genre: string;
  goal: string;
  languages?: string[];
  avatarUrl?: string;
  favoriteArtists?: string[];
  mostPlayedSongs?: Song[];
  savedSongs?: Song[];
  moodHistory?: { emotion: string; timestamp: string }[];
}

export interface Song {
  title?: string;
  name?: string;
  artist: string;
  genre?: string;
  language?: string;
  source_provider?: string;
  album_art?: string;
  preview_url?: string;
  spotify_url?: string;
  youtubeId?: string;
  source?: string;
  valence?: number;
  energy_numeric?: number;
  tempo?: number;
  popularity?: number;
  recommendation_score?: number;
  recommendation_reason?: string;
  note?: string;
  audio_features?: {
    valence: number;
    energy: number;
    tempo: number;
  };
}

export interface RecommendationResponse {
  emotion: string;
  normalized_emotion: string;
  songs: Song[];
}

export interface TransitionRequest {
  start_emotion: string;
  target_emotion: string;
  steps?: number;
  genre?: string;
}

export interface TransitionResponse {
  start_emotion: string;
  target_emotion: string;
  steps: number;
  journey: Song[];
}

export interface LocalTrack {
  id: string;
  name: string;
  artist: string;
  size: number;
  format: string;
  url: string;
  source: string;
  fileObject?: File;
}

export interface FileItem {
  name: string;
  path: string;
  relative_path: string;
  is_dir: boolean;
  size: number;
  modified: number;
  extension: string;
  is_audio: boolean;
}

export interface DirectoryListingResponse {
  current_path: string;
  parent_path: string | null;
  items: FileItem[];
  audio_count: number;
  available_drives?: string[];
}
