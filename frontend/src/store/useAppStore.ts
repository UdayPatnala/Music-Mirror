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

interface AppState {
    profile: UserProfile | null;
    setProfile: (profile: UserProfile) => void;
    clearProfile: () => void;

    // Continuous Playback State
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
    resetStoreToDefault: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            profile: DEFAULT_PROFILE,
            setProfile: (profile) => set({ profile }),
            clearProfile: () => set({
                profile: DEFAULT_PROFILE,
                currentSong: null,
                songsQueue: [],
                activeMood: 'neutral',
            }),

            currentSong: null,
            setCurrentSong: (currentSong) => set({ currentSong }),
            activeMood: 'neutral',
            setActiveMood: (activeMood) => set({ activeMood: activeMood || 'neutral' }),
            songsQueue: [],
            setSongsQueue: (songsQueue) => set({ songsQueue: Array.isArray(songsQueue) ? songsQueue : [] }),
            playerMode: 'jamendo',
            setPlayerMode: (playerMode) => set({ playerMode: playerMode || 'jamendo' }),
            favs: [],
            toggleFav: (song) => set((state) => {
                if (!song) return state;
                const key = (s: Song) => `${s.title || s.name}::${s.artist}`;
                const k = key(song);
                const currentFavs = Array.isArray(state.favs) ? state.favs : [];
                const exists = currentFavs.some((x) => key(x) === k);
                const nextFavs = exists
                    ? currentFavs.filter((x) => key(x) !== k)
                    : [song, ...currentFavs].slice(0, 20);
                return { favs: nextFavs };
            }),
            resetStoreToDefault: () => set({
                profile: DEFAULT_PROFILE,
                currentSong: null,
                activeMood: 'neutral',
                songsQueue: [],
                playerMode: 'jamendo',
                favs: [],
            }),
        }),
        {
            name: 'music-mirror-storage-v2',
            version: 2,
            migrate: (persistedState: any) => {
                if (!persistedState || typeof persistedState !== 'object') {
                    return {
                        profile: DEFAULT_PROFILE,
                        currentSong: null,
                        activeMood: 'neutral',
                        songsQueue: [],
                        playerMode: 'jamendo',
                        favs: [],
                    };
                }

                // Migration from v0/v1 to v2
                const migrated = { ...persistedState };
                if (!migrated.profile || typeof migrated.profile !== 'object') {
                    migrated.profile = DEFAULT_PROFILE;
                } else {
                    migrated.profile = {
                        ...DEFAULT_PROFILE,
                        ...migrated.profile,
                    };
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
