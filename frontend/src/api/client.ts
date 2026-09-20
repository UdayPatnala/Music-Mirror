/**
 * Music Mirror — Unified API Client
 * Robust, typed client for all backend FastAPI endpoints with timeout, error translation, and fallbacks.
 */

import { appConfig } from '../config/appConfig';
import type {
  Track,
  SystemHealth,
  SearchResult,
  RecommendationResult,
} from '../domain/canonical';

export class MusicMirrorApiClient {
  private baseUrl: string;
  private defaultTimeoutMs: number;

  constructor(baseUrl?: string, timeoutMs: number = 8000) {
    this.baseUrl = baseUrl || appConfig.apiBaseUrl;
    this.defaultTimeoutMs = timeoutMs;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    customTimeoutMs?: number
  ): Promise<T> {
    const timeout = customTimeoutMs || this.defaultTimeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    try {
      const fullUrl = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorBody}`);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Request to ${endpoint} timed out after ${timeout}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ─── Health & Observability ────────────────────────────────────────

  public async checkHealth(): Promise<SystemHealth> {
    const start = Date.now();
    try {
      const data = await this.request<{ status: string; service: string; version: string }>('/health', {}, 3000);
      return {
        status: data.status === 'ok' ? 'READY' : 'DEGRADED',
        backendConnected: true,
        databaseHealthy: true,
        activeProvider: 'youtube',
        version: data.version || '2.04.01.0',
        lastCheckedTimestamp: start,
      };
    } catch {
      return {
        status: 'OFFLINE',
        backendConnected: false,
        databaseHealthy: false,
        activeProvider: 'fallback',
        version: '2.06.00.0',
        lastCheckedTimestamp: start,
      };
    }
  }

  // ─── Catalog Search & Exploration ──────────────────────────────────

  public async searchCatalog(params: {
    query?: string;
    genre?: string;
    mood?: string;
    language?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Track[]; total: number; page: number; totalPages: number }> {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set('search', params.query);
    if (params.genre) searchParams.set('genre', params.genre);
    if (params.mood) searchParams.set('mood', params.mood);
    if (params.language) searchParams.set('language', params.language);
    searchParams.set('page', String(params.page || 1));
    searchParams.set('limit', String(params.limit || 20));

    const response = await this.request<{
      items: any[];
      total: number;
      page: number;
      total_pages: number;
    }>(`/api/v2/songs?${searchParams.toString()}`);

    const tracks = (response.items || []).map(this.mapDtoToTrack);
    return {
      items: tracks,
      total: response.total || tracks.length,
      page: response.page || 1,
      totalPages: response.total_pages || 1,
    };
  }

  public async getTrackById(songId: string): Promise<Track> {
    const raw = await this.request<any>(`/api/v2/songs/${encodeURIComponent(songId)}`);
    return this.mapDtoToTrack(raw);
  }

  // ─── YouTube Discovery ─────────────────────────────────────────────

  public async searchYouTubeVideos(
    query: string,
    limit: number = 10,
    expectedDurationMs?: number,
    targetArtist?: string
  ): Promise<SearchResult> {
    const start = Date.now();
    const searchParams = new URLSearchParams({
      query,
      limit: String(Math.max(1, Math.min(25, limit))),
    });
    if (expectedDurationMs) searchParams.set('expected_duration_ms', String(expectedDurationMs));
    if (targetArtist) searchParams.set('target_artist', targetArtist);

    const data = await this.request<{
      query: string;
      normalized_query: string;
      cached: boolean;
      candidates: any[];
      total_candidates: number;
    }>(`/api/v2/songs/youtube-search?${searchParams.toString()}`);

    const tracks: Track[] = (data.candidates || []).map((c: any) => ({
      id: `yt_${c.video_id}`,
      title: c.title,
      normalizedTitle: c.title.toLowerCase().trim(),
      artist: c.channel_name || 'YouTube Artist',
      artists: [c.channel_name || 'YouTube Artist'],
      album: null,
      artworkUrl: c.thumbnail_url || `https://img.youtube.com/vi/${c.video_id}/hqdefault.jpg`,
      metadata: {
        durationSeconds: c.duration_seconds || 180,
        durationFormatted: c.duration_str || '3:00',
        releaseDate: c.published_at,
        genre: 'Discovery',
        canonicalGenres: ['Discovery'],
        language: 'Various',
        isExplicit: false,
        popularity: Math.min(100, Math.round((c.view_count || 50000) / 10000)),
        channelName: c.channel_name,
        isVerifiedChannel: Boolean(c.channel_is_verified || c.channel_is_vevo || c.channel_is_topic),
      },
      acousticFeatures: {
        valence: 0.5,
        energy: 0.5,
        tempo: 120,
      },
      primarySource: {
        id: `src_yt_${c.video_id}`,
        trackId: `yt_${c.video_id}`,
        sourceType: 'youtube',
        sourceId: c.video_id,
        sourceUrl: c.watch_url || `https://www.youtube.com/watch?v=${c.video_id}`,
        playbackRef: c.video_id,
        capability: 'officialEmbed',
        status: 'active',
        reliabilityScore: c.score || 0.85,
        healthScore: 1.0,
        failureCount: 0,
      },
      availableSources: [],
      relevanceScore: c.score,
      recommendationReason: `YouTube discovery rank (${Math.round((c.score || 0.8) * 100)}%)`,
      name: c.title,
      youtubeId: c.video_id,
    }));

    return {
      query: data.query,
      normalizedQuery: data.normalized_query,
      isCached: data.cached,
      tracks,
      totalResults: tracks.length,
      latencyMs: Date.now() - start,
    };
  }

  // ─── Emotion Recommendations ───────────────────────────────────────

  public async getRecommendations(params: {
    emotion: string;
    genre?: string;
    goal?: string;
    languages?: string[];
  }): Promise<RecommendationResult> {
    const data = await this.request<{
      emotion: string;
      normalized_emotion: string;
      songs: any[];
    }>('/recommend', {
      method: 'POST',
      body: JSON.stringify({
        emotion: params.emotion,
        genre: params.genre || 'all',
        goal: params.goal || 'match',
        languages: params.languages || ['Telugu', 'English', 'Tamil', 'Hindi'],
      }),
    });

    const tracks = (data.songs || []).map(this.mapDtoToTrack);
    return {
      emotion: data.emotion,
      normalizedEmotion: data.normalized_emotion,
      goal: params.goal || 'match',
      tracks,
    };
  }

  public async getTransitionJourney(params: {
    startEmotion: string;
    targetEmotion: string;
    steps?: number;
    genre?: string;
  }): Promise<RecommendationResult> {
    const data = await this.request<{
      start_emotion: string;
      target_emotion: string;
      steps: number;
      journey: any[];
    }>('/recommend/transition', {
      method: 'POST',
      body: JSON.stringify({
        start_emotion: params.startEmotion,
        target_emotion: params.targetEmotion,
        steps: params.steps || 3,
        genre: params.genre,
      }),
    });

    const journeyTracks = (data.journey || []).map(this.mapDtoToTrack);
    return {
      emotion: `${data.start_emotion} -> ${data.target_emotion}`,
      normalizedEmotion: data.target_emotion,
      goal: 'transition',
      tracks: journeyTracks,
      journeySteps: journeyTracks,
    };
  }

  // ─── Self-Healing Playback Reports ─────────────────────────────────

  public async submitPlaybackReport(payload: {
    songId: string;
    sourceId?: string;
    reportType: string;
    description?: string;
    errorCode?: string;
  }): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>('/api/v2/reports', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer default_user:default_user@musicmirror.ai:User default_user',
      },
      body: JSON.stringify({
        song_id: payload.songId,
        source_id: payload.sourceId,
        report_type: payload.reportType,
        description: payload.description,
        error_code: payload.errorCode,
      }),
    });
  }

  // ─── Mapping Helper ────────────────────────────────────────────────

  private mapDtoToTrack(raw: any): Track {
    const vId = raw.youtube_id || raw.youtubeId || (raw.preview_url ? '' : 'A6BJ-PgNWXA');
    const artistName = raw.artist_name || (raw.artist && raw.artist.name) || raw.artist || 'Unknown Artist';
    const duration = raw.duration || 180;
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const durStr = raw.duration_str || `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    return {
      id: raw.id || `track_${vId || Math.random().toString(36).substring(7)}`,
      title: raw.title || raw.name || 'Untitled Song',
      normalizedTitle: (raw.normalized_title || raw.title || raw.name || '').toLowerCase().trim(),
      artist: artistName,
      artists: [artistName],
      album: raw.album_title || (raw.album && raw.album.title) || null,
      artworkUrl: raw.cover_image_url || raw.album_art || (vId ? `https://img.youtube.com/vi/${vId}/hqdefault.jpg` : null),
      metadata: {
        durationSeconds: duration,
        durationFormatted: durStr,
        releaseDate: raw.release_date || null,
        genre: raw.genre || 'Pop',
        canonicalGenres: raw.genre ? [raw.genre] : ['Pop'],
        language: raw.language || 'English',
        isExplicit: Boolean(raw.explicit),
        popularity: raw.popularity ?? 80,
        channelName: artistName,
        isVerifiedChannel: true,
      },
      acousticFeatures: {
        valence: raw.valence ?? 0.5,
        energy: raw.energy ?? 0.5,
        tempo: raw.tempo ?? 120,
        danceability: raw.danceability ?? 0.5,
        acousticness: raw.acousticness ?? 0.5,
        instrumentalness: raw.instrumentalness ?? 0.0,
      },
      primarySource: {
        id: `src_${vId || raw.id}`,
        trackId: raw.id,
        sourceType: vId ? 'youtube' : 'stream',
        sourceId: vId || raw.id,
        sourceUrl: vId ? `https://www.youtube.com/watch?v=${vId}` : (raw.audio_url || raw.preview_url),
        playbackRef: vId || raw.audio_url || raw.preview_url || '',
        capability: vId ? 'officialEmbed' : 'directStream',
        status: 'active',
        reliabilityScore: 0.9,
        healthScore: 1.0,
        failureCount: 0,
      },
      availableSources: [],
      relevanceScore: raw.recommendation_score || 0.9,
      recommendationReason: raw.recommendation_reason || `Matched for mood: ${raw.mood || 'general'}`,
      name: raw.title || raw.name,
      youtubeId: vId,
      previewUrl: raw.preview_url || raw.audio_url,
    };
  }
}

export const apiClient = new MusicMirrorApiClient();
