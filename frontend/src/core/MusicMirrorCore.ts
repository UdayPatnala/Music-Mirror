/**
 * Music Mirror — Headless Application Core Service
 * Central coordinator for search, playback engine, queue management, provider resolution,
 * failover ladder, and observability. Runs independently of any UI layer.
 */

import { apiClient } from '../api/client';
import type {
  Track,
  PlaybackState,
  QueueState,
  UserPreferences,
  SearchResult,
  RecommendationResult,
  SystemHealth,
} from '../domain/canonical';
import { YouTubeRecoveryEngine } from '../services/YouTubeRecoveryEngine';
import { offlineAudioCache } from '../services/OfflineAudioCache';
import type { CacheStats } from '../services/OfflineAudioCache';
import { audioDspEngine } from '../services/AudioDspEngine';
import type { AcousticFeatures, AcousticValidationResult } from '../services/AudioDspEngine';

export type PlaybackStateListener = (state: PlaybackState) => void;
export type QueueListener = (queue: QueueState) => void;

// Safe synthetic offline audio tone (silent 2-second valid WAV base64) for resilient offline testing
export const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';

/**
 * Procedurally generates a short, loopable musical audio WAV (8-bit mono PCM)
 * matching the emotional valence and energy profile.
 */
export function createHarmonicWavUri(valence: number = 0.5, energy: number = 0.5, durationSec: number = 3): string {
  const sampleRate = 8000;
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // 'RIFF'
  view.setUint32(4, 36 + numSamples, true);
  view.setUint32(8, 0x57415645, false); // 'WAVE'
  view.setUint32(12, 0x666d7420, false); // 'fmt '
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // Byte rate (sampleRate * 1 * 1)
  view.setUint16(32, 1, true); // Block align
  view.setUint16(34, 8, true); // 8 bits per sample
  view.setUint32(36, 0x64617461, false); // 'data'
  view.setUint32(40, numSamples, true);

  const isMajor = valence >= 0.45;
  const f1 = 261.63; // C4
  const f2 = isMajor ? 329.63 : 311.13; // E4 or Eb4
  const f3 = 392.00; // G4
  const f4 = isMajor ? 523.25 : 466.16; // C5 or Bb4
  const amp = 20 + Math.round(Math.min(1, Math.max(0, energy)) * 22);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.sin((Math.PI * i) / numSamples);
    const wave =
      Math.sin(2 * Math.PI * f1 * t) * 0.40 +
      Math.sin(2 * Math.PI * f2 * t) * 0.30 +
      Math.sin(2 * Math.PI * f3 * t) * 0.20 +
      Math.sin(2 * Math.PI * f4 * t) * 0.10;
    const sampleVal = Math.min(255, Math.max(0, Math.round(128 + wave * amp * envelope)));
    view.setUint8(44 + i, sampleVal);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  return `data:audio/wav;base64,${base64}`;
}

export class MusicMirrorCore {
  private static instance: MusicMirrorCore | null = null;

  private playbackState: PlaybackState = {
    status: 'IDLE',
    currentTrack: null,
    nextTrack: null,
    currentTimeSeconds: 0,
    durationSeconds: 0,
    progressPercent: 0,
    volumePercent: 80,
    isMuted: false,
    isPlaying: false,
    isBuffering: false,
    activeProviderId: 'youtube',
    error: null,
    sequenceToken: 0,
  };

  private queueState: QueueState = {
    items: [],
    currentIndex: -1,
    history: [],
    maxHistorySize: 30,
    repeatMode: 'off',
    shuffle: false,
  };

  private preferences: UserPreferences = {
    userId: 'default_user',
    name: 'Guest Listener',
    email: 'guest@musicmirror.ai',
    preferredGenres: ['Telugu Pop', 'Pop', 'Synthpop'],
    preferredLanguages: ['Telugu', 'English'],
    preferredMoods: ['happy', 'calm', 'neutral'],
    preferredArtists: ['Sid Sriram', 'Armaan Malik', 'Anirudh Ravichander', 'The Weeknd'],
    musicGoal: 'match',
    discoveryMode: 'balanced',
    volume: 80,
    autoPlay: true,
    theme: 'dark',
  };

  private listeners: Set<PlaybackStateListener> = new Set();
  private queueListeners: Set<QueueListener> = new Set();
  private htmlAudio: HTMLAudioElement | null = null;
  private progressInterval: any = null;
  private recoveryEngine: YouTubeRecoveryEngine | null = null;
  private isInitialized: boolean = false;
  private mountElementId: string | null = null;
  private activeSearchToken: number = 0;

  public getMountElementId(): string | null {
    return this.mountElementId;
  }

  public getRecoveryEngine(): YouTubeRecoveryEngine | null {
    return this.recoveryEngine;
  }

  public getActiveSearchToken(): number {
    return this.activeSearchToken;
  }

  private constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.htmlAudio = new Audio();
        this.htmlAudio.preload = 'auto';
        this.setupAudioListeners();
      } catch {
        // Headless test environment
      }
    }
  }

  public static getInstance(): MusicMirrorCore {
    if (!MusicMirrorCore.instance) {
      MusicMirrorCore.instance = new MusicMirrorCore();
    }
    return MusicMirrorCore.instance;
  }

  // ─── Lifecycle & Initialization ────────────────────────────────────

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.updatePlaybackState({ status: 'READY' });
  }

  public bindYouTubeContainer(elementId: string): void {
    this.mountElementId = elementId;
  }

  public subscribe(listener: PlaybackStateListener): () => void {
    this.listeners.add(listener);
    listener(this.playbackState);
    return () => this.listeners.delete(listener);
  }

  public subscribeQueue(listener: QueueListener): () => void {
    this.queueListeners.add(listener);
    listener(this.queueState);
    return () => this.queueListeners.delete(listener);
  }

  // ─── Core Search & Discovery ───────────────────────────────────────

  public async searchTracks(query: string, limit: number = 10): Promise<SearchResult> {
    const searchToken = ++this.activeSearchToken;
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return {
        query: '',
        normalizedQuery: '',
        isCached: false,
        tracks: [],
        totalResults: 0,
        latencyMs: 0,
      };
    }

    let result: SearchResult;
    try {
      // First attempt real YouTube discovery from backend
      result = await apiClient.searchYouTubeVideos(cleanQuery, limit);
    } catch {
      // Fallback: search local database catalog
      try {
        const catalogResults = await apiClient.searchCatalog({ query: cleanQuery, limit });
        result = {
          query: cleanQuery,
          normalizedQuery: cleanQuery.toLowerCase(),
          isCached: false,
          tracks: catalogResults.items,
          totalResults: catalogResults.total,
          latencyMs: 10,
        };
      } catch {
        // Second fallback: search persistent client-side OfflineAudioCache
        const offlineTracks = await offlineAudioCache.searchTracks(cleanQuery);
        if (offlineTracks.length > 0) {
          result = {
            query: cleanQuery,
            normalizedQuery: cleanQuery.toLowerCase(),
            isCached: true,
            tracks: offlineTracks.slice(0, limit),
            totalResults: offlineTracks.length,
            latencyMs: 1,
          };
        } else {
          // Third fallback: Built-in resilient offline fallback catalog
          const fallbackTracks = this.getBuiltInFallbackTracks(cleanQuery, limit);
          result = {
            query: cleanQuery,
            normalizedQuery: cleanQuery.toLowerCase(),
            isCached: true,
            tracks: fallbackTracks,
            totalResults: fallbackTracks.length,
            latencyMs: 1,
          };
        }
      }
    }

    // Guard against stale async responses overwriting newer searches
    if (searchToken !== this.activeSearchToken) {
      return {
        query: cleanQuery,
        normalizedQuery: cleanQuery.toLowerCase(),
        isCached: false,
        tracks: [],
        totalResults: 0,
        latencyMs: 0,
      };
    }

    return result;
  }

  public async getTrack(id: string): Promise<Track> {
    try {
      return await apiClient.getTrackById(id);
    } catch {
      const fallback = this.getBuiltInFallbackTracks(id, 1);
      return fallback[0];
    }
  }

  public async getRecommendations(emotion: string, goal: string = 'match'): Promise<RecommendationResult> {
    try {
      return await apiClient.getRecommendations({
        emotion,
        goal,
        languages: this.preferences.preferredLanguages,
      });
    } catch {
      // Graceful offline fallback to built-in acoustic candidate pool
      const tracks = this.getBuiltInFallbackTracks(emotion, 6);
      return {
        emotion,
        normalizedEmotion: emotion.toLowerCase(),
        goal,
        tracks,
      };
    }
  }

  public async getTransitionJourney(startEmotion: string, targetEmotion: string, steps: number = 3): Promise<RecommendationResult> {
    try {
      return await apiClient.getTransitionJourney({
        startEmotion,
        targetEmotion,
        steps,
        genre: this.preferences.preferredGenres[0],
      });
    } catch {
      // Graceful offline fallback for transition journey
      const tracks = this.getBuiltInFallbackTracks(`${startEmotion} to ${targetEmotion}`, steps);
      return {
        emotion: startEmotion,
        normalizedEmotion: startEmotion.toLowerCase(),
        goal: 'regulate',
        tracks,
        journeySteps: tracks,
      };
    }
  }

  public getBuiltInFallbackTracks(_queryOrEmotion: string, limit: number = 6): Track[] {
    const fallbackSeed: Track[] = [
      {
        id: 'fb_gentle_breeze',
        title: 'Gentle Breeze',
        normalizedTitle: 'gentle breeze',
        artist: 'Acoustic Calm',
        artists: ['Acoustic Calm'],
        album: 'Peaceful Moments',
        duration: 180,
        metadata: {
          durationSeconds: 180,
          durationFormatted: '3:00',
          genre: 'Acoustic Ambient',
          canonicalGenres: ['Acoustic Ambient', 'Relaxation'],
          language: 'Instrumental',
          isExplicit: false,
          popularity: 85,
        },
        primarySource: {
          id: 'src_fb_gentle_breeze',
          trackId: 'fb_gentle_breeze',
          sourceType: 'fallback',
          sourceId: 'fallback_gentle_breeze',
          playbackRef: createHarmonicWavUri(0.50, 0.35),
          capability: 'directStream',
          status: 'active',
          reliabilityScore: 1.0,
          healthScore: 1.0,
          failureCount: 0,
        },
        availableSources: [],
        acousticFeatures: {
          valence: 0.50,
          energy: 0.35,
          tempo: 75,
        },
      },
      {
        id: 'fb_upbeat_morning',
        title: 'Upbeat Morning',
        normalizedTitle: 'upbeat morning',
        artist: 'Bright Horizons',
        artists: ['Bright Horizons'],
        album: 'Morning Energy',
        duration: 165,
        metadata: {
          durationSeconds: 165,
          durationFormatted: '2:45',
          genre: 'Pop Instrumental',
          canonicalGenres: ['Pop Instrumental', 'Upbeat'],
          language: 'Instrumental',
          isExplicit: false,
          popularity: 90,
        },
        primarySource: {
          id: 'src_fb_upbeat_morning',
          trackId: 'fb_upbeat_morning',
          sourceType: 'fallback',
          sourceId: 'fallback_upbeat_morning',
          playbackRef: createHarmonicWavUri(0.85, 0.80),
          capability: 'directStream',
          status: 'active',
          reliabilityScore: 1.0,
          healthScore: 1.0,
          failureCount: 0,
        },
        availableSources: [],
        acousticFeatures: {
          valence: 0.85,
          energy: 0.80,
          tempo: 124,
        },
      },
      {
        id: 'fb_midnight_reflection',
        title: 'Midnight Reflection',
        normalizedTitle: 'midnight reflection',
        artist: 'Lunar Echoes',
        artists: ['Lunar Echoes'],
        album: 'Night Waves',
        duration: 210,
        metadata: {
          durationSeconds: 210,
          durationFormatted: '3:30',
          genre: 'Melancholy Ambient',
          canonicalGenres: ['Ambient', 'Reflective'],
          language: 'Instrumental',
          isExplicit: false,
          popularity: 80,
        },
        primarySource: {
          id: 'src_fb_midnight_reflection',
          trackId: 'fb_midnight_reflection',
          sourceType: 'fallback',
          sourceId: 'fallback_midnight_reflection',
          playbackRef: createHarmonicWavUri(0.25, 0.20),
          capability: 'directStream',
          status: 'active',
          reliabilityScore: 1.0,
          healthScore: 1.0,
          failureCount: 0,
        },
        availableSources: [],
        acousticFeatures: {
          valence: 0.25,
          energy: 0.20,
          tempo: 65,
        },
      },
      {
        id: 'fb_solitude_piano',
        title: 'Solitude in C Minor',
        normalizedTitle: 'solitude in c minor',
        artist: 'Elena Rostova',
        artists: ['Elena Rostova'],
        album: 'Classical Horizons',
        duration: 195,
        metadata: {
          durationSeconds: 195,
          durationFormatted: '3:15',
          genre: 'Neoclassical Piano',
          canonicalGenres: ['Classical', 'Piano'],
          language: 'Instrumental',
          isExplicit: false,
          popularity: 88,
        },
        primarySource: {
          id: 'src_fb_solitude_piano',
          trackId: 'fb_solitude_piano',
          sourceType: 'fallback',
          sourceId: 'fallback_solitude_piano',
          playbackRef: createHarmonicWavUri(0.35, 0.30),
          capability: 'directStream',
          status: 'active',
          reliabilityScore: 1.0,
          healthScore: 1.0,
          failureCount: 0,
        },
        availableSources: [],
        acousticFeatures: {
          valence: 0.35,
          energy: 0.30,
          tempo: 70,
        },
      },
      {
        id: 'fb_cosmic_harmony',
        title: 'Cosmic Harmony',
        normalizedTitle: 'cosmic harmony',
        artist: 'Aura Sphere',
        artists: ['Aura Sphere'],
        album: 'Deep Space Reverie',
        duration: 240,
        metadata: {
          durationSeconds: 240,
          durationFormatted: '4:00',
          genre: 'Electronic Ambient',
          canonicalGenres: ['Electronic', 'Ambient', 'Focus'],
          language: 'Instrumental',
          isExplicit: false,
          popularity: 82,
        },
        primarySource: {
          id: 'src_fb_cosmic_harmony',
          trackId: 'fb_cosmic_harmony',
          sourceType: 'fallback',
          sourceId: 'fallback_cosmic_harmony',
          playbackRef: createHarmonicWavUri(0.60, 0.50),
          capability: 'directStream',
          status: 'active',
          reliabilityScore: 1.0,
          healthScore: 1.0,
          failureCount: 0,
        },
        availableSources: [],
        acousticFeatures: {
          valence: 0.60,
          energy: 0.50,
          tempo: 100,
        },
      },
    ];

    return fallbackSeed.slice(0, limit);
  }

  // ─── Playback Engine Operations ────────────────────────────────────

  public async play(track?: Track): Promise<void> {
    const token = ++this.playbackState.sequenceToken;

    if (track) {
      // If a specific track is requested, add or locate in queue
      this.setTrackAsActive(track);
    } else if (!this.playbackState.currentTrack && this.queueState.items.length > 0) {
      this.setTrackAsActive(this.queueState.items[0]);
    }

    const activeTrack = this.playbackState.currentTrack;
    if (!activeTrack) {
      this.updatePlaybackState({
        status: 'ERROR',
        error: {
          category: 'PLAYBACK_ERROR',
          code: 'NO_ACTIVE_TRACK',
          message: 'No track selected or available in queue to play',
          recoverable: true,
          timestamp: Date.now(),
        },
      });
      return;
    }

    this.updatePlaybackState({
      status: 'LOADING',
      isBuffering: true,
      error: null,
    });

    try {
      // Check for audio source type
      const source = activeTrack.primarySource;

      if (source && source.sourceType === 'youtube' && source.sourceId) {
        // Pause any HTML5 Audio
        if (this.htmlAudio) {
          this.htmlAudio.pause();
        }
        // Play via YouTube embed
        if (typeof document !== 'undefined') {
          const containerId = this.mountElementId || 'youtube-player-container';
          const container = document.getElementById(containerId);
          if (container) {
            const embedUrl = `https://www.youtube-nocookie.com/embed/${source.sourceId}?autoplay=1&enablejsapi=1`;
            container.innerHTML = `<iframe id="mm-yt-iframe" src="${embedUrl}" width="100%" height="100%" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%; height:100%; min-height:240px; border:none; border-radius:8px;"></iframe>`;
          }
        }
        this.startSimulatedPlayback(token, activeTrack.metadata.durationSeconds || 180);
      } else {
        // Clear YouTube iframe if previous track was YouTube
        if (typeof document !== 'undefined') {
          const containerId = this.mountElementId || 'youtube-player-container';
          const container = document.getElementById(containerId);
          if (container) {
            container.innerHTML = '';
          }
        }
        // Play via HTML5 Audio with audible procedural fallback synthesis
        const audioSrc =
          activeTrack.previewUrl ||
          source?.playbackRef ||
          source?.sourceUrl ||
          createHarmonicWavUri(activeTrack.acousticFeatures?.valence ?? 0.5, activeTrack.acousticFeatures?.energy ?? 0.5);

        if (this.htmlAudio) {
          audioDspEngine.connectElement(this.htmlAudio);
          audioDspEngine.resumeContext().catch(() => {});
          this.htmlAudio.loop = true;
          this.htmlAudio.src = audioSrc;
          this.htmlAudio.volume = this.playbackState.isMuted ? 0 : this.playbackState.volumePercent / 100;
          await this.htmlAudio.play().catch(() => {
            // Autoplay blocked by browser policy: handled gracefully
            this.updatePlaybackState({
              status: 'READY',
              isPlaying: false,
              isBuffering: false,
            });
          });
        }
        this.startProgressTicker(token);
        this.updatePlaybackState({
          status: 'PLAYING',
          isPlaying: true,
          isBuffering: false,
        });
      }
    } catch (playErr: any) {
      this.handlePlaybackFailure(playErr.message || 'Playback failed');
    }
  }

  public async pause(): Promise<void> {
    if (this.htmlAudio) {
      this.htmlAudio.pause();
    }
    if (typeof document !== 'undefined') {
      const iframe = document.getElementById('mm-yt-iframe') as HTMLIFrameElement | null;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
      }
    }
    this.stopProgressTicker();
    this.updatePlaybackState({
      status: 'PAUSED',
      isPlaying: false,
      isBuffering: false,
    });
  }

  public async resume(): Promise<void> {
    if (this.playbackState.currentTrack) {
      const source = this.playbackState.currentTrack.primarySource;
      if (source && source.sourceType === 'youtube' && source.sourceId) {
        if (typeof document !== 'undefined') {
          const iframe = document.getElementById('mm-yt-iframe') as HTMLIFrameElement | null;
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
          }
        }
        this.startSimulatedPlayback(this.playbackState.sequenceToken, this.playbackState.durationSeconds || 180);
      } else if (this.htmlAudio) {
        audioDspEngine.resumeContext().catch(() => {});
        await this.htmlAudio.play().catch(() => {});
        this.startProgressTicker(this.playbackState.sequenceToken);
        this.updatePlaybackState({
          status: 'PLAYING',
          isPlaying: true,
          isBuffering: false,
        });
      } else {
        await this.play();
      }
    }
  }

  public stop(): void {
    if (this.htmlAudio) {
      this.htmlAudio.pause();
      this.htmlAudio.currentTime = 0;
      this.htmlAudio.loop = false;
    }
    if (typeof document !== 'undefined') {
      const containerId = this.mountElementId || 'youtube-player-container';
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '';
      }
    }
    this.stopProgressTicker();
    this.updatePlaybackState({
      status: 'STOPPED',
      isPlaying: false,
      isBuffering: false,
      currentTimeSeconds: 0,
      progressPercent: 0,
    });
  }

  public async seek(seconds: number): Promise<void> {
    const dur = this.playbackState.durationSeconds || 180;
    const clamped = Math.max(0, Math.min(seconds, dur));

    if (this.htmlAudio) {
      try {
        this.htmlAudio.currentTime = clamped;
      } catch {
        // ignore
      }
    }
    if (typeof document !== 'undefined') {
      const iframe = document.getElementById('mm-yt-iframe') as HTMLIFrameElement | null;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [clamped, true] }), '*');
      }
    }

    const pct = dur > 0 ? Math.round((clamped / dur) * 100) : 0;
    this.updatePlaybackState({
      currentTimeSeconds: clamped,
      progressPercent: pct,
    });
  }

  public setVolume(volumePercent: number): void {
    const clamped = Math.max(0, Math.min(100, volumePercent));
    if (this.htmlAudio) {
      this.htmlAudio.volume = this.playbackState.isMuted ? 0 : clamped / 100;
    }
    if (typeof document !== 'undefined') {
      const iframe = document.getElementById('mm-yt-iframe') as HTMLIFrameElement | null;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [clamped] }), '*');
      }
    }
    this.preferences.volume = clamped;
    this.updatePlaybackState({ volumePercent: clamped });
  }

  public toggleMute(): void {
    const nextMuted = !this.playbackState.isMuted;
    if (this.htmlAudio) {
      this.htmlAudio.muted = nextMuted;
      this.htmlAudio.volume = nextMuted ? 0 : this.playbackState.volumePercent / 100;
    }
    if (typeof document !== 'undefined') {
      const iframe = document.getElementById('mm-yt-iframe') as HTMLIFrameElement | null;
      if (iframe?.contentWindow) {
        const func = nextMuted ? 'mute' : 'unMute';
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
      }
    }
    this.updatePlaybackState({ isMuted: nextMuted });
  }

  public async next(): Promise<void> {
    if (this.queueState.items.length === 0) return;

    let nextIndex = this.queueState.currentIndex + 1;
    if (nextIndex >= this.queueState.items.length) {
      if (this.queueState.repeatMode === 'all') {
        nextIndex = 0;
      } else {
        this.stop();
        this.updatePlaybackState({ status: 'ENDED' });
        return;
      }
    }

    this.queueState.currentIndex = nextIndex;
    const nextTrack = this.queueState.items[nextIndex];
    this.notifyQueueListeners();
    await this.play(nextTrack);
  }

  public async previous(): Promise<void> {
    if (this.queueState.items.length === 0) return;

    if (this.playbackState.currentTimeSeconds > 3) {
      // If played for > 3s, previous restarts the current track
      await this.seek(0);
      return;
    }

    let prevIndex = this.queueState.currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = 0;
    }

    this.queueState.currentIndex = prevIndex;
    const prevTrack = this.queueState.items[prevIndex];
    this.notifyQueueListeners();
    await this.play(prevTrack);
  }

  // ─── Queue Operations ──────────────────────────────────────────────

  public addToQueue(track: Track): void {
    this.queueState.items.push(track);
    if (this.queueState.currentIndex === -1) {
      this.queueState.currentIndex = 0;
      this.playbackState.currentTrack = track;
    }
    this.updateNextCandidate();
    this.notifyQueueListeners();
  }

  public removeFromQueue(idOrIndex: string | number): void {
    let indexToRemove = -1;
    if (typeof idOrIndex === 'number') {
      indexToRemove = idOrIndex;
    } else {
      indexToRemove = this.queueState.items.findIndex(t => t.id === idOrIndex);
    }

    if (indexToRemove < 0 || indexToRemove >= this.queueState.items.length) return;

    this.queueState.items.splice(indexToRemove, 1);

    if (indexToRemove < this.queueState.currentIndex) {
      this.queueState.currentIndex--;
    } else if (indexToRemove === this.queueState.currentIndex) {
      if (this.queueState.items.length > 0) {
        this.queueState.currentIndex = Math.min(this.queueState.currentIndex, this.queueState.items.length - 1);
        this.playbackState.currentTrack = this.queueState.items[this.queueState.currentIndex];
      } else {
        this.queueState.currentIndex = -1;
        this.playbackState.currentTrack = null;
        this.stop();
      }
    }

    this.updateNextCandidate();
    this.notifyQueueListeners();
  }

  public clearQueue(): void {
    this.stop();
    this.queueState.items = [];
    this.queueState.currentIndex = -1;
    this.playbackState.currentTrack = null;
    this.playbackState.nextTrack = null;
    this.notifyQueueListeners();
    this.updatePlaybackState({
      status: 'IDLE',
      currentTrack: null,
      nextTrack: null,
      currentTimeSeconds: 0,
      progressPercent: 0,
    });
  }

  public getQueue(): QueueState {
    return { ...this.queueState, items: [...this.queueState.items] };
  }

  public getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  public checkHealth(): Promise<SystemHealth> {
    return apiClient.checkHealth();
  }

  public getOfflineCacheStats(): Promise<CacheStats> {
    return offlineAudioCache.getStats();
  }

  public clearOfflineCache(): Promise<void> {
    return offlineAudioCache.clear();
  }

  public getAcousticDspMetrics(): AcousticFeatures {
    return audioDspEngine.analyzeFrame();
  }

  public validateTrackAcoustics(expectedEnergy: number): AcousticValidationResult {
    return audioDspEngine.validateAcoustics(expectedEnergy, audioDspEngine.analyzeFrame());
  }

  // ─── Automated Failover Recovery Ladder ────────────────────────────

  public reportFailure(errorCode?: string): void {
    const active = this.playbackState.currentTrack;
    if (!active) return;

    // Report problem to backend self-healing system asynchronously
    apiClient.submitPlaybackReport({
      songId: active.id,
      sourceId: active.primarySource?.sourceId,
      reportType: 'NOT_PLAYING',
      errorCode: errorCode || 'AUTO_RECOVERY_TRIGGERED',
    }).catch(() => {});

    // Sequential fallback: advance to next candidate in queue
    if (this.queueState.currentIndex < this.queueState.items.length - 1) {
      this.next();
    } else {
      this.updatePlaybackState({
        status: 'ERROR',
        error: {
          category: 'PROVIDER_ERROR',
          code: 'POOL_EXHAUSTED',
          message: 'All available track sources failed or are restricted. No playable audio available.',
          recoverable: true,
          timestamp: Date.now(),
        },
      });
    }
  }

  public resetState(): void {
    this.stop();
    this.queueState = {
      items: [],
      currentIndex: -1,
      history: [],
      maxHistorySize: 30,
      repeatMode: 'off',
      shuffle: false,
    };
    this.playbackState = {
      status: 'IDLE',
      currentTrack: null,
      nextTrack: null,
      currentTimeSeconds: 0,
      durationSeconds: 0,
      progressPercent: 0,
      volumePercent: 80,
      isMuted: false,
      isPlaying: false,
      isBuffering: false,
      activeProviderId: 'youtube',
      error: null,
      sequenceToken: 0,
    };
    this.notifyListeners();
    this.notifyQueueListeners();
  }

  // ─── Internal Helpers ──────────────────────────────────────────────

  private setTrackAsActive(track: Track): void {
    const existingIdx = this.queueState.items.findIndex(t => t.id === track.id);
    if (existingIdx >= 0) {
      this.queueState.currentIndex = existingIdx;
    } else {
      this.queueState.items.push(track);
      this.queueState.currentIndex = this.queueState.items.length - 1;
    }

    // Add to history
    if (!this.queueState.history.includes(track.id)) {
      this.queueState.history.unshift(track.id);
      if (this.queueState.history.length > this.queueState.maxHistorySize) {
        this.queueState.history.pop();
      }
    }

    this.playbackState.currentTrack = track;
    this.playbackState.durationSeconds = track.metadata.durationSeconds || 180;
    this.playbackState.currentTimeSeconds = 0;
    this.playbackState.progressPercent = 0;
    this.updateNextCandidate();
    this.notifyQueueListeners();

    // Persist verified track metadata to client-side offline audio cache
    offlineAudioCache.saveTrack(track).catch(() => {});
  }

  private updateNextCandidate(): void {
    if (this.queueState.currentIndex >= 0 && this.queueState.currentIndex < this.queueState.items.length - 1) {
      this.playbackState.nextTrack = this.queueState.items[this.queueState.currentIndex + 1];
    } else {
      this.playbackState.nextTrack = null;
    }
  }

  private startSimulatedPlayback(token: number, duration: number): void {
    this.stopProgressTicker();
    this.updatePlaybackState({
      status: 'PLAYING',
      isPlaying: true,
      isBuffering: false,
      durationSeconds: duration,
    });

    this.progressInterval = setInterval(() => {
      if (token !== this.playbackState.sequenceToken) {
        this.stopProgressTicker();
        return;
      }
      if (!this.playbackState.isPlaying) return;

      const nextSec = this.playbackState.currentTimeSeconds + 1;
      if (nextSec >= this.playbackState.durationSeconds) {
        this.next();
      } else {
        const pct = Math.round((nextSec / this.playbackState.durationSeconds) * 100);
        this.updatePlaybackState({
          currentTimeSeconds: nextSec,
          progressPercent: pct,
        });
      }
    }, 1000);
  }

  private startProgressTicker(token: number): void {
    this.stopProgressTicker();
    this.progressInterval = setInterval(() => {
      if (token !== this.playbackState.sequenceToken) {
        this.stopProgressTicker();
        return;
      }
      if (this.htmlAudio && !this.htmlAudio.paused) {
        const cur = Math.round(this.htmlAudio.currentTime);
        const dur = Math.round(this.htmlAudio.duration) || this.playbackState.durationSeconds || 180;
        const pct = dur > 0 ? Math.round((cur / dur) * 100) : 0;
        this.updatePlaybackState({
          currentTimeSeconds: cur,
          durationSeconds: dur,
          progressPercent: pct,
        });
      }
    }, 1000);
  }

  private stopProgressTicker(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private handlePlaybackFailure(msg: string): void {
    this.stopProgressTicker();
    this.updatePlaybackState({
      status: 'ERROR',
      isPlaying: false,
      isBuffering: false,
      error: {
        category: 'PLAYBACK_ERROR',
        code: 'MEDIA_PLAY_FAILED',
        message: msg,
        recoverable: true,
        timestamp: Date.now(),
      },
    });
    this.reportFailure('MEDIA_PLAY_FAILED');
  }

  private setupAudioListeners(): void {
    if (!this.htmlAudio) return;

    this.htmlAudio.addEventListener('ended', () => {
      this.next();
    });

    this.htmlAudio.addEventListener('error', () => {
      this.handlePlaybackFailure('HTML5 Audio Media Error');
    });

    this.htmlAudio.addEventListener('waiting', () => {
      this.updatePlaybackState({ isBuffering: true, status: 'BUFFERING' });
    });

    this.htmlAudio.addEventListener('playing', () => {
      this.updatePlaybackState({ isBuffering: false, isPlaying: true, status: 'PLAYING' });
    });
  }

  private updatePlaybackState(patch: Partial<PlaybackState>): void {
    this.playbackState = {
      ...this.playbackState,
      ...patch,
    };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(fn => fn({ ...this.playbackState }));
  }

  private notifyQueueListeners(): void {
    this.queueListeners.forEach(fn => fn({ ...this.queueState, items: [...this.queueState.items] }));
  }
}

export const musicMirrorCore = MusicMirrorCore.getInstance();
