/**
 * MusicMirror Playback Provider Interface Contract
 * Universal abstraction layer for legitimate, authorized audio playback engines
 */

import type { MusicCandidate, PlaybackState, PlaybackEvent } from '../../types/domain';

export interface PlaybackProvider {
  getProviderId(): string;
  getProviderName(): string;
  isAvailable(): Promise<boolean>;

  initialize(): Promise<void>;
  load(candidate: MusicCandidate, signal?: AbortSignal): Promise<void>;
  prepare(candidate: MusicCandidate, signal?: AbortSignal): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  resume(): void;
  seek(seconds: number): void;
  setVolume(volumePercent: number): void; // 0 to 100
  setMute(mute: boolean): void;
  stop(): void;

  getCurrentTrack(): MusicCandidate | null;
  getPosition(): number; // seconds
  getDuration(): number; // seconds
  getPlaybackState(): PlaybackState;

  subscribe(listener: (event: PlaybackEvent) => void): () => void;
  dispose(): void;
}
