/**
 * MusicMirror User Preferences API Client
 * Persists and retrieves user explicit music preferences from the backend SQLite database.
 */

export interface UserMusicPreference {
  user_id: string;
  discovery_mode: 'more_familiar' | 'balanced' | 'more_exploratory';
  energy_preference: 'low' | 'balanced' | 'high';
  tempo_preference: 'slow' | 'moderate' | 'fast';
  vocal_preference: 'vocal' | 'mixed' | 'instrumental';
  explicit_content_mode: 'allow' | 'filter' | 'hide';
  preferred_genres: string[];
  preferred_artists: string[];
  preferred_moods: string[];
  preferred_languages: string[];
}

export const DEFAULT_USER_PREFERENCES: UserMusicPreference = {
  user_id: 'default_user',
  discovery_mode: 'balanced',
  energy_preference: 'balanced',
  tempo_preference: 'moderate',
  vocal_preference: 'mixed',
  explicit_content_mode: 'filter',
  preferred_genres: ['Telugu Pop', 'Pop'],
  preferred_artists: ['Sid Sriram', 'Anirudh Ravichander'],
  preferred_moods: ['happy', 'romantic'],
  preferred_languages: ['Telugu', 'English'],
};

const API_BASE = 'http://127.0.0.1:8000/api/v2/user/preferences';

export class UserPreferencesApi {
  public static async fetchPreferences(userId: string = 'default_user'): Promise<UserMusicPreference> {
    try {
      const response = await fetch(API_BASE, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        ...DEFAULT_USER_PREFERENCES,
        ...data,
      };
    } catch (err) {
      console.warn('[UserPreferencesApi] Backend fetch warning, returning default preferences:', err);
      return DEFAULT_USER_PREFERENCES;
    }
  }

  public static async updatePreferences(
    updates: Partial<UserMusicPreference>,
    userId: string = 'default_user'
  ): Promise<UserMusicPreference> {
    try {
      const response = await fetch(API_BASE, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.warn('[UserPreferencesApi] Backend update failed:', err);
      throw err;
    }
  }

  public static async resetPreferences(userId: string = 'default_user'): Promise<UserMusicPreference> {
    try {
      const response = await fetch(`${API_BASE}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.warn('[UserPreferencesApi] Backend reset failed:', err);
      throw err;
    }
  }
}
