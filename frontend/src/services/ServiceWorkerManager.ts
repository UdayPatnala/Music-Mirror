/**
 * Music Mirror — Service Worker Manager
 * Version: 2.04.04.0
 *
 * Coordinates ServiceWorker lifecycle, offline readiness, and audio stream
 * cache maintenance between the UI/core and the background ServiceWorker.
 */

export interface SWCacheStats {
  staticEntries: number;
  audioEntries: number;
  staticCacheName?: string;
  audioCacheName?: string;
}

export interface SWStatus {
  supported: boolean;
  registered: boolean;
  controlling: boolean;
  state: ServiceWorkerState | 'unregistered';
}

export class ServiceWorkerManager {
  private static _instance: ServiceWorkerManager | null = null;
  private _registration: ServiceWorkerRegistration | null = null;
  private _isRegistered = false;

  private constructor() {}

  public static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager._instance) {
      ServiceWorkerManager._instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager._instance;
  }

  /**
   * Returns true if ServiceWorker is supported in the current environment.
   */
  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  }

  /**
   * Register the ServiceWorker (/sw.js).
   */
  public async register(swUrl = '/sw.js'): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      return null;
    }

    try {
      const reg = await navigator.serviceWorker.register(swUrl, { scope: '/' });
      this._registration = reg;
      this._isRegistered = true;

      // Listen for updates
      reg.addEventListener('updatefound', () => {
        const installingWorker = reg.installing;
        if (installingWorker) {
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW Manager] New content is available; please refresh.');
            }
          });
        }
      });

      return reg;
    } catch (err) {
      console.warn('[SW Manager] Registration failed:', err);
      this._isRegistered = false;
      return null;
    }
  }

  /**
   * Unregister the ServiceWorker.
   */
  public async unregister(): Promise<boolean> {
    if (!this.isSupported() || !this._registration) {
      return false;
    }

    const success = await this._registration.unregister();
    if (success) {
      this._registration = null;
      this._isRegistered = false;
    }
    return success;
  }

  /**
   * Query the current registration and controlling status.
   */
  public getStatus(): SWStatus {
    const supported = this.isSupported();
    if (!supported) {
      return {
        supported: false,
        registered: false,
        controlling: false,
        state: 'unregistered',
      };
    }

    const activeWorker = this._registration?.active;
    return {
      supported: true,
      registered: this._isRegistered,
      controlling: !!navigator.serviceWorker.controller,
      state: activeWorker ? activeWorker.state : 'unregistered',
    };
  }

  /**
   * Purge the audio stream cache.
   * Can communicate via message channel or fallback directly to window.caches.
   */
  public async purgeAudioStreamCache(): Promise<boolean> {
    // 1. Direct CacheStorage API access if available
    const cachesApi = typeof caches !== 'undefined' ? caches : (typeof globalThis !== 'undefined' && 'caches' in globalThis ? (globalThis as any).caches : undefined);
    if (cachesApi) {
      try {
        const deleted = await cachesApi.delete('mm-audio-stream-v1');
        return deleted;
      } catch (err) {
        console.warn('[SW Manager] Direct cache delete failed, attempting postMessage:', err);
      }
    }

    // 2. PostMessage channel fallback to active ServiceWorker
    if (this.isSupported() && navigator.serviceWorker.controller) {
      return new Promise<boolean>((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          if (event.data && event.data.type === 'PURGE_AUDIO_CACHE_RESULT') {
            resolve(!!event.data.success);
          } else {
            resolve(false);
          }
        };

        navigator.serviceWorker.controller?.postMessage(
          { type: 'PURGE_AUDIO_CACHE' },
          [messageChannel.port2]
        );

        // Timeout safeguard
        setTimeout(() => resolve(false), 2000);
      });
    }

    return false;
  }

  /**
   * Retrieve cache entries statistics.
   */
  public async getCacheStats(): Promise<SWCacheStats> {
    const cachesApi = typeof caches !== 'undefined' ? caches : (typeof globalThis !== 'undefined' && 'caches' in globalThis ? (globalThis as any).caches : undefined);
    if (cachesApi) {
      try {
        const keys = await cachesApi.keys();
        let staticEntries = 0;
        let audioEntries = 0;

        for (const key of keys) {
          const cache = await cachesApi.open(key);
          const entries = await cache.keys();
          if (key.includes('audio')) {
            audioEntries += entries.length;
          } else if (key.includes('static')) {
            staticEntries += entries.length;
          }
        }

        return { staticEntries, audioEntries };
      } catch {
        // Fall back to zeros
      }
    }

    return { staticEntries: 0, audioEntries: 0 };
  }
}

export const serviceWorkerManager = ServiceWorkerManager.getInstance();
