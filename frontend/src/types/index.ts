export interface UserProfile {
    name: string;
    email: string;
    genre: string;
    goal: string;
}

export interface Song {
    name: string;
    artist: string;
    album_art?: string;
    preview_url?: string;
    spotify_url?: string;
    recommendation_score?: number;
    recommendation_reason?: string;
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
