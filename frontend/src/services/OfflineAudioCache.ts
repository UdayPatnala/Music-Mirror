/**
 * Music Mirror — Offline Audio Cache (IndexedDB & Memory Fallback)
 *
 * Provides persistent offline track metadata and audio asset caching.
 * Implements LRU capacity bounding, fast offline search, and resilience
 * against environments where IndexedDB is blocked or unavailable.
 *
 * Privacy & Data Governance (Spec §14, §16):
 *   - Classified as PROVIDER_DATA.
 *   - Contains strictly public music metadata and optional audio data URIs.
 *   - Zero user identifiers or personal data are stored.
 *   - Full user-controlled purge via clear().
 */

import type { Track } from '../domain/canonical';

export interface CachedTrackRecord {
  id: string;
  track: Track;
  cachedAt: number;
  lastAccessedAt: number;
  audioDataUri?: string;
  estimatedSizeBytes: number;
}

export interface CacheStats {
  count: number;
  totalEstimatedBytes: number;
  storageBackend: 'indexeddb' | 'memory' | 'unavailable';
}

const DB_NAME = 'MusicMirrorOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';
const DEFAULT_MAX_CAPACITY = 50;

export class OfflineAudioCache {
  private static instance: OfflineAudioCache | null = null;
  private db: IDBDatabase | null = null;
  private isDbAvailable: boolean = false;
  private memStore: Map<string, CachedTrackRecord> = new Map();
  private maxCapacity: number = DEFAULT_MAX_CAPACITY;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    this.isDbAvailable = typeof indexedDB !== 'undefined';
  }

  public static getInstance(): OfflineAudioCache {
    if (!OfflineAudioCache.instance) {
      OfflineAudioCache.instance = new OfflineAudioCache();
    }
    return OfflineAudioCache.instance;
  }

  /**
   * Reset instance (for testing purposes).
   */
  public static _resetInstanceForTest(): void {
    if (OfflineAudioCache.instance?.db) {
      OfflineAudioCache.instance.db.close();
    }
    OfflineAudioCache.instance = null;
  }

  /**
   * Initialize connection to IndexedDB.
   */
  public async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<void>((resolve) => {
      if (!this.isDbAvailable) {
        resolve();
        return;
      }

      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('by_cachedAt', 'cachedAt', { unique: false });
            store.createIndex('by_lastAccessedAt', 'lastAccessedAt', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          resolve();
        };

        request.onerror = () => {
          // Fall back gracefully to in-memory store
          this.db = null;
          resolve();
        };
      } catch {
        this.db = null;
        resolve();
      }
    });

    return this.initPromise;
  }

  /**
   * Check whether persistent IndexedDB storage is currently active.
   */
  public isPersistent(): boolean {
    return this.db !== null;
  }

  /**
   * Save or update a track in the offline cache.
   */
  public async saveTrack(track: Track, audioDataUri?: string): Promise<boolean> {
    await this.init();
    if (!track?.id) return false;

    const now = Date.now();
    const trackJson = JSON.stringify(track);
    const estimatedSizeBytes = trackJson.length * 2 + (audioDataUri ? audioDataUri.length : 0);

    const record: CachedTrackRecord = {
      id: track.id,
      track: { ...track },
      cachedAt: now,
      lastAccessedAt: now,
      audioDataUri,
      estimatedSizeBytes,
    };

    // Capacity management: evict oldest if at capacity
    const currentCount = await this.getCount();
    if (currentCount >= this.maxCapacity && !(await this.hasTrack(track.id))) {
      await this.evictOldest(1);
    }

    if (this.db) {
      return new Promise<boolean>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(record);
          req.onsuccess = () => resolve(true);
          req.onerror = () => {
            this.memStore.set(track.id, record);
            resolve(true);
          };
        } catch {
          this.memStore.set(track.id, record);
          resolve(true);
        }
      });
    }

    this.memStore.set(track.id, record);
    return true;
  }

  /**
   * Retrieve a track by its canonical ID.
   */
  public async getTrack(id: string): Promise<Track | null> {
    const record = await this.getRecord(id);
    if (!record) return null;

    // Update lastAccessedAt for LRU
    record.lastAccessedAt = Date.now();
    await this.touchRecord(record);

    return record.track;
  }

  /**
   * Retrieve the full cache record including audioDataUri if present.
   */
  public async getRecord(id: string): Promise<CachedTrackRecord | null> {
    await this.init();

    if (this.db) {
      return new Promise<CachedTrackRecord | null>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(id);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(this.memStore.get(id) || null);
        } catch {
          resolve(this.memStore.get(id) || null);
        }
      });
    }

    return this.memStore.get(id) || null;
  }

  /**
   * Check if a track is cached.
   */
  public async hasTrack(id: string): Promise<boolean> {
    const record = await this.getRecord(id);
    return record !== null;
  }

  /**
   * Retrieve all cached tracks.
   */
  public async getAllTracks(): Promise<Track[]> {
    await this.init();

    if (this.db) {
      return new Promise<Track[]>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => {
            const records: CachedTrackRecord[] = req.result || [];
            resolve(records.map(r => r.track));
          };
          req.onerror = () => {
            resolve(Array.from(this.memStore.values()).map(r => r.track));
          };
        } catch {
          resolve(Array.from(this.memStore.values()).map(r => r.track));
        }
      });
    }

    return Array.from(this.memStore.values()).map(r => r.track);
  }

  /**
   * Search cached tracks locally by title, artist, or genre.
   */
  public async searchTracks(query: string): Promise<Track[]> {
    const clean = query.trim().toLowerCase();
    if (!clean) return [];

    const all = await this.getAllTracks();
    return all.filter(t =>
      t.title.toLowerCase().includes(clean) ||
      t.artist.toLowerCase().includes(clean) ||
      (t.metadata?.genre && t.metadata.genre.toLowerCase().includes(clean))
    );
  }

  /**
   * Remove a single track from the cache.
   */
  public async removeTrack(id: string): Promise<boolean> {
    await this.init();
    this.memStore.delete(id);

    if (this.db) {
      return new Promise<boolean>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(id);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    }

    return true;
  }

  /**
   * Purge the entire cache.
   */
  public async clear(): Promise<void> {
    await this.init();
    this.memStore.clear();

    if (this.db) {
      return new Promise<void>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  }

  /**
   * Get total count of cached items.
   */
  public async getCount(): Promise<number> {
    await this.init();

    if (this.db) {
      return new Promise<number>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.count();
          req.onsuccess = () => resolve(req.result || 0);
          req.onerror = () => resolve(this.memStore.size);
        } catch {
          resolve(this.memStore.size);
        }
      });
    }

    return this.memStore.size;
  }

  /**
   * Evict the N oldest unaccessed records (LRU eviction).
   */
  public async evictOldest(count: number = 1): Promise<number> {
    await this.init();
    let evicted = 0;

    if (this.db) {
      const records = await new Promise<CachedTrackRecord[]>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const index = store.index('by_lastAccessedAt');
          const req = index.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });

      const targets = records.slice(0, count);
      for (const target of targets) {
        await this.removeTrack(target.id);
        evicted++;
      }
      return evicted;
    }

    // Memory store fallback LRU
    const entries = Array.from(this.memStore.values())
      .sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);

    const targets = entries.slice(0, count);
    for (const target of targets) {
      this.memStore.delete(target.id);
      evicted++;
    }

    return evicted;
  }

  /**
   * Get diagnostic statistics about the cache.
   */
  public async getStats(): Promise<CacheStats> {
    await this.init();
    const count = await this.getCount();

    let totalEstimatedBytes = 0;
    if (this.db) {
      const records = await new Promise<CachedTrackRecord[]>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });
      totalEstimatedBytes = records.reduce((acc, r) => acc + (r.estimatedSizeBytes || 0), 0);
    } else {
      totalEstimatedBytes = Array.from(this.memStore.values())
        .reduce((acc, r) => acc + (r.estimatedSizeBytes || 0), 0);
    }

    return {
      count,
      totalEstimatedBytes,
      storageBackend: this.db ? 'indexeddb' : this.isDbAvailable ? 'memory' : 'unavailable',
    };
  }

  private async touchRecord(record: CachedTrackRecord): Promise<void> {
    if (this.db) {
      try {
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(record);
      } catch { /* non-fatal */ }
    } else {
      this.memStore.set(record.id, record);
    }
  }
}

export const offlineAudioCache = OfflineAudioCache.getInstance();
