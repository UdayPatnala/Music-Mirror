# Music Mirror Architecture Survey & Codebase Analysis

## 1. Executive Summary
Music Mirror is a full-stack AI-driven Emotion-to-Music discovery and playback web application. The codebase is organized as a decoupled **FastAPI (Python 3.14 / SQLAlchemy 2.0)** backend and a **React 19 + TypeScript + Vite 8** frontend. 
The system operates on a zero-user-cost model: emotion detection is performed client-side using ace-api.js (TensorFlow.js WASM/WebGL), audio search is conducted via yt-dlp metadata extraction and public APIs (Jamendo / iTunes), and audio/video playback is executed exclusively via legitimate browser mechanisms (YouTube IFrame Player API and HTML5 Audio elements).

Both test suites are in an operating state:
- **Backend**: 116/116 PyTest test cases passing.
- **Frontend**: 68/68 Vitest test cases passing; production Vite build passes with 0 errors.

---

## 2. Codebase Structure & Directory Tree

`
d:\PROJECT\Btech\Music Mirror\
+-- ARCHITECTURE.md                  # Comprehensive architectural specification
+-- PROJECT_GUARDIAN.md              # Single source of truth & core philosophy
+-- PROJECT_STATE.md                 # Current release and verification matrix
+-- README.md                        # Project documentation
+-- requirements.txt                 # Root Python requirements (fastapi, uvicorn)
+-- main.py                          # Root entrypoint exposing FastAPI pp
+-- vercel.json                      # Vercel deployment routing configuration
¦
+-- backend/                         # FastAPI Python Backend
¦   +-- alembic.ini                  # Alembic DB migration config
¦   +-- app/
¦   ¦   +-- main.py                  # FastAPI app factory, CORS, routers, auto-seed
¦   ¦   +-- api/
¦   ¦   ¦   +-- routes/
¦   ¦   ¦       +-- admin.py         # Admin endpoints
¦   ¦   ¦       +-- health.py        # Health & observability checks
¦   ¦   ¦       +-- interactions.py  # User interaction logging
¦   ¦   ¦       +-- local_explorer.py# Local catalog browser
¦   ¦   ¦       +-- recommendations.py# Emotion recommendation endpoints
¦   ¦   ¦       +-- reports.py       # Playback self-healing & problem reporting
¦   ¦   ¦       +-- songs.py         # Song catalog, taxonomy & YouTube search
¦   ¦   ¦       +-- telemetry.py     # System telemetry ingest
¦   ¦   ¦       +-- user_preferences.py# Privacy-first user preference CRUD
¦   ¦   +-- core/
¦   ¦   ¦   +-- auth.py              # User authentication & identity injection
¦   ¦   ¦   +-- config.py            # App settings (CORS, URLs)
¦   ¦   ¦   +-- governance.py        # Circuit breakers & safe mode governance
¦   ¦   ¦   +-- rate_limiter.py      # Token bucket rate limiting
¦   ¦   +-- db/
¦   ¦   ¦   +-- backup.py            # User data export & GDPR account deletion
¦   ¦   ¦   +-- database.py          # SQLAlchemy engine, WAL mode, get_db session
¦   ¦   ¦   +-- models.py            # SQLite schema (Song, Artist, SongSource, etc.)
¦   ¦   +-- ingestion/
¦   ¦   ¦   +-- cli.py               # Ingestion CLI tool
¦   ¦   ¦   +-- deduplication.py     # 3-level deduplication engine
¦   ¦   ¦   +-- ingestion_service.py # Idempotent catalog upsert service
¦   ¦   ¦   +-- normalizer.py        # String/title noise stripping & extraction
¦   ¦   ¦   +-- seed_data.py         # Curated seed catalog dataset
¦   ¦   ¦   +-- seed_real_catalog.py # Extended real-world catalog
¦   ¦   ¦   +-- youtube_provider.py  # yt-dlp metadata extraction provider
¦   ¦   +-- schemas/
¦   ¦   ¦   +-- __init__.py
¦   ¦   ¦   +-- emotion.py           # EmotionRequest, SongResponse, RecommendationResponse
¦   ¦   ¦   +-- song.py              # SongDTO, SongCreateDTO, PaginatedSongsResponse
¦   ¦   ¦   +-- taxonomy.py          # GenreDTO, MoodDTO, TagDTO, SongSourceDTO
¦   ¦   ¦   +-- user_preference.py   # UserMusicPreferenceDTO
¦   ¦   +-- services/
¦   ¦       +-- auto_discovery_service.py # iTunes/Jamendo real-time discovery
¦   ¦       +-- catalog_reconciliation.py# Catalog reconciliation
¦   ¦       +-- cognitive_engine.py      # Cognitive intent processing
¦   ¦       +-- identity_resolution.py   # Entity resolution
¦   ¦       +-- interaction_service.py   # User interaction telemetry
¦   ¦       +-- metadata_orchestrator.py # External source orchestration
¦   ¦       +-- ml_model_ecosystem.py    # Local ML model inference
¦   ¦       +-- mlops_pipeline.py        # MLOps pipeline & model tracking
¦   ¦       +-- recommendation_engine.py # Euclidean emotion matching & personalization
¦   ¦       +-- self_healing_engine.py   # Autonomous Canary source repair
¦   ¦       +-- source_discovery.py      # AudioSourceProvider & verification
¦   +-- data/
¦   ¦   +-- music_mirror.db          # SQLite persistent database
¦   ¦   +-- songs.json               # Static catalog fallback
¦   +-- migrations/                  # Alembic schema versions
¦   +-- tests/                       # 17 PyTest test suites (116 tests)
¦
+-- frontend/                        # React 19 + TypeScript + Vite Frontend
    +-- package.json                 # React 19, Vite 8, Vitest, Zustand, face-api.js
    +-- vite.config.ts               # Vite build config with manual chunk splitting
    +-- tsconfig.json                # TypeScript project configuration
    +-- index.html                   # HTML entrypoint
    +-- public/                      # Static assets, models (face-api.js weights)
    +-- src/
        +-- main.tsx                 # React DOM root entry
        +-- App.tsx                  # React Router routes (/, /room, /profile, /dashboard, /summary)
        +-- index.css                # Global design system & theme variables
        +-- architecture/
        ¦   +-- types/domain.ts      # Canonical domain types & interfaces
        ¦   +-- layers/
        ¦   ¦   +-- CameraDriver.ts  # WebRTC camera video stream capture
        ¦   ¦   +-- EmotionLayer.ts  # face-api.js inference & temporal stabilization
        ¦   ¦   +-- MusicIntentLayer.ts # EmotionState -> MusicIntent mapping & prefetch sets
        ¦   ¦   +-- DiscoveryLayer.ts# Multi-provider discovery engine & 15m cache
        ¦   ¦   +-- ObservabilityLayer.ts # Telemetry, perf markers, session trace
        ¦   ¦   +-- PersonalizationLayer/
        ¦   ¦   ¦   +-- PersonalizationEngine.ts # Incremental learning & decay
        ¦   ¦   ¦   +-- PersonalizationScorer.ts # 50% Intent + 35% Pref scoring
        ¦   ¦   ¦   +-- PersonalizationStore.ts  # LocalStorage v1.0.0 persistence
        ¦   ¦   +-- PlaybackLayer/
        ¦   ¦   ¦   +-- PlaybackProvider.ts # Universal playback engine interface
        ¦   ¦   ¦   +-- YouTubePlaybackAdapter.ts # Google YouTube IFrame API adapter
        ¦   ¦   ¦   +-- HTML5AudioPlaybackAdapter.ts # HTML5 audio stream adapter
        ¦   ¦   +-- ProviderAdapterLayer/
        ¦   ¦       +-- MusicProviderAdapter.ts # Music discovery provider interface
        ¦   ¦       +-- YouTubeProviderAdapter.ts # YouTube provider adapter
        ¦   ¦       +-- JamendoProviderAdapter.ts # Jamendo CC provider adapter
        ¦   ¦       +-- RoyaltyFreeFallbackAdapter.ts # Offline emergency audio fallback
        ¦   +-- orchestrator/
        ¦   ¦   +-- SessionOrchestrator.ts # Playback state machine & recovery engine
        ¦   ¦   +-- ApplicationOrchestrator.ts # Continuous real-time frame loop
        ¦   +-- __tests__/           # 8 Vitest architecture test suites
        +-- components/              # Camera, Brand, Navbar, NetworkStatusIndicator
        +-- config/                  # appConfig.ts, emotionLabels.ts
        +-- domain/                  # Legacy domain types
        +-- pages/                   # MoodRoom, LandingPage, DashboardPage, ProfilePage, SummaryPage
        +-- services/                # userPreferencesApi.ts
        +-- store/                   # useAppStore.ts (Zustand state store)
`

---

## 3. Technology Stack & Language Versions

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend Language** | Python | 3.14.3 | Core backend API, ingestion, recommendation |
| **Backend Framework** | FastAPI | >=0.115.0 | High-performance async REST API framework |
| **Database ORM** | SQLAlchemy | 2.0+ | Relational ORM with SQLite WAL mode |
| **Metadata Extraction** | yt-dlp | Latest | YouTube search metadata extraction without audio download |
| **Backend Testing** | PyTest + pytest-asyncio | pytest 9.0.3 | Unit, integration, stress, governance test suite |
| **Frontend Language** | TypeScript | ~6.0.2 | Strict static typing across components and domain models |
| **Frontend Framework** | React + React DOM | 19.2.7 | UI presentation and reactive state management |
| **Routing** | React Router DOM | 7.18.1 | Client-side page navigation |
| **Build Bundler** | Vite | 8.1.1 (8.1.5) | Fast ESM development and optimized production bundling |
| **Frontend State** | Zustand | 5.0.14 | Centralized persistent store with LocalStorage middleware |
| **Facial Inference** | face-api.js (tfjs-wasm) | 0.22.2 | Client-side privacy-first observable emotion detection |
| **Frontend Testing** | Vitest | 4.1.10 | Fast unit & integration test runner |
| **Linter** | Oxlint | 1.71.0 | Fast Rust-based linter |

---

## 4. Existing YouTube Integration Points & Playback Flow

### 4.1 Backend Ingestion & Search (ackend/app/ingestion/youtube_provider.py)
- **Class**: YouTubeMetadataProvider
- **Mechanism**: Invokes yt_dlp.YoutubeDL with {extract_flat: in_playlist, skip_download: True, quiet: True}.
- **Search Query**: Executes search queries via ytsearch{limit}:{query} format.
- **Metadata Returned**: source_type=youtube, source_id (11-char video ID), source_url, aw_title, channel_name, duration (seconds), 	humbnail_url, published_at, iew_count.
- **Zero Copyright Violation**: No audio or video streams are downloaded or stored on server disks.

### 4.2 Backend YouTube API Router (ackend/app/api/routes/songs.py)
- **Endpoint**: GET /api/v2/songs/youtube-search?q={query}&limit={10}
  - Calls YouTubeMetadataProvider().search_metadata(q, limit=limit).
  - Calculates a baseline word-overlap relevance score between normalized query and title.
  - Returns List[YouTubeSearchResultDTO] (ideo_id, 	itle, channel_name, duration, duration_str, 	humbnail_url, watch_url, elevance_score).
- **Endpoint**: GET /api/v2/songs/{song_id}/source
  - Fetches the active SongSource record for a canonical song entity with priority and health scoring.

### 4.3 Frontend Playback Adapter (rontend/src/architecture/layers/PlaybackLayer/YouTubePlaybackAdapter.ts)
- **Class**: YouTubePlaybackAdapter implements PlaybackProvider.
- **API**: Dynamically injects the official Google YouTube IFrame API script (https://www.youtube.com/iframe_api).
- **Player Container**: Mounts to DOM element via .bindElement(elementId) (element #youtube-player-element in MoodRoom.tsx).
- **Lifecycle & Events**:
  - load(candidate): Loads video via window.YT.Player.loadVideoById(videoId).
  - play(), pause(), esume(), seek(seconds), setVolume(0-100), setMute(boolean), stop().
  - Event listeners on onStateChange (PLAYING, PAUSED, ENDED) and onError (code 2, 5, 100, 101, 150).
  - Ticker interval emits periodic 	imeupdate events.

### 4.4 Frontend Discovery Adapter (rontend/src/architecture/layers/ProviderAdapterLayer/YouTubeProviderAdapter.ts)
- **Class**: YouTubeProviderAdapter implements MusicProviderAdapter.
- **Method**: searchCandidates(intent, constraints, limit) returns normalized MusicCandidate[] with playbackCapability: 'officialEmbed'.
- **Embed URL**: getPlaybackEmbedUrl(candidate) creates privacy-enhanced https://www.youtube-nocookie.com/embed/{videoId}?autoplay=1&rel=0&modestbranding=1.

### 4.5 Orchestrator & State Machine (rontend/src/architecture/orchestrator/SessionOrchestrator.ts)
- **States**: IDLE -> SEARCHING -> PREPARING -> PLAYING / PAUSED / BUFFERING / NO_PLAYABLE_MUSIC / ERROR.
- **Candidate Broadening**: 5-step fallback search (level 0: direct intent, level 1: relaxed genres/languages, level 2: broadened specificity, level 3: neutral intent, level 4: royalty-free offline catalog).
- **Recovery Engine**: On playback error, retries once, then flags candidate as unplayable and advances to the next candidate in the queue.

### 4.6 UI Player Page (rontend/src/pages/MoodRoom.tsx)
- **Search Bar**: Sends requests to ${appConfig.apiBaseUrl}/api/v2/songs/youtube-search?q={searchQuery}.
- **Embedded Player**: Embeds #youtube-player-element for active YouTube playback.
- **Player Fallback**: Contains 	riggerFallback() which automatically skips unplayable or embedding-restricted videos to the next queued track.
- **Audio Controls**: Custom glassmorphism UI for Play/Pause, Skip Next, Skip Previous, Progress Seek, Volume Slider, Mute Toggle, and Re-sync Mood Match.

---

## 5. Existing Test Suites & Runners

### 5.1 Backend Test Suite (PyTest)
- **Command**: python -m pytest tests (executed from ackend/ directory or with PYTHONPATH=backend).
- **Configuration**: Uses in-memory SQLite database (sqlite:///:memory:) with StaticPool and FastAPI dependency_overrides for get_db.
- **Test Modules (17 files, 116 tests total)**:
  1. 	ests/test_autonomous_governance.py (5 tests) — Circuit breakers, auto safe-mode.
  2. 	ests/test_catalog_endpoints.py (8 tests) — Filtering by genre, mood, tags, energy, valence, taxonomy meta endpoints, and /source resolution.
  3. 	ests/test_database_and_ingestion.py (8 tests) — Idempotent ingestion, deduplication, schema relationships.
  4. 	ests/test_database_capacity_and_recovery.py (4 tests) — High volume DB capacity and crash recovery.
  5. 	ests/test_m1_contracts_edge_cases.py (32 tests) — Pydantic schema validation, default factories, serialization.
  6. 	ests/test_m2_catalog_edge_cases.py (7 tests) — Query parameter bounds, missing data handling.
  7. 	ests/test_m2_empirical_stress.py (6 tests) — High-throughput search and pagination latency.
  8. 	ests/test_ml_model_ecosystem.py (6 tests) — ML model lifecycle and predictions.
  9. 	ests/test_mlops_pipeline.py (5 tests) — Model versioning and drift detection.
  10. 	ests/test_personalization_engine.py (6 tests) — User affinity updates, exponential decay, hard blocklist enforcement.
  11. 	ests/test_production_governance.py (3 tests) — Governance audit trail and reversible rollbacks.
  12. 	ests/test_recommender.py (9 tests) — Euclidean distance emotion matching, multi-language filtering, diversity penalties.
  13. 	ests/test_security_and_isolation.py (3 tests) — User data isolation and injection protection.
  14. 	ests/test_self_healing_engine.py (5 tests) — Canary source repair, playback failure classification, source promotion.
  15. 	ests/test_shared_contracts.py (5 tests) — Shared contracts and taxonomy mapping.
  16. 	ests/test_user_preferences.py (4 tests) — User preference CRUD, reset, and GDPR account deletion.
  17. 	ests/stress_test_recommender.py — High-load recommender benchmark.

### 5.2 Frontend Test Suite (Vitest)
- **Command**: 
pm test or 
px vitest run (executed from rontend/ directory).
- **Configuration**: Uses jsdom environment with custom mocks for performance.now, localStorage, Audio, and ace-api.js.
- **Test Modules (9 files, 68 tests total)**:
  1. src/architecture/__tests__/architecture.test.ts (6 tests) — Architecture layer validation.
  2. src/architecture/__tests__/discovery_engine.test.ts (7 tests) — Multi-provider registration, cache hit/miss, prefetching, candidate deduplication.
  3. src/architecture/__tests__/emotion_engine.test.ts (9 tests) — Temporal window stabilization, raw frame smoothing, fallback state.
  4. src/architecture/__tests__/end_to_end_orchestration.test.ts (8 tests) — Full loop from camera observation to playback, cold-start fast path, failure injection recovery.
  5. src/architecture/__tests__/hardening_validation.test.ts (9 tests) — Boundary values, malformed inputs, corrupted cache recovery.
  6. src/architecture/__tests__/intent_engine.test.ts (8 tests) — Target vector calculation, policy selection, prefetch intent sets.
  7. src/architecture/__tests__/personalization_engine.test.ts (9 tests) — Feedback recording, weight updates, decay, composite scoring.
  8. src/architecture/__tests__/playback_engine.test.ts (7 tests) — YouTube and HTML5 adapter lifecycle, autoplay handling, queue advancement.
  9. src/__tests__/domain.test.ts (5 tests) — TypeScript domain model contracts.

---

## 6. Target Architectural Gaps & Upgrade Roadmap

Based on the survey and ORIGINAL_REQUEST.md, the following areas represent the target upgrade requirements:

1. **Query Intelligence & Candidate Discovery (R1)**:
   - Current: Single search string queried directly against yt-dlp or iTunes.
   - Target: Intelligent query rewriting (e.g. normalizing artist + track names, query expansion with keyword variants such as + official audio, + lyrical, + original), and retrieving an expanded pool of 10-25 candidates.

2. **Weighted Scoring & Relevance Ranking (R2)**:
   - Current: Simple word overlap score (overlap / query_length).
   - Target: Multi-feature weighted scoring model combining:
     - Levenshtein / Token similarity with title noise stripping.
     - Channel authority / official artist channel bonus (VEVO, - Topic, verified).
     - Target duration congruence (penalizing 1-hour loops or 30-second shorts).
     - Recency and view count signals.

3. **In-App Official Playback Experience (R3)**:
   - Current: Basic IFrame mount in MoodRoom.tsx with external control hooks.
   - Target: Deeply integrated embedded player experience with full state machine synchronization (Play, Pause, Seek, Volume, Buffering, Fullscreen, Loading, Error overlays).

4. **Automated Verification & Fallback Ladder (R4)**:
   - Current: Frontend skips to next song only after an error event triggers.
   - Target: Fast pre-playback playability verification, bounded 3-second fallback transition between candidates, automated query expansion retry if all candidate videos fail, and graceful error handling.

5. **Optimization (Caching & Deduplication) (R5)**:
   - Current: 15-minute in-memory cache in frontend DiscoveryLayer; backend queries yt-dlp directly without cache.
   - Target: Two-tier caching (Query Cache + Video Metadata Cache with TTL) on backend/frontend, in-flight request deduplication (SingleFlight pattern for concurrent identical queries), and predictive background preparation of next candidate.

6. **Observability & Diagnostics (R6)**:
   - Current: Basic console log events and session trace memory array.
   - Target: Telemetry recording discovery latency, candidate counts, recovery success rates, and failure classifications.
