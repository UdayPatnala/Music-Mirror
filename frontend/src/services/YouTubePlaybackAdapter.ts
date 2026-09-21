/**
 * Music Mirror — YouTube Playback Adapter
 * Decouples the core engine from YouTube IFrame DOM structures and the HTML5 postMessage bridge.
 */

export class YouTubePlaybackAdapter {
  private static instance: YouTubePlaybackAdapter | null = null;
  private currentVideoId: string | null = null;

  public static getInstance(): YouTubePlaybackAdapter {
    if (!this.instance) {
      this.instance = new YouTubePlaybackAdapter();
    }
    return this.instance;
  }

  /**
   * Mounts a responsive YouTube iframe into the specified container element.
   */
  public mount(container: HTMLElement, videoId: string): void {
    if (!container || !videoId) return;

    this.currentVideoId = videoId;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1${
      origin ? `&origin=${encodeURIComponent(origin)}` : ''
    }`;

    container.innerHTML = `<iframe id="mm-yt-iframe" src="${embedUrl}" width="100%" height="100%" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%; height:100%; min-height:240px; border:none; border-radius:8px;"></iframe>`;
  }

  /**
   * Cleans up the player iframe from the container.
   */
  public unmount(container: HTMLElement): void {
    if (!container) return;
    container.innerHTML = '';
    this.currentVideoId = null;
  }

  /**
   * Sends an API command via postMessage to the embedded YouTube iframe.
   */
  public sendCommand(func: string, args: unknown[] = []): void {
    if (typeof document === 'undefined') return;

    const iframe = document.getElementById('mm-yt-iframe') as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args,
        }),
        '*'
      );
    }
  }

  public play(): void {
    this.sendCommand('playVideo');
  }

  public pause(): void {
    this.sendCommand('pauseVideo');
  }

  public seek(seconds: number): void {
    this.sendCommand('seekTo', [seconds, true]);
  }

  public setVolume(percent: number): void {
    this.sendCommand('setVolume', [Math.max(0, Math.min(100, percent))]);
  }

  public mute(): void {
    this.sendCommand('mute');
  }

  public unMute(): void {
    this.sendCommand('unMute');
  }

  public getCurrentVideoId(): string | null {
    return this.currentVideoId;
  }
}

export const youtubePlaybackAdapter = YouTubePlaybackAdapter.getInstance();
