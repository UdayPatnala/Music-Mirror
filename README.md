# Music Mirror

> **Emotion-Aware AI Music System** — Real-time facial emotion detection driving adaptive music playback.
> Originally developed as a **B.Tech CSE Final Year Project** by a team of 4 students, subsequently modernized and expanded into an enterprise-grade multi-provider audio streaming system.

[![Live App](https://img.shields.io/badge/Live-music--mirror--aos.vercel.app-black?style=for-the-badge&logo=vercel)](https://music-mirror-aos.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-UdayPatnala%2FMusic--Mirror-181717?style=for-the-badge&logo=github)](https://github.com/UdayPatnala/Music-Mirror)

---

## Authoritative Documentation

Music Mirror maintains **two authoritative master markdown documents** that govern all technical, architectural, and historical aspects of the project:

1. [PRODUCT_MASTER.md](file:///d:/PROJECT/Btech/Music%20Mirror/PRODUCT_MASTER.md)
   * The single source of truth for product specifications, system architecture, provider mechanics (YouTube, Spotify, Jamendo), privacy safeguards (TransmissionGate), state machines, and operational guidelines.
2. [VERSION_CONTROLLER.md](file:///d:/PROJECT/Btech/Music%20Mirror/VERSION_CONTROLLER.md)
   * The complete historical ledger, 4-tier semantic versioning system, academic project heritage and team roles, execution history, and release changelogs.

---

## What It Does

Music Mirror uses client-side computer vision to detect facial emotion in real time (happy, sad, calm, energetic, neutral) and dynamically recommends and plays music matching or shifting the user's emotional state.

* **100% Client-Side Biometrics**: Face detection runs entirely within browser WebGL via `face-api.js`. Camera frames never touch a server, disk, or network socket.
* **Multi-Provider Discovery**: YouTube (primary video discovery & official IFrame playback), Spotify (secondary metadata enhancement with cross-provider candidate matching), Jamendo CC (creative commons audio fallback), and Offline Catalog (zero-network resilient playback).
* **Privacy by Architecture**: Enforced by client-side `TransmissionGate`, ensuring zero PII or raw biometrics leak into API payloads.

---

## Architecture Overview

```
frontend/                 React 19 + TypeScript + Vite SPA
  src/
    architecture/         Strict 4-layer orchestration:
      EmotionLayer/       Facial landmark processing, EMA temporal smoothing, confidence thresholding
      IntentLayer/        Emotion-to-musical-intent mapping, valence/energy vector calculation
      DiscoveryLayer/     Multi-provider resolution (YouTube, Spotify, Jamendo, Offline fallback)
      PlaybackLayer/      Unified playback engine with YouTube IFrame & HTML5 Audio adapters
    components/           Camera, brand, biometric monitor, queue, audio controls
    store/                Zustand with localStorage persistence
    api/                  Backend API client with retry and deduplication
    types/                Shared TypeScript contracts

backend/                  Python FastAPI High-Performance Service
  app/
    api/routes/           Emotion recommendation, song search, health checks
    providers/            YouTube and Spotify discovery providers with circuit breakers & LRU cache
    services/             Recommendation engine, emotion mapping, cross-provider matching pool
  data/                   Song database and seed dataset
  tests/                  Pytest suite (150 tests covering providers, circuit breakers, endpoints)
```

---

## Quick Start

### 1. Frontend (Standalone Client)

```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:5173
```

### 2. Backend (Optional High-Performance Discovery Service)

```bash
cd backend
python -m venv .venv
# Activate venv: .venv\Scripts\Activate.ps1 (Windows) or source .venv/bin/activate (Linux/macOS)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# Running on http://localhost:8000 (Docs at /docs)
```

Alternatively, from the repository root:
```bash
uvicorn main:app --reload --port 8000
```

---

## Testing & Quality Assurance

Both suites maintain a 100% green test matrix:

```bash
# Frontend tests (Vitest: 307 tests)
npm --prefix frontend test -- --run

# Frontend linting (Oxlint)
npm --prefix frontend run lint

# Frontend production build check
npm --prefix frontend run build

# Backend tests (Pytest: 150 tests)
python -m pytest backend -q
```

---

## Music Providers

| Provider | Role | Technical Implementation |
|---|---|---|
| **YouTube** | Primary Discovery & Playback | Official YouTube IFrame API adapter, dual-mode fallback, yt-dlp discovery |
| **Spotify** | Secondary Metadata & Discovery | Client Credentials OAuth2, LRU cached, circuit breaker, cross-candidate matching |
| **Jamendo CC** | Secondary Audio Stream | Direct Creative Commons MP3 streaming via Jamendo v3 API |
| **Offline Catalog** | Resilient Fallback | Embedded catalog guaranteeing instant playback even with zero network connectivity |

---

## Privacy Architecture

1. **Client Isolation**: All inference (TinyFaceDetector + FaceExpressionNet) executes locally in browser memory.
2. **TransmissionGate**: Explicit cryptographic gating preventing camera frames, landmarks, or biometric vectors from entering network serialization pipelines.
3. **Local Storage Only**: User favorites, playback preferences, and emotion history reside exclusively in browser `localStorage`.
4. **Data Purge**: Dedicated privacy controls allow instant one-click sanitization of all local data.

---

## Authors & Governance

* **B.Tech CSE Project Team**: Initial prototype and foundational emotion recognition system developed by 4 students under departmental faculty guidance.
* **Production Architecture & Upgrades**: Modernized, layered architecture, multi-provider engine, and enterprise test suites developed and maintained by the Project Lead.
* Full governance, contributor credits, and version history are recorded in [VERSION_CONTROLLER.md](file:///d:/PROJECT/Btech/Music%20Mirror/VERSION_CONTROLLER.md).
