# Music Mirror V2 🎵✨

> **Production-Grade, Emotion-Aware Music Recommendation & Local/Git Audio Intelligence System**  
> Developed by **Patnala Uday Kumar**

[![Vercel Deployment](https://img.shields.io/badge/Frontend-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/udaypatnalas-projects/emotion-music-recommender)
[![Render Deployment](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://emotion-music-recommender-wruw.onrender.com/)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/UdayPatnala/Music-Mirror)

---

## 🚀 Overview

**Music Mirror V2** is an enterprise-class full-stack web application that uses real-time facial expression analysis to detect human emotions and dynamically curates tailored music playlists using acoustic feature vector matching (valence, energy, tempo) and cognitive goal transitions.

Beyond emotion-driven recommendation, Music Mirror V2 includes:
1. **Local Audio Disk Explorer**: Direct local folder scanning, drag-and-drop audio playback, and HTTP audio streaming for local `.mp3`, `.flac`, `.wav`, `.m4a`, and `.ogg` files.
2. **Git Repository Explorer**: Deep GitHub API integration to browse online repository file trees, inspect commits, and stream remote audio assets.
3. **Cognitive Evolution Engine**: Telemetry tracking that automatically adapts recommendation feature weights based on user skips, likes, and session durations.

---

## ✨ Key Features

- **Real-Time AI Facial Analysis**: Built with `face-api.js` for zero-latency browser-side emotion recognition (Happy, Sad, Angry, Neutral, Surprise).
- **Acoustic Vector Recommendation Engine**: Computes weighted Euclidean similarity scores matching facial emotion target profiles against song audio attributes.
- **Local Audio Disk Scanner**: Backend-assisted filesystem traversal allowing users to navigate drive letters (`C:\`, `D:\`), stream local tracks, and play direct audio.
- **Git Repo Explorer**: Connects to public GitHub repositories to stream audio and inspect codebase file hierarchies.
- **Spotify & YouTube Player Integration**: Seamlessly toggle between direct audio streaming, Spotify mood playlists, and YouTube video players.
- **Cognitive Self-Evolution**: Background telemetry engine recording skips and listens to refine vector weighting over time.

---

## 🛠️ Architecture & Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **UI & Styling**: Vanilla CSS with modern Glassmorphism & Cyberpunk Neon Aesthetics
- **State Management**: Zustand
- **Icons & Motion**: Lucide React + Framer Motion
- **AI Model**: Face-api.js (SSD MobileNet V1 / Tiny Face Detector)

### Backend
- **Framework**: Python 3.14 + FastAPI + Pydantic V2
- **Testing**: PyTest & Unittest (100% test coverage across recommendation algorithms & stress cases)
- **Deployment**: Render (Web Service) & Vercel (Static Frontend CDN)

---

## 🧪 Testing & Verification

### Running Backend Unit & Stress Tests
```bash
# Run PyTest unit tests
python -m pytest backend/tests

# Run recommender stress tests
python backend/tests/stress_test_recommender.py
```

### Building Frontend Bundle
```bash
cd frontend
npm run build
```

---

## 🌐 Live Deployments

- **Frontend Application**: [https://vercel.com/udaypatnalas-projects/emotion-music-recommender](https://vercel.com/udaypatnalas-projects/emotion-music-recommender)
- **Backend API**: [https://emotion-music-recommender-wruw.onrender.com/](https://emotion-music-recommender-wruw.onrender.com/)
- **GitHub Repository**: [https://github.com/UdayPatnala/Music-Mirror](https://github.com/UdayPatnala/Music-Mirror)

---

## 👤 Author

**Patnala Uday Kumar**  
*Sole Developer & Architect*  
GitHub: [@UdayPatnala](https://github.com/UdayPatnala)
