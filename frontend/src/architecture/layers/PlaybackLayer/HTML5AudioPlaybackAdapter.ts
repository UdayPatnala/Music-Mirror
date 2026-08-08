/**
 * HTML5 Audio Stream Playback Adapter (STAGE 05 Implementation)
 * Official HTML5 Audio element integration for Jamendo CC and Royalty-Free MP3 streams
 */

import type { PlaybackProvider } from './PlaybackProvider';
import type { MusicCandidate, PlaybackState, PlaybackEvent } from '../../types/domain';
import { logger } from '../ObservabilityLayer';

export class HTML5AudioPlaybackAdapter implements PlaybackProvider {
  private currentTrack: MusicCandidate | null = null;
  private isPlayingState: boolean = false;
  private positionSeconds: number = 0;
  private durationSec: number = 180;
  private volumeLevel: number = 70;
  private muted: boolean = false;
  private listeners: Set<(event: PlaybackEvent) => void> = new Set();
  private audioElement: HTMLAudioElement | null = null;

  public getProviderId(): string {
    return 'html5_audio';
  }

  public getProviderName(): string {
    return 'HTML5 Open Audio Stream Engine';
  }

  public async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && typeof window.Audio !== 'undefined';
  }

  public async initialize(): Promise<void> {
    if (typeof window !== 'undefined' && !this.audioElement) {
      this.audioElement = new Audio();
      this.setupAudioListeners();
    }
    logger.info('HTML5AudioPlaybackAdapter', 'HTML5 Audio Playback Adapter Initialized');
  }

  public async load(candidate: MusicCandidate, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw new Error('Load aborted');

    this.currentTrack = candidate;
    this.durationSec = candidate.duration || 180;
    this.positionSeconds = 0;
    this.isPlayingState = false;

    if (this.audioElement && candidate.playbackRef) {
      this.audioElement.src = candidate.playbackRef;
      this.audioElement.volume = this.muted ? 0 : this.volumeLevel / 100;
    }

    this.emitEvent('load');
    logger.info('HTML5AudioPlaybackAdapter', `Loaded direct stream [${candidate.title}] (${candidate.playbackRef})`);
  }

  public async prepare(candidate: MusicCandidate, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return;
    logger.info('HTML5AudioPlaybackAdapter', `Prepared next audio stream [${candidate.title}]`);
  }

  public async play(): Promise<void> {
    if (!this.currentTrack) throw new Error('No track loaded');

    if (this.audioElement) {
      try {
        await this.audioElement.play();
        this.isPlayingState = true;
        this.emitEvent('start');
      } catch (err) {
        logger.warn('HTML5AudioPlaybackAdapter', `Audio play failed (Autoplay policy or missing src): ${String(err)}`);
        throw err;
      }
    } else {
      this.isPlayingState = true;
      this.emitEvent('start');
    }
  }

  public pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.isPlayingState = false;
    this.emitEvent('pause');
  }

  public resume(): void {
    if (this.audioElement) {
      this.audioElement.play().catch(() => {});
    }
    this.isPlayingState = true;
    this.emitEvent('resume');
  }

  public seek(seconds: number): void {
    this.positionSeconds = Math.max(0, Math.min(seconds, this.durationSec));
    if (this.audioElement) {
      this.audioElement.currentTime = this.positionSeconds;
    }
    this.emitEvent('timeupdate');
  }

  public setVolume(volumePercent: number): void {
    this.volumeLevel = Math.max(0, Math.min(100, volumePercent));
    if (this.audioElement) {
      this.audioElement.volume = this.muted ? 0 : this.volumeLevel / 100;
    }
    this.emitEvent('volumechange');
  }

  public setMute(mute: boolean): void {
    this.muted = mute;
    if (this.audioElement) {
      this.audioElement.volume = mute ? 0 : this.volumeLevel / 100;
    }
    this.emitEvent('volumechange');
  }

  public stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.isPlayingState = false;
    this.positionSeconds = 0;
    this.emitEvent('pause');
  }

  public getCurrentTrack(): MusicCandidate | null {
    return this.currentTrack;
  }

  public getPosition(): number {
    return this.audioElement ? this.audioElement.currentTime : this.positionSeconds;
  }

  public getDuration(): number {
    return this.audioElement?.duration && !isNaN(this.audioElement.duration)
      ? this.audioElement.duration
      : this.durationSec;
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
      currentTimeSeconds: Math.round(pos),
      durationSeconds: Math.round(dur),
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
      attributionText: this.currentTrack?.attributionText || null,
    };
  }

  public subscribe(listener: (event: PlaybackEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public dispose(): void {
    this.stop();
    if (this.audioElement) {
      this.audioElement.src = '';
      this.audioElement = null;
    }
    this.listeners.clear();
    this.currentTrack = null;
  }

  private setupAudioListeners(): void {
    if (!this.audioElement) return;

    this.audioElement.onplay = () => {
      this.isPlayingState = true;
      this.emitEvent('start');
    };
    this.audioElement.onpause = () => {
      this.isPlayingState = false;
      this.emitEvent('pause');
    };
    this.audioElement.ontimeupdate = () => {
      this.positionSeconds = this.audioElement?.currentTime || 0;
      this.emitEvent('timeupdate');
    };
    this.audioElement.onended = () => {
      this.isPlayingState = false;
      this.emitEvent('ended');
    };
    this.audioElement.onerror = () => {
      this.isPlayingState = false;
      this.emitEvent('error', 'Audio element playback error');
    };
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
