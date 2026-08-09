import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, Song } from '../types';

const DEFAULT_PROFILE: UserProfile = {
  name: "Guest Listener",
  email: "guest@musicmirror.ai",
  genre: "Telugu Pop",
  goal: "Match my mood",
  languages: ["Telugu", "English", "Tamil", "Hindi"],
  favoriteArtists: ["S.P. Balasubrahmanyam", "Sid Sriram", "Shreya Ghoshal", "Anirudh", "A.R. Rahman"],
  savedSongs: [],
};

const STORAGE_KEY = 'music-mirror-storage-v2';

interface AppState {
    profile: UserProfile | null;
    setProfile: (profile: UserProfile) => void;
    clearProfile: () => void;

    currentSong: Song | null;
    setCurrentSong: (song: Song | null) => void;
    activeMood: string;
    setActiveMood: (mood: string) => void;
    songsQueue: Song[];
    setSongsQueue: (songs: Song[]) => void;
    playerMode: 'youtube' | 'jamendo' | 'local' | 'spotify';
    setPlayerMode: (mode: 'youtube' | 'jamendo' | 'local' | 'spotify') => void;
    favs: Song[];
    toggleFav: (song: Song) => void;
    clearFavs: () => void;
    clearPlaybackHistory: () => void;
    resetStoreToDefault: () => void;
    /** GDPR/Privacy: wipe all persisted data from localStorage and reset state */
    purgeAllData: () => void;
}

const RESET_STATE = {
    profile: DEFAULT_PROFILE,
    currentSong: null as Song | null,
    activeMood: 'neutral',
    songsQueue: [] as Song[],
    playerMode: 'jamendo' as const,
    favs: [] as Song[],
};

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            ...RESET_STATE,

            setProfile: (profile) => set({ profile }),
            clearProfile: () => set({ profile: DEFAULT_PROFILE, currentSong: null, songsQueue: [], activeMood: 'neutral' }),

            setCurrentSong: (currentSong) => set({ currentSong }),
            setActiveMood: (activeMood) => set({ activeMood: activeMood || 'neutral' }),
            setSongsQueue: (songsQueue) => set({ songsQueue: Array.isArray(songsQueue) ? songsQueue : [] }),
            setPlayerMode: (playerMode) => set({ playerMode: playerMode || 'jamendo' }),

            toggleFav: (song) => set((state) => {
                if (!song) return state;
                const key = (s: Song) => `${s.title || s.name}::${s.artist}`;
                const k = key(song);
                const currentFavs = Array.isArray(state.favs) ? state.favs : [];
                const exists = currentFavs.some((x) => key(x) === k);
                return {
                    favs: exists
                        ? currentFavs.filter((x) => key(x) !== k)
                        : [song, ...currentFavs].slice(0, 20),
                };
            }),

            clearFavs: () => set({ favs: [] }),
            clearPlaybackHistory: () => set({ currentSong: null, songsQueue: [], activeMood: 'neutral' }),
            resetStoreToDefault: () => set(RESET_STATE),

            purgeAllData: () => {
                try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
                set(RESET_STATE);
            },
        }),
        {
            name: STORAGE_KEY,
            version: 2,
            migrate: (persistedState: any) => {
                if (!persistedState || typeof persistedState !== 'object') return { ...RESET_STATE };

                const migrated = { ...persistedState };
                if (!migrated.profile || typeof migrated.profile !== 'object') {
                    migrated.profile = DEFAULT_PROFILE;
                } else {
                    migrated.profile = { ...DEFAULT_PROFILE, ...migrated.profile };
                }
                if (!Array.isArray(migrated.songsQueue)) migrated.songsQueue = [];
                if (!Array.isArray(migrated.favs)) migrated.favs = [];
                if (!migrated.activeMood || typeof migrated.activeMood !== 'string') migrated.activeMood = 'neutral';
                if (!['youtube', 'jamendo', 'local', 'spotify'].includes(migrated.playerMode)) migrated.playerMode = 'jamendo';
                return migrated;
            },
        }
    )
);
