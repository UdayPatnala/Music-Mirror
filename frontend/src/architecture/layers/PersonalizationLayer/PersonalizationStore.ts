/**
 * Privacy-First Personalization Store (STAGE 07 Implementation)
 * Provides local-first, safe persistence for MusicPreferenceProfile
 * with strict schema validation, version migration, and corruption recovery.
 */

import type { MusicPreferenceProfile } from '../../types/domain';
import { logger } from '../ObservabilityLayer';

const STORAGE_KEY = 'musicmirror_user_preference_profile_v1';
const SCHEMA_VERSION = '1.0.0';

export class PersonalizationStore {
  private static instance: PersonalizationStore | null = null;
  private inMemoryProfile: MusicPreferenceProfile | null = null;

  private constructor() {}

  public static getInstance(): PersonalizationStore {
    if (!PersonalizationStore.instance) {
      PersonalizationStore.instance = new PersonalizationStore();
    }
    return PersonalizationStore.instance;
  }

  public getDefaultProfile(userId: string = 'default_user'): MusicPreferenceProfile {
    return {
      version: SCHEMA_VERSION,
      userId,
      explicitContentAllowed: true,
      preferredLanguages: ['Telugu', 'English', 'Hindi'],
      preferredGenres: {},
      blockedGenres: [],
      preferredArtists: {},
      blockedArtists: [],
      tempoPreference: 'any',
      energyPreference: 0.5,
      skipCount: 0,
      playCount: 0,
      lastUpdatedTimestamp: Date.now(),
    };
  }

  public loadProfile(userId: string = 'default_user'): MusicPreferenceProfile {
    if (this.inMemoryProfile) return this.inMemoryProfile;

    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        this.inMemoryProfile = this.getDefaultProfile(userId);
        return this.inMemoryProfile;
      }

      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const defaultProf = this.getDefaultProfile(userId);
        this.saveProfile(defaultProf);
        return defaultProf;
      }

      const parsed = JSON.parse(raw);
      const validated = this.validateAndSanitize(parsed, userId);
      this.inMemoryProfile = validated;
      return validated;
    } catch (err) {
      logger.warn('PersonalizationStore', `Failed to load persisted preferences: ${String(err)}. Resetting to defaults.`);
      const fallback = this.getDefaultProfile(userId);
      this.saveProfile(fallback);
      return fallback;
    }
  }

  public saveProfile(profile: MusicPreferenceProfile): boolean {
    const sanitized = this.validateAndSanitize(profile, profile.userId);
    sanitized.lastUpdatedTimestamp = Date.now();
    this.inMemoryProfile = sanitized;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      }
      return true;
    } catch (err) {
      logger.warn('PersonalizationStore', `LocalStorage save failed: ${String(err)}`);
      return false;
    }
  }

  public resetPreferences(userId: string = 'default_user'): MusicPreferenceProfile {
    logger.info('PersonalizationStore', `Resetting user preferences for [${userId}]`);
    const freshProfile = this.getDefaultProfile(userId);
    this.saveProfile(freshProfile);
    return freshProfile;
  }

  public exportPreferences(): string {
    const profile = this.loadProfile();
    return JSON.stringify(profile, null, 2);
  }

  public importPreferences(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      const sanitized = this.validateAndSanitize(parsed, parsed.userId || 'default_user');
      return this.saveProfile(sanitized);
    } catch (err) {
      logger.warn('PersonalizationStore', `Failed to import preference profile JSON: ${String(err)}`);
      return false;
    }
  }

  /**
   * Defensive Schema Validation & Prototype-Pollution Prevention
   */
  private validateAndSanitize(raw: any, defaultUserId: string): MusicPreferenceProfile {
    const defaults = this.getDefaultProfile(defaultUserId);
    if (!raw || typeof raw !== 'object') return defaults;

    // Prevent Prototype Pollution
    const cleanObj = (obj: any): Record<string, number> => {
      if (!obj || typeof obj !== 'object') return {};
      const res: Record<string, number> = {};
      for (const key of Object.keys(obj)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        const val = Number(obj[key]);
        if (!isNaN(val) && isFinite(val)) {
          res[String(key).slice(0, 50)] = Math.max(-1.0, Math.min(1.0, val));
        }
      }
      return res;
    };

    const cleanStrArray = (arr: any): string[] => {
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((item) => typeof item === 'string' && item.length > 0 && item !== '__proto__')
        .map((item) => String(item).slice(0, 50));
    };

    return {
      version: SCHEMA_VERSION,
      userId: typeof raw.userId === 'string' && raw.userId.length > 0 ? raw.userId.slice(0, 50) : defaultUserId,
      explicitContentAllowed: typeof raw.explicitContentAllowed === 'boolean' ? raw.explicitContentAllowed : true,
      preferredLanguages: cleanStrArray(raw.preferredLanguages).length > 0 ? cleanStrArray(raw.preferredLanguages) : defaults.preferredLanguages,
      preferredGenres: cleanObj(raw.preferredGenres),
      blockedGenres: cleanStrArray(raw.blockedGenres),
      preferredArtists: cleanObj(raw.preferredArtists),
      blockedArtists: cleanStrArray(raw.blockedArtists),
      tempoPreference: ['slow', 'medium', 'fast', 'any'].includes(raw.tempoPreference) ? raw.tempoPreference : 'any',
      energyPreference: typeof raw.energyPreference === 'number' && !isNaN(raw.energyPreference) ? Math.max(0, Math.min(1, raw.energyPreference)) : 0.5,
      skipCount: typeof raw.skipCount === 'number' && raw.skipCount >= 0 ? Math.floor(raw.skipCount) : 0,
      playCount: typeof raw.playCount === 'number' && raw.playCount >= 0 ? Math.floor(raw.playCount) : 0,
      lastUpdatedTimestamp: typeof raw.lastUpdatedTimestamp === 'number' ? raw.lastUpdatedTimestamp : Date.now(),
    };
  }
}

export const personalizationStore = PersonalizationStore.getInstance();
