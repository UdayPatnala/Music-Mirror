/**
 * YouTube Playback Adapter
 * Conforms to PlaybackProvider contract
 * Embeds and controls the official YouTube IFrame Player API.
 */

import type { PlaybackProvider } from './PlaybackProvider';
import type { MusicCandidate, PlaybackState, PlaybackEvent } from '../../types/domain';
import { logger } from '../ObservabilityLayer';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export class YouTubePlaybackAdapter implements PlaybackProvider {
  private currentTrack: MusicCandidate | null = null;
  private isPlayingState: boolean = false;
  private positionSeconds: number = 0;
  private durationSec: number = 180;
  private volumeLevel: number = 70;
  private muted: boolean = false;
  private listeners: Set<(event: PlaybackEvent) => void> = new Set();
  private progressInterval: ReturnType<typeof setInterval> | null = null;

  private player: any = null;
  private targetElementId: string | null = null;
  private isPlayerReady: boolean = false;

  public getProviderId(): string {
    return 'youtube';
  }

  public getProviderName(): string {
    return 'YouTube Official IFrame Embed Player';
  }

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async initialize(): Promise<void> {
    logger.info('YouTubePlaybackAdapter', 'YouTube Playback Provider script injection...');
    if (typeof window !== 'undefined' && !window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }

  public bindElement(elementId: string): void {
    this.targetElementId = elementId;
    this.isPlayerReady = false;
    this.player = null;
    this.checkAndCreatePlayer();
  }

  private checkAndCreatePlayer(): void {
    if (!this.targetElementId || !this.currentTrack) return;
    if (typeof window === 'undefined' || !window.YT || !window.YT.Player) {
      // Retry in 200ms if script hasn't loaded yet
      setTimeout(() => this.checkAndCreatePlayer(), 200);
      return;
    }

    const videoId = this.currentTrack.playbackRef || 'A6BJ-PgNWXA';

    try {
      this.player = new window.YT.Player(this.targetElementId, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0, // hide native controls so we use application UI
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            this.isPlayerReady = true;
            this.player.setVolume(this.muted ? 0 : this.volumeLevel);
            if (this.isPlayingState) {
              this.player.playVideo();
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: ENDED (0), PLAYING (1), PAUSED (2), BUFFERING (3), CUED (5)
            const state = event.data;
            if (state === 1) { // PLAYING
              this.isPlayingState = true;
              this.startProgressTicker();
              this.emitEvent('start');
            } else if (state === 2) { // PAUSED
              this.isPlayingState = false;
              this.stopProgressTicker();
              this.emitEvent('pause');
            } else if (state === 0) { // ENDED
              this.isPlayingState = false;
              this.stopProgressTicker();
              this.emitEvent('ended');
            }
          },
          onError: (event: any) => {
            const errorCode = event.data;
            logger.warn('YouTubePlaybackAdapter', `YouTube Player error: ${errorCode}`);
            this.emitEvent('error', `YouTube Error code ${errorCode}`);
          },
        },
      });
    } catch (e: any) {
      logger.error({
        code: 'YT_INIT_ERR',
        layer: 'Playback',
        message: `Failed to construct YT.Player: ${e.message}`,
        recoverable: true,
        timestamp: Date.now(),
      });
    }
  }

  public async load(candidate: MusicCandidate, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw new Error('Load aborted by caller');
    }

    this.currentTrack = candidate;
    this.durationSec = candidate.duration || 180;
    this.positionSeconds = 0;
    this.isPlayingState = false;

    this.emitEvent('load');
    logger.info('YouTubePlaybackAdapter', `Loaded track [${candidate.title}] (${candidate.playbackRef})`);

    if (this.player && this.isPlayerReady) {
      const videoId = candidate.playbackRef || 'A6BJ-PgNWXA';
      this.player.loadVideoById(videoId);
    } else {
      this.checkAndCreatePlayer();
    }
  }

  public async prepare(candidate: MusicCandidate, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return;
    logger.info('YouTubePlaybackAdapter', `Prepared next track [${candidate.title}]`);
  }

  public async play(): Promise<void> {
    if (!this.currentTrack) throw new Error('No track loaded to play');

    this.isPlayingState = true;
    if (this.player && this.isPlayerReady) {
      this.player.playVideo();
    } else {
      this.startProgressTicker();
      this.emitEvent('start');
    }
    logger.info('YouTubePlaybackAdapter', `Started playback for [${this.currentTrack.title}]`);
  }

  public pause(): void {
    this.isPlayingState = false;
    if (this.player && this.isPlayerReady) {
      this.player.pauseVideo();
    } else {
      this.stopProgressTicker();
      this.emitEvent('pause');
    }
    logger.info('YouTubePlaybackAdapter', 'Playback paused');
  }

  public resume(): void {
    if (!this.currentTrack) return;
    this.isPlayingState = true;
    if (this.player && this.isPlayerReady) {
      this.player.playVideo();
    } else {
      this.startProgressTicker();
      this.emitEvent('resume');
    }
    logger.info('YouTubePlaybackAdapter', 'Playback resumed');
  }

  public seek(seconds: number): void {
    this.positionSeconds = Math.max(0, Math.min(seconds, this.durationSec));
    if (this.player && this.isPlayerReady) {
      this.player.seekTo(this.positionSeconds, true);
    }
    this.emitEvent('timeupdate');
    logger.info('YouTubePlaybackAdapter', `Seeked to ${this.positionSeconds}s`);
  }

  public setVolume(volumePercent: number): void {
    this.volumeLevel = Math.max(0, Math.min(100, volumePercent));
    if (this.player && this.isPlayerReady) {
      this.player.setVolume(this.volumeLevel);
    }
    this.emitEvent('volumechange');
  }

  public setMute(mute: boolean): void {
    this.muted = mute;
    if (this.player && this.isPlayerReady) {
      this.player.setVolume(mute ? 0 : this.volumeLevel);
    }
    this.emitEvent('volumechange');
  }

  public stop(): void {
    this.isPlayingState = false;
    this.positionSeconds = 0;
    if (this.player && this.isPlayerReady) {
      this.player.stopVideo();
    } else {
      this.stopProgressTicker();
      this.emitEvent('pause');
    }
    logger.info('YouTubePlaybackAdapter', 'Playback stopped');
  }

  public getCurrentTrack(): MusicCandidate | null {
    return this.currentTrack;
  }

  public getPosition(): number {
    if (this.player && this.isPlayerReady && typeof this.player.getCurrentTime === 'function') {
      try {
        this.positionSeconds = Math.round(this.player.getCurrentTime());
      } catch (_) {}
    }
    return this.positionSeconds;
  }

  public getDuration(): number {
    if (this.player && this.isPlayerReady && typeof this.player.getDuration === 'function') {
      try {
        const d = this.player.getDuration();
        if (d > 0) this.durationSec = d;
      } catch (_) {}
    }
    return this.durationSec;
  }

  public getPlaybackState(): PlaybackState {
    const pos = this.getPosition();
    const dur = this.getDuration();
    return {
      currentCandidate: this.currentTrack,
      nextCandidate: null,
      isPlaying: this.isPlayingState,
      isPaused: !this.isPlayingState && this.currentTrack !== null,
      isBuffering: false,
      progressPercent: dur > 0 ? Math.round((pos / dur) * 100) : 0,
      currentTimeSeconds: pos,
      durationSeconds: dur,
      volume: this.volumeLevel,
      isMuted: this.muted,
      providerId: this.getProviderId(),
      activeMood: 'happy',
      queue: [],
      sessionState: this.isPlayingState ? 'PLAYING' : 'PAUSED',
      sessionToken: 1,
      autoplayBlocked: false,
      broadeningLevel: 0,
      history: [],
      error: null,
      attributionText: 'Provided via YouTube Legitimate IFrame API',
    };
  }

  public subscribe(listener: (event: PlaybackEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public dispose(): void {
    this.stop();
    this.listeners.clear();
    this.currentTrack = null;
    this.player = null;
    this.isPlayerReady = false;
  }

  private startProgressTicker(): void {
    this.stopProgressTicker();
    this.progressInterval = setInterval(() => {
      if (this.isPlayingState && this.currentTrack) {
        const pos = this.getPosition();
        const dur = this.getDuration();
        this.emitEvent('timeupdate');

        if (pos >= dur) {
          this.isPlayingState = false;
          this.stopProgressTicker();
          this.emitEvent('ended');
        }
      }
    }, 1000);
  }

  private stopProgressTicker(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private emitEvent(type: PlaybackEvent['type'], error?: string): void {
    const event: PlaybackEvent = {
      type,
      candidate: this.currentTrack,
      positionSeconds: this.getPosition(),
      durationSeconds: this.getDuration(),
      volume: this.muted ? 0 : this.volumeLevel / 100,
      error,
      timestamp: Date.now(),
    };
    this.listeners.forEach((listener) => listener(event));
  }
}

export const youtubePlaybackAdapter = new YouTubePlaybackAdapter();
