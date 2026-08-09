# Music Mirror V2 🎵

> **Emotion-Aware AI Music Player** — Real-time facial emotion detection driving adaptive music playback.  
> Developed by **Patnala Uday Kumar** — BTech Final Year Project

[![Live App](https://img.shields.io/badge/Live-music--mirror--aos.vercel.app-black?style=for-the-badge&logo=vercel)](https://music-mirror-aos.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-UdayPatnala%2FMusic--Mirror-181717?style=for-the-badge&logo=github)](https://github.com/UdayPatnala/Music-Mirror)

---

## What It Does

MusicMirror uses your webcam to detect your emotion in real time (happy, sad, calm, energetic, etc.) and automatically selects music that matches or improves your mood. All AI inference runs **100% in-browser** — no camera data is sent to any server.

---

## Architecture

```
frontend/          React 19 + TypeScript + Vite SPA
  src/
    pages/         LandingPage, MoodRoom, DashboardPage, ProfilePage, SummaryPage
    components/    Camera (face-api.js), Brand (Wordmark/CDDisc), NetworkStatusIndicator
    store/         useAppStore.ts — Zustand with persist middleware (localStorage)
    architecture/  Layered orchestration: EmotionLayer → IntentLayer → DiscoveryLayer → PlaybackLayer
    config/        appConfig.ts — centralised env-backed config
    utils/         security.ts — input sanitisation
    types/         index.ts — shared TypeScript interfaces

backend/           Python FastAPI (optional — app works fully offline without it)
  app/             FastAPI routes (emotion recommendation, transition engine)
  data/            Song dataset CSV
  tests/           PyTest unit + stress tests
```

**Data flow:**  
`Camera → EmotionLayer → MusicIntentLayer → DiscoveryLayer (Jamendo CC API / offline fallback) → HTML5 Audio playback`

**State:** Zustand store (`music-mirror-storage-v2` in localStorage). All data is local-only. No backend auth required.

---

## Quick Start (Frontend Only — Recommended)

```bash
git clone https://github.com/UdayPatnala/Music-Mirror.git
cd "Music Mirror/frontend"
npm install
cp .env.example .env.local   # optional, defaults work out of the box
npm run dev
# → http://localhost:5173
```

No backend required. Music is streamed from Jamendo CC API directly in the browser.

---

## Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | No | `http://localhost:8000` | Optional backend API URL |
| `VITE_JAMENDO_CLIENT_ID` | No | `c8993883` (public) | Jamendo API client ID |

Copy `frontend/.env.example` to `frontend/.env.local` and edit as needed.

---

## Available Routes

| Route | Page | Purpose |
|---|---|---|
| `/` | LandingPage | Entry point — animated CD intro, onboarding |
| `/room` | MoodRoom | Main player — webcam, emotion, audio, queue |
| `/dashboard` | DashboardPage | AI Lab — live emotion charts, face landmarks, biometric panel |
| `/profile` | ProfilePage | User profile, favorites, privacy controls |
| `/summary` | SummaryPage | Project abstract + architecture |

---

## Scripts

```bash
# Development
npm run dev              # Vite dev server on :5173

# Tests
npm run test             # Vitest (68 unit + integration tests)

# Build
npm run build            # Production bundle → frontend/build/

# Type check
npx tsc -b --noEmit

# Backend (optional)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload   # API on :8000
```

---

## Music Providers

| Provider | Type | Notes |
|---|---|---|
| **Jamendo CC** | Primary | Free CC-licensed MP3 streams via Jamendo v3.0 API |
| **Offline Fallback** | Fallback | Built-in catalog of 20+ hardcoded Jamendo streams |
| **YouTube** | Legacy catalog | Hardcoded video IDs for UI demo only (no real playback) |

The player auto-falls back to the offline catalog if the Jamendo API is unreachable.

---

## AI & Biometric System

- **Model**: `face-api.js` TinyFaceDetector + FaceExpressionNet (WebGL)
- **Models location**: `frontend/public/models/`
- **Processing**: 100% client-side — no frames stored or transmitted
- **Emotion classes**: happy, sad, angry, disgusted, fearful, surprised, neutral
- **EMA smoothing**: 10-frame temporal window, α=0.25

---

## Privacy Model

- **Camera data**: Processed in WebGL. Raw frames are never stored or sent.
- **Biometric data**: Facial landmark coordinates are computed in-memory and discarded after each frame.
- **Emotion history**: Stored in localStorage only, never transmitted.
- **User data controls**: Available in `/profile` → Privacy Controls section:
  - Clear Favorites
  - Clear Playback History
  - Delete All My Data (purges localStorage completely)

---

## Reliability & Recovery

Since MusicMirror is a **client-only SPA** with no database:

| What can be recovered | How |
|---|---|
| User profile + favorites | Stored in `localStorage` key `music-mirror-storage-v2` — survives page refresh |
| Music catalog | Rebuilt from Jamendo API on load, or from offline fallback catalog |
| Configuration | Rebuilt from env vars + hardcoded defaults |

| What cannot be recovered | Reason |
|---|---|
| localStorage if user clears browser data | By design — user-initiated |
| Camera session state | Ephemeral, not stored |

**Rollback**: Vercel deploys are immutable — roll back via Vercel Dashboard → Deployments → Promote previous deployment.

---

## Deployment

Frontend is deployed to Vercel automatically on push to `main`.

```
vercel.json — rewrites all routes to index.html (SPA routing)
```

Manual deploy:
```bash
cd frontend
npm run build
# Upload frontend/build/ to any static host (Vercel, Netlify, GitHub Pages)
```

---

## Security Model

- No auth tokens, no user accounts, no server-side sessions
- All API keys are public (Jamendo public client ID is freely distributed)
- Input sanitised via `frontend/src/utils/security.ts` (`sanitizeInputText`)
- CSP headers set via Vercel (`vercel.json`)
- No raw camera frames stored; no biometric data persisted

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Camera not starting | Grant browser camera permission; use HTTPS or localhost |
| No audio plays | Browser autoplay policy — click Play button once to unlock audio context |
| Face not detected | Ensure face is well-lit and fully visible; models load from `/models/` |
| Jamendo tracks silent | Check browser console for CORS errors; try refreshing |
| Build fails | Run `npx tsc -b --noEmit` first to surface type errors |
| Vercel 404 on refresh | Ensure `vercel.json` rewrites are present |

---

## Known Limitations

- YouTube player shows hardcoded catalog metadata only (no real YouTube playback due to API key requirements)
- Spotify integration is UI-only (no OAuth implemented)
- Emotion accuracy depends on lighting and webcam quality
- Mobile camera support varies by browser
- Jamendo API has rate limits (~60 req/min on the public key)

---

## Author

**Patnala Uday Kumar** — B.Tech Final Year Project, 2026
