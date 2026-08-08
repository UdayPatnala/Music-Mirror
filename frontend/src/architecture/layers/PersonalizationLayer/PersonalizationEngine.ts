/**
 * Privacy-First Personalization Engine (STAGE 07 Implementation)
 * Handles incremental weight updates, exponential preference decay, manual overrides,
 * and feedback event processing without cloud LLMs or persistent emotional profiling.
 */

import type { MusicPreferenceProfile, MusicFeedbackEvent, FeedbackType } from '../../types/domain';
import { personalizationStore } from './PersonalizationStore';
import { logger } from '../ObservabilityLayer';

export class PersonalizationEngine {
  private static instance: PersonalizationEngine | null = null;
  private learningRate: number = 0.05;
  private decayFactor: number = 0.98;

  private constructor() {}

  public static getInstance(): PersonalizationEngine {
    if (!PersonalizationEngine.instance) {
      PersonalizationEngine.instance = new PersonalizationEngine();
    }
    return PersonalizationEngine.instance;
  }

  public getPreferences(): MusicPreferenceProfile {
    return personalizationStore.loadProfile();
  }

  public updatePreferences(partial: Partial<MusicPreferenceProfile>): MusicPreferenceProfile {
    const current = this.getPreferences();
    const updated: MusicPreferenceProfile = {
      ...current,
      ...partial,
      lastUpdatedTimestamp: Date.now(),
    };
    personalizationStore.saveProfile(updated);
    logger.info('PersonalizationEngine', 'User updated preference profile');
    return updated;
  }

  /**
   * Process Feedback Event & Apply Incremental Learning Weights
   */
  public recordFeedback(event: Partial<MusicFeedbackEvent> & { type: FeedbackType; candidateId: string }): MusicPreferenceProfile {
    const profile = this.getPreferences();

    const artist = (event.artist || '').trim();
    const genre = (event.genre || '').trim();
    const completionRatio = typeof event.completionRatio === 'number' ? Math.max(0, Math.min(1, event.completionRatio)) : 0.5;

    // Apply exponential decay to old preferences before update
    this.applyPreferenceDecay(profile);

    switch (event.type) {
      case 'LIKE':
        if (genre) this.adjustGenreWeight(profile, genre, 0.25);
        if (artist) this.adjustArtistWeight(profile, artist, 0.30);
        profile.playCount++;
        break;

      case 'DISLIKE':
        if (genre) this.adjustGenreWeight(profile, genre, -0.40);
        if (artist) this.adjustArtistWeight(profile, artist, -0.50);
        profile.skipCount++;
        break;

      case 'SKIP':
        if (completionRatio < 0.25) {
          if (genre) this.adjustGenreWeight(profile, genre, -0.10);
          if (artist) this.adjustArtistWeight(profile, artist, -0.15);
        }
        profile.skipCount++;
        break;

      case 'COMPLETED':
        if (completionRatio >= 0.85) {
          if (genre) this.adjustGenreWeight(profile, genre, this.learningRate);
          if (artist) this.adjustArtistWeight(profile, artist, this.learningRate * 1.5);
        }
        profile.playCount++;
        break;

      case 'REPLAY':
        if (genre) this.adjustGenreWeight(profile, genre, 0.20);
        if (artist) this.adjustArtistWeight(profile, artist, 0.25);
        profile.playCount++;
        break;

      case 'ADD_PREFERENCE':
        if (genre) profile.preferredGenres[genre] = 1.0;
        if (artist) profile.preferredArtists[artist] = 1.0;
        break;

      case 'REMOVE_PREFERENCE':
        if (genre) delete profile.preferredGenres[genre];
        if (artist) delete profile.preferredArtists[artist];
        break;

      case 'MANUAL_SELECTION':
        if (genre) this.adjustGenreWeight(profile, genre, 0.15);
        if (artist) this.adjustArtistWeight(profile, artist, 0.20);
        profile.playCount++;
        break;

      default:
        break;
    }

    // Adapt energy preference tendency
    if (typeof event.energy === 'number' && (event.type === 'LIKE' || event.type === 'COMPLETED')) {
      profile.energyPreference = Math.round((profile.energyPreference * 0.9 + event.energy * 0.1) * 100) / 100;
    }

    personalizationStore.saveProfile(profile);
    logger.info('PersonalizationEngine', `Recorded feedback [${event.type}] for candidate [${event.candidateId}]`);
    return profile;
  }

  public blockArtist(artist: string): MusicPreferenceProfile {
    const profile = this.getPreferences();
    const norm = artist.trim();
    if (norm && !profile.blockedArtists.includes(norm)) {
      profile.blockedArtists.push(norm);
      profile.preferredArtists[norm] = -1.0;
      personalizationStore.saveProfile(profile);
      logger.info('PersonalizationEngine', `Blocked artist [${norm}]`);
    }
    return profile;
  }

  public unblockArtist(artist: string): MusicPreferenceProfile {
    const profile = this.getPreferences();
    const norm = artist.trim();
    profile.blockedArtists = profile.blockedArtists.filter((a) => a.toLowerCase() !== norm.toLowerCase());
    if (profile.preferredArtists[norm] && profile.preferredArtists[norm] < 0) {
      delete profile.preferredArtists[norm];
    }
    personalizationStore.saveProfile(profile);
    logger.info('PersonalizationEngine', `Unblocked artist [${norm}]`);
    return profile;
  }

  public blockGenre(genre: string): MusicPreferenceProfile {
    const profile = this.getPreferences();
    const norm = genre.trim();
    if (norm && !profile.blockedGenres.includes(norm)) {
      profile.blockedGenres.push(norm);
      profile.preferredGenres[norm] = 0.0;
      personalizationStore.saveProfile(profile);
      logger.info('PersonalizationEngine', `Blocked genre [${norm}]`);
    }
    return profile;
  }

  public unblockGenre(genre: string): MusicPreferenceProfile {
    const profile = this.getPreferences();
    const norm = genre.trim();
    profile.blockedGenres = profile.blockedGenres.filter((g) => g.toLowerCase() !== norm.toLowerCase());
    if (profile.preferredGenres[norm] === 0.0) {
      delete profile.preferredGenres[norm];
    }
    personalizationStore.saveProfile(profile);
    logger.info('PersonalizationEngine', `Unblocked genre [${norm}]`);
    return profile;
  }

  public resetPreferences(): MusicPreferenceProfile {
    return personalizationStore.resetPreferences();
  }

  public exportPreferences(): string {
    return personalizationStore.exportPreferences();
  }

  public importPreferences(jsonString: string): boolean {
    return personalizationStore.importPreferences(jsonString);
  }

  /**
   * Helper: Incremental weight adjustment with clamping [-1.0, 1.0]
   */
  private adjustGenreWeight(profile: MusicPreferenceProfile, genre: string, delta: number): void {
    const current = profile.preferredGenres[genre] || 0.5;
    const updated = Math.max(0.0, Math.min(1.0, current + delta));
    profile.preferredGenres[genre] = Math.round(updated * 100) / 100;
  }

  private adjustArtistWeight(profile: MusicPreferenceProfile, artist: string, delta: number): void {
    const current = profile.preferredArtists[artist] || 0.0;
    const updated = Math.max(-1.0, Math.min(1.0, current + delta));
    profile.preferredArtists[artist] = Math.round(updated * 100) / 100;
  }

  /**
   * Helper: Controlled Exponential Decay (lambda = 0.98)
   */
  private applyPreferenceDecay(profile: MusicPreferenceProfile): void {
    for (const key of Object.keys(profile.preferredGenres)) {
      profile.preferredGenres[key] = Math.round(profile.preferredGenres[key] * this.decayFactor * 100) / 100;
    }
    for (const key of Object.keys(profile.preferredArtists)) {
      if (profile.preferredArtists[key] > 0) {
        profile.preferredArtists[key] = Math.round(profile.preferredArtists[key] * this.decayFactor * 100) / 100;
      }
    }
  }
}

export const personalizationEngine = PersonalizationEngine.getInstance();
