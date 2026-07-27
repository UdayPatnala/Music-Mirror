import axios from 'axios';

const isLocalhost = typeof window !== 'undefined' && Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]'
);

const defaultBackendUrl = isLocalhost
  ? 'http://localhost:8000'
  : 'https://emotion-music-recommender-wruw.onrender.com';

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || defaultBackendUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});
