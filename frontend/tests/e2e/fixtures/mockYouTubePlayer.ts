/**
 * Deterministic Mock YouTube IFrame Player API Fixture
 * Simulates YouTube IFrame Player states (-1, 0, 1, 2, 3, 5) and error codes (2, 5, 100, 101, 150)
 * with microsecond precision and zero external network dependencies.
 */

// Ensure mock DOM / window environment exists in Node / Happy-DOM / JSDOM
if (typeof globalThis.window === 'undefined') {
  const dummyDoc = {
    createElement: (tag: string) => ({
      tagName: tag.toUpperCase(),
      id: '',
      src: '',
      parentNode: { insertBefore: () => {} },
      appendChild: () => {},
    }),
    getElementsByTagName: () => [{ parentNode: { insertBefore: () => {} } }],
    body: { appendChild: () => {} },
  };

  (globalThis as any).window = {
    location: { origin: 'http://localhost:3000' },
    addEventListener: () => {},
    removeEventListener: () => {},
    document: dummyDoc,
  };
}

if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = (globalThis as any).window.document || {
    createElement: (tag: string) => ({
      tagName: tag.toUpperCase(),
      id: '',
      src: '',
      parentNode: { insertBefore: () => {} },
      appendChild: () => {},
    }),
    getElementsByTagName: () => [{ parentNode: { insertBefore: () => {} } }],
    body: { appendChild: () => {} },
  };
}

export const MockYTPlayerState = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

export type MockYTPlayerStateValue = (typeof MockYTPlayerState)[keyof typeof MockYTPlayerState];

export interface MockYTPlayerOptions {
  videoId?: string;
  width?: string | number;
  height?: string | number;
  playerVars?: {
    autoplay?: number;
    controls?: number;
    rel?: number;
    modestbranding?: number;
    origin?: string;
    playsinline?: number;
    enablejsapi?: number;
    disablekb?: number;
    [key: string]: any;
  };
  events?: {
    onReady?: (event: { target: MockYouTubePlayer }) => void;
    onStateChange?: (event: { target: MockYouTubePlayer; data: number }) => void;
    onPlaybackQualityChange?: (event: { target: MockYouTubePlayer; data: string }) => void;
    onPlaybackRateChange?: (event: { target: MockYouTubePlayer; data: number }) => void;
    onError?: (event: { target: MockYouTubePlayer; data: number }) => void;
    onApiChange?: (event: { target: MockYouTubePlayer }) => void;
  };
}

export class MockYouTubePlayer {
  public static instances: MockYouTubePlayer[] = [];
  public static globalSimulatedError: number | null = null;
  public static globalAutoplayRejection: boolean = false;

  public elementId: string;
  public options: MockYTPlayerOptions;
  public currentVideoId: string = 'A6BJ-PgNWXA';
  public state: number = MockYTPlayerState.UNSTARTED;
  public currentTime: number = 0;
  public duration: number = 180;
  public volume: number = 70;
  public muted: boolean = false;
  public playbackRate: number = 1.0;
  public simulatedErrorCode: number | null = null;
  public autoplayRejection: boolean = false;
  public eventHistory: Array<{ event: string; data?: any; timestamp: number }> = [];
  public isDestroyed: boolean = false;

  private customEventListeners: Map<string, Set<(event: any) => void>> = new Map();

  constructor(elementId: string, options: MockYTPlayerOptions = {}) {
    this.elementId = elementId;
    this.options = options;
    if (options.videoId) {
      this.currentVideoId = options.videoId;
    }
    this.simulatedErrorCode = MockYouTubePlayer.globalSimulatedError;
    this.autoplayRejection = MockYouTubePlayer.globalAutoplayRejection;

    MockYouTubePlayer.instances.push(this);

    // Asynchronously trigger onReady like the real IFrame player
    setTimeout(() => {
      if (this.isDestroyed) return;
      this.recordEvent('onReady', { target: this });
      if (this.options.events?.onReady) {
        this.options.events.onReady({ target: this });
      }
      this.dispatchEvent('onReady', { target: this });

      // If autoplay was requested and no simulated error, auto start
      if (this.options.playerVars?.autoplay === 1) {
        this.playVideo().catch(() => {});
      }
    }, 5);
  }

  public setSimulatedError(errorCode: number | null): void {
    this.simulatedErrorCode = errorCode;
  }

  public setAutoplayRejection(reject: boolean): void {
    this.autoplayRejection = reject;
  }

  public setDuration(seconds: number): void {
    this.duration = Math.max(0, seconds);
  }

  public async playVideo(): Promise<void> {
    if (this.isDestroyed) return;

    if (this.autoplayRejection) {
      const err = new Error('NotAllowedError: play() failed because the user didn\'t interact with the document first.');
      err.name = 'NotAllowedError';
      this.recordEvent('autoplayBlocked', { error: err.message });
      throw err;
    }

    if (this.simulatedErrorCode !== null) {
      const code = this.simulatedErrorCode;
      setTimeout(() => {
        if (this.isDestroyed) return;
        this.recordEvent('onError', { data: code });
        if (this.options.events?.onError) {
          this.options.events.onError({ target: this, data: code });
        }
        this.dispatchEvent('onError', { target: this, data: code });
      }, 10);
      return;
    }

    // Enter BUFFERING briefly then PLAYING
    this.state = MockYTPlayerState.BUFFERING;
    this.recordEvent('onStateChange', { data: MockYTPlayerState.BUFFERING });
    if (this.options.events?.onStateChange) {
      this.options.events.onStateChange({ target: this, data: MockYTPlayerState.BUFFERING });
    }
    this.dispatchEvent('onStateChange', { target: this, data: MockYTPlayerState.BUFFERING });

    setTimeout(() => {
      if (this.isDestroyed || this.state !== MockYTPlayerState.BUFFERING) return;
      this.state = MockYTPlayerState.PLAYING;
      this.recordEvent('onStateChange', { data: MockYTPlayerState.PLAYING });
      if (this.options.events?.onStateChange) {
        this.options.events.onStateChange({ target: this, data: MockYTPlayerState.PLAYING });
      }
      this.dispatchEvent('onStateChange', { target: this, data: MockYTPlayerState.PLAYING });
    }, 15);
  }

  public pauseVideo(): void {
    if (this.isDestroyed) return;
    this.state = MockYTPlayerState.PAUSED;
    this.recordEvent('onStateChange', { data: MockYTPlayerState.PAUSED });
    if (this.options.events?.onStateChange) {
      this.options.events.onStateChange({ target: this, data: MockYTPlayerState.PAUSED });
    }
    this.dispatchEvent('onStateChange', { target: this, data: MockYTPlayerState.PAUSED });
  }

  public stopVideo(): void {
    if (this.isDestroyed) return;
    this.state = MockYTPlayerState.UNSTARTED;
    this.currentTime = 0;
    this.recordEvent('onStateChange', { data: MockYTPlayerState.UNSTARTED });
    if (this.options.events?.onStateChange) {
      this.options.events.onStateChange({ target: this, data: MockYTPlayerState.UNSTARTED });
    }
    this.dispatchEvent('onStateChange', { target: this, data: MockYTPlayerState.UNSTARTED });
  }

  public seekTo(seconds: number, allowSeekAhead: boolean = true): void {
    if (this.isDestroyed) return;
    this.currentTime = Math.max(0, Math.min(seconds, this.duration));
    this.recordEvent('seekTo', { seconds: this.currentTime, allowSeekAhead });
  }

  public loadVideoById(videoIdOrConfig: string | { videoId: string; startSeconds?: number; endSeconds?: number }): void {
    if (this.isDestroyed) return;
    const videoId = typeof videoIdOrConfig === 'string' ? videoIdOrConfig : videoIdOrConfig.videoId;
    this.currentVideoId = videoId;
    this.currentTime = typeof videoIdOrConfig === 'object' && videoIdOrConfig.startSeconds ? videoIdOrConfig.startSeconds : 0;
    this.recordEvent('loadVideoById', { videoId, currentTime: this.currentTime });

    // Video ID format validation check simulation (Code 2 for malformed IDs)
    if (!videoId || videoId.length !== 11 || /[^a-zA-Z0-9_-]/.test(videoId)) {
      setTimeout(() => {
        if (this.isDestroyed) return;
        this.recordEvent('onError', { data: 2 });
        if (this.options.events?.onError) {
          this.options.events.onError({ target: this, data: 2 });
        }
        this.dispatchEvent('onError', { target: this, data: 2 });
      }, 5);
      return;
    }

    this.playVideo().catch(() => {});
  }

  public cueVideoById(videoIdOrConfig: string | { videoId: string; startSeconds?: number }): void {
    if (this.isDestroyed) return;
    const videoId = typeof videoIdOrConfig === 'string' ? videoIdOrConfig : videoIdOrConfig.videoId;
    this.currentVideoId = videoId;
    this.currentTime = typeof videoIdOrConfig === 'object' && videoIdOrConfig.startSeconds ? videoIdOrConfig.startSeconds : 0;
    this.state = MockYTPlayerState.CUED;
    this.recordEvent('onStateChange', { data: MockYTPlayerState.CUED });
    if (this.options.events?.onStateChange) {
      this.options.events.onStateChange({ target: this, data: MockYTPlayerState.CUED });
    }
    this.dispatchEvent('onStateChange', { target: this, data: MockYTPlayerState.CUED });
  }

  public setVolume(vol: number): void {
    if (this.isDestroyed) return;
    if (isNaN(vol)) return;
    this.volume = Math.max(0, Math.min(100, vol));
    this.recordEvent('setVolume', { volume: this.volume });
  }

  public getVolume(): number {
    return this.volume;
  }

  public mute(): void {
    if (this.isDestroyed) return;
    this.muted = true;
    this.recordEvent('mute', { muted: true });
  }

  public unMute(): void {
    if (this.isDestroyed) return;
    this.muted = false;
    this.recordEvent('unMute', { muted: false });
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public getDuration(): number {
    return this.duration;
  }

  public getPlayerState(): number {
    return this.state;
  }

  public getPlaybackRate(): number {
    return this.playbackRate;
  }

  public setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    this.recordEvent('onPlaybackRateChange', { data: rate });
    if (this.options.events?.onPlaybackRateChange) {
      this.options.events.onPlaybackRateChange({ target: this, data: rate });
    }
    this.dispatchEvent('onPlaybackRateChange', { target: this, data: rate });
  }

  public getVideoData(): { video_id: string; author: string; title: string } {
    return {
      video_id: this.currentVideoId,
      author: 'Official YouTube Channel',
      title: 'Mock Video Playback Title',
    };
  }

  public getIframe(): HTMLIFrameElement {
    const iframe = typeof document !== 'undefined' ? document.createElement('iframe') : { id: this.elementId, src: '' };
    iframe.id = this.elementId;
    iframe.src = `https://www.youtube.com/embed/${this.currentVideoId}`;
    return iframe as HTMLIFrameElement;
  }

  public addEventListener(event: string, listener: (event: any) => void): void {
    if (!this.customEventListeners.has(event)) {
      this.customEventListeners.set(event, new Set());
    }
    this.customEventListeners.get(event)!.add(listener);
  }

  public removeEventListener(event: string, listener: (event: any) => void): void {
    if (this.customEventListeners.has(event)) {
      this.customEventListeners.get(event)!.delete(listener);
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.customEventListeners.clear();
    const idx = MockYouTubePlayer.instances.indexOf(this);
    if (idx !== -1) {
      MockYouTubePlayer.instances.splice(idx, 1);
    }
    this.recordEvent('destroy', {});
  }

  // --- Test Simulation Trigger Helpers ---

  public simulateStateChange(state: number): void {
    this.state = state;
    this.recordEvent('onStateChange', { data: state });
    if (this.options.events?.onStateChange) {
      this.options.events.onStateChange({ target: this, data: state });
    }
    this.dispatchEvent('onStateChange', { target: this, data: state });
  }

  public simulateError(errorCode: number): void {
    this.recordEvent('onError', { data: errorCode });
    if (this.options.events?.onError) {
      this.options.events.onError({ target: this, data: errorCode });
    }
    this.dispatchEvent('onError', { target: this, data: errorCode });
  }

  public simulateTrackEnd(): void {
    this.currentTime = this.duration;
    this.simulateStateChange(MockYTPlayerState.ENDED);
  }

  public advanceTime(seconds: number): void {
    this.currentTime = Math.min(this.duration, this.currentTime + seconds);
    if (this.currentTime >= this.duration) {
      this.simulateTrackEnd();
    }
  }

  private dispatchEvent(event: string, payload: any): void {
    if (this.customEventListeners.has(event)) {
      this.customEventListeners.get(event)!.forEach((fn) => fn(payload));
    }
  }

  private recordEvent(event: string, data?: any): void {
    this.eventHistory.push({
      event,
      data,
      timestamp: Date.now(),
    });
  }
}

/**
 * Installs Mock YouTube Player API onto the global `window` object
 */
export function installMockYouTubeAPI(): void {
  if (typeof globalThis.window === 'undefined') {
    (globalThis as any).window = { location: { origin: 'http://localhost:3000' } };
  }

  (globalThis.window as any).YT = {
    Player: MockYouTubePlayer,
    PlayerState: MockYTPlayerState,
    loaded: 1,
  };

  // If callback was registered before script, execute it
  if (typeof (globalThis.window as any).onYouTubeIframeAPIReady === 'function') {
    (globalThis.window as any).onYouTubeIframeAPIReady();
  }
}

/**
 * Uninstalls and cleans up global Mock YouTube API
 */
export function uninstallMockYouTubeAPI(): void {
  MockYouTubePlayer.instances.forEach((p) => p.destroy());
  MockYouTubePlayer.instances = [];
  MockYouTubePlayer.globalSimulatedError = null;
  MockYouTubePlayer.globalAutoplayRejection = false;

  if (typeof globalThis.window !== 'undefined') {
    delete (globalThis.window as any).YT;
    (globalThis.window as any).onYouTubeIframeAPIReady = undefined;
  }
}

/**
 * Helper to get the latest instantiated mock player
 */
export function getLatestMockPlayer(): MockYouTubePlayer | undefined {
  return MockYouTubePlayer.instances[MockYouTubePlayer.instances.length - 1];
}
