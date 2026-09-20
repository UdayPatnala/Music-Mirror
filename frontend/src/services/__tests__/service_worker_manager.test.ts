import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceWorkerManager } from '../ServiceWorkerManager';

describe('ServiceWorkerManager', () => {
  let manager: ServiceWorkerManager;
  let originalCaches: any;

  beforeEach(() => {
    manager = ServiceWorkerManager.getInstance();
    originalCaches = (globalThis as any).caches;
  });

  afterEach(() => {
    (globalThis as any).caches = originalCaches;
    vi.restoreAllMocks();
  });

  it('provides a valid singleton instance', () => {
    const instance1 = ServiceWorkerManager.getInstance();
    const instance2 = ServiceWorkerManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('correctly detects ServiceWorker support', () => {
    const supported = manager.isSupported();
    expect(typeof supported).toBe('boolean');
  });

  it('returns default unregistered status when unsupported or uninitialized', () => {
    const status = manager.getStatus();
    expect(status).toHaveProperty('supported');
    expect(status).toHaveProperty('registered');
    expect(status).toHaveProperty('controlling');
    expect(status).toHaveProperty('state');
  });

  it('gracefully handles register() when serviceWorker is not available', async () => {
    const origSW = (globalThis as any).navigator?.serviceWorker;
    if (globalThis.navigator) {
      delete (globalThis.navigator as any).serviceWorker;
    }

    const res = await manager.register('/sw.js');
    expect(res).toBeNull();
    expect(manager.isSupported()).toBe(false);

    // Restore
    if (globalThis.navigator) {
      Object.defineProperty(globalThis.navigator, 'serviceWorker', {
        value: origSW,
        configurable: true,
        writable: true,
      });
    }
  });

  it('successfully invokes navigator.serviceWorker.register when supported', async () => {
    const mockRegistration = {
      installing: null,
      waiting: null,
      active: { state: 'activated' },
      addEventListener: vi.fn(),
      unregister: vi.fn().mockResolvedValue(true),
    };

    const mockRegister = vi.fn().mockResolvedValue(mockRegistration);
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: {
        register: mockRegister,
        controller: null,
      },
      configurable: true,
      writable: true,
    });

    const reg = await manager.register('/sw.js');
    expect(reg).toBe(mockRegistration);
    expect(mockRegister).toHaveBeenCalledWith('/sw.js', { scope: '/' });

    const status = manager.getStatus();
    expect(status.registered).toBe(true);
    expect(status.state).toBe('activated');

    const unreg = await manager.unregister();
    expect(unreg).toBe(true);
    expect(mockRegistration.unregister).toHaveBeenCalled();
  });

  it('handles registration failure gracefully without throwing', async () => {
    const mockRegister = vi.fn().mockRejectedValue(new Error('SecurityError: SW disallowed'));
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: {
        register: mockRegister,
        controller: null,
      },
      configurable: true,
      writable: true,
    });

    const reg = await manager.register('/sw.js');
    expect(reg).toBeNull();
    expect(manager.getStatus().registered).toBe(false);
  });

  it('purges audio stream cache via caches API when available', async () => {
    const mockDelete = vi.fn().mockResolvedValue(true);
    (globalThis as any).caches = {
      delete: mockDelete,
      keys: vi.fn().mockResolvedValue(['mm-audio-stream-v1']),
      open: vi.fn(),
    };

    const result = await manager.purgeAudioStreamCache();
    expect(result).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith('mm-audio-stream-v1');
  });

  it('computes cache stats correctly from caches API', async () => {
    const mockAudioCache = {
      keys: vi.fn().mockResolvedValue([
        new Request('https://musicmirror.ai/audio/song1.mp3'),
        new Request('https://musicmirror.ai/audio/song2.mp3'),
      ]),
    };
    const mockStaticCache = {
      keys: vi.fn().mockResolvedValue([new Request('https://musicmirror.ai/index.html')]),
    };

    (globalThis as any).caches = {
      keys: vi.fn().mockResolvedValue(['mm-audio-stream-v1', 'mm-static-v2.04.04.0']),
      open: vi.fn().mockImplementation((name: string) => {
        if (name.includes('audio')) return Promise.resolve(mockAudioCache);
        return Promise.resolve(mockStaticCache);
      }),
      delete: vi.fn(),
    };

    const stats = await manager.getCacheStats();
    expect(stats.audioEntries).toBe(2);
    expect(stats.staticEntries).toBe(1);
  });
});
