import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, Song } from '../types';

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
    playerMode: 'youtube' | 'spotify';
    setPlayerMode: (mode: 'youtube' | 'spotify') => void;
    favs: Song[];
    toggleFav: (song: Song) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            profile: null,
            setProfile: (profile) => set({ profile }),
            clearProfile: () => set({
                profile: null,
                currentSong: null,
                songsQueue: [],
                activeMood: 'neutral',
            }),

            currentSong: null,
            setCurrentSong: (currentSong) => set({ currentSong }),
            activeMood: 'neutral',
            setActiveMood: (activeMood) => set({ activeMood }),
            songsQueue: [],
            setSongsQueue: (songsQueue) => set({ songsQueue }),
            playerMode: 'youtube',
            setPlayerMode: (playerMode) => set({ playerMode }),
            favs: [],
            toggleFav: (song) => set((state) => {
                const key = (s: Song) => `${s.title || s.name}::${s.artist}`;
                const k = key(song);
                const exists = state.favs.some((x) => key(x) === k);
                const nextFavs = exists
                    ? state.favs.filter((x) => key(x) !== k)
                    : [song, ...state.favs].slice(0, 20);
                return { favs: nextFavs };
            }),
        }),
        { name: 'music-mirror-storage-v2' }
    )
);
