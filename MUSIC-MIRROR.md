# MUSIC MIRROR — PROJECT MASTER SPECIFICATION & KNOWLEDGE BASE

> **AUTHORITATIVE LIVING SYSTEM RECORD**  
> Current Authoritative Version: `2.06.01.0`  
> System Classification: Headless Music Intelligence & Affective Playback Orchestration Engine  
> Architecture Governance: `A.BC.DE.F` (Universal Version Control & Change Governance System)  
> Operational Priority: **Core First — Useful Data Only — Privacy by Architecture**

---

## 1. Project Identity

- **Project Title**: Music Mirror
- **Short Identifier**: MM
- **Project Type**: Decoupled Music Intelligence, Context-Aware Discovery, Metadata Normalization, and Playback Orchestration System.
- **Current Status**: `VERIFIED & HARDENED` (Headless Core, Universal Modular Architecture, Change-Isolation Governance, Transmission Gate, Acoustic DSP & Production UI Theme Operational).
- **Current Authoritative Version**: `2.06.01.0`
- **Primary Repositories & Roots**:
  - Root: `d:\PROJECT\Btech\Music Mirror`
  - GitHub Remote: `https://github.com/UdayPatnala/Music-Mirror.git` (`origin/main`)
- **Runtime Targets**:
  - Frontend: React 19 / Vite / TypeScript Single Page Application (SPA)
  - Backend: FastAPI (Python 3.12/3.14) / SQLAlchemy 2.0 / SQLite WAL
- **Core Purpose**:
  Transform user emotional, environmental, or textual context into deterministic musical intent, discover high-relevance candidate tracks across diverse external and local providers, normalize disparate metadata into canonical schemas, verify real-time playability, and orchestrate resilient audio playback with zero-PII telemetry and sub-3-second failover recovery.

---

## 2. Motive

Most existing music applications conflate the user interface with the underlying business logic, relying on fragile client-side scraping, superficial music-player widgets, or opaque AI hallucinations that invent non-existent track titles and artist pairings.

Music Mirror exists to establish a **headless, reliable, and mathematically grounded music intelligence engine** that separates:
1. Emotion inference and subjective intent from playback mechanics.
2. Candidate discovery from factual entity resolution.
3. Metadata availability from actual playback availability.
4. Application-level consent from browser device permissions.

### Core Problems Solved
- **Fragility of Single-Source Streaming**: If a video is region-locked or embed-restricted (YouTube Error 150/101), traditional players crash or freeze. MM executes an automated sub-3-second sequential fallback ladder.
- **Metadata Noise & Inconsistent Entities**: Video titles on public platforms are polluted with noise (`[Official Video]`, `(Remix 4K)`, `Lyrics`). MM applies a multi-pass normalization pipeline and deterministic Levenshtein resolution.
- **Privacy Intrusion**: Conventional affective systems stream webcam video to cloud servers. MM performs 100% in-browser facial classification via local neural models, immediately discarding raw image frames.

---

## 3. Vision

The long-term vision of Music Mirror is an **ambient, provider-agnostic music reflection environment** capable of understanding human psychological states and guiding affect through harmonic transitions (Alchemical Journeys).

### Product Philosophy
- **Useful over decorative**: Every byte stored and rendered must serve an explicit, justifiable functional purpose.
- **Correct over impressive**: Deterministic truth always supersedes probabilistic AI estimates.
- **Working over polished**: The headless engine must function autonomously before cosmetic UI elements are applied.
- **Privacy by Architecture**: Privacy boundaries are enforced by software architecture, not merely by policy text.

### Technical Philosophy
- **UI as an Observer**: The UI layer is strictly a reactive observer of `MusicMirrorCore`. It holds zero business logic, cannot trigger un-gated hardware access, and does not directly query external providers.
- **Fail-Safe Orchestration**: Network outages, blocked permissions, rate limits, and restricted media are treated as standard operating conditions rather than exceptional crashes.

---

## 4. Goals

### Current Goals (Active Core Phase)
1. Maintain 100% test pass rate across frontend and backend suites (236 Vitest / 143 Pytest).
2. Enforce strict capability and consent gating before any browser sensor access (Camera/Microphone).
3. Ensure zero PII in observability logs and zero persistence of raw sensory context.
4. Sustain sub-3000ms SLA for query-to-playback resolution and automated error recovery.
5. Keep bundle footprints minimal (CSS < 10KB, zero cosmetic animations).

### Long-Term Goals
1. Offline IndexedDB audio caching with PWA ServiceWorker background streaming (`v2.04.03.0`).
2. Acoustic audio fingerprinting and real-time DSP spectrum validation.
3. Bi-directional affective regulation models calibrated to individual listener heart-rate/galvanic feedback.
4. Multi-room synchronized audio mesh support.

---

## 5. Scope

### In Scope
- Client-side and server-side multi-pass query normalization (Unicode NFKD, noise token stripping).
- Candidate pool discovery across YouTube Data API v3, YouTube IFrame, Jamendo API, and local SQLite catalogs.
- Multi-factor composite ranking combining string similarity, channel authority, duration proximity, popularity, and recency.
- In-flight request deduplication (SingleFlight pattern) and multi-tier L1/L2 caching.
- Headless playback state machine (`IDLE`, `LOADING`, `READY`, `PLAYING`, `PAUSED`, `BUFFERING`, `STOPPING`, `ENDED`, `ERROR`).
- Sub-3-second failover ladder across YouTube error codes (150, 101, 100, 2, 5).
- Affective regulation journeys (e.g., Melancholy → Serene via intermediate valence/energy stepping).
- Centralized `CapabilityRegistry`, `ConsentRecord`, `ProviderRegistry`, and `DataClassifier`.

### Out of Scope
- Social networking, follower graphs, and public comment feeds.
- Unauthorized local file system scraping or background disk scans.
- Cloud streaming of raw biometric video feeds or audio recordings.
- Uncontrolled third-party advertising or telemetry trackers.
- Decorative 60 FPS visualizer canvases during the headless core phase.

---

## 6. Target Users

1. **Focused Knowledge Workers & Programmers**: Requiring distraction-free, low-latency background acoustic focus without manual playlist curating.
2. **Affective Computing & Musicology Researchers**: Investigating the correlation between Russell's circumplex model of affect (valence/arousal) and harmonic musical modes.
3. **Privacy-Conscious Music Enthusiasts**: Users who demand high-fidelity music streaming without ad tracking, browser fingerprinting, or biometric exploitation.

---

## 7. Features

| Feature ID | Feature Name | Description | Status | Relevant Modules |
|---|---|---|---|---|
| **F01** | Multi-Pass Query Normalizer | Cleans punctuation, handles NFKD diacritics, strips noise tokens (`Official Video`, `Remix`), extracts artist and title. | `IMPLEMENTED` | `QueryNormalizationService.ts`, `youtube_discovery.py` |
| **F02** | Multi-Candidate Pool Discovery | Fetches 10 to 25 candidate items matching query criteria with metadata enrichment. | `IMPLEMENTED` | `YouTubeDiscoveryService.ts`, `youtube_provider.py` |
| **F03** | Multi-Factor Weighted Scoring | Ranks candidates using similarity (0.35), channel authority (0.25), duration proximity (0.20), popularity (0.10), and recency (0.10). | `IMPLEMENTED` | `ranking_service.py`, `PersonalizationScorer.ts` |
| **F04** | Channel Authority & Token Filter | Rewards VEVO, Topic, and Verified badges; heavily penalizes covers, live recordings, and loops. | `IMPLEMENTED` | `ranking_service.py` |
| **F05** | Headless Playback Orchestration | Central coordinator managing playback states, queue position, audio volume, and provider dispatch. | `IMPLEMENTED` | `MusicMirrorCore.ts` |
| **F06** | Sub-3s Fallback Recovery Ladder | Automatically cycles to next ranked candidate upon encountering restricted embeds (150/101) or invalid parameters. | `IMPLEMENTED` | `YouTubeRecoveryEngine.ts`, `MusicMirrorCore.ts` |
| **F07** | Query Strategy Expansion Retry | Automatically broadens search constraints across 4 escalation levels if candidates fail to resolve. | `IMPLEMENTED` | `MusicMirrorCore.ts`, `DiscoveryLayer.ts` |
| **F08** | Multi-Tier Caching & Deduplication | L1 memory cache (30m TTL), L2 metadata cache (24h TTL), and SingleFlight concurrent request lock. | `IMPLEMENTED` | `YouTubeDiscoveryService.ts`, `cache_service.py` |
| **F09** | True Emotion Context Engine | Maps 7 core affective archetypes onto Russell circumplex plane (valence: 0.0–1.0, energy: 0.0–1.0, target BPM, harmonic mode). | `IMPLEMENTED` | `MusicMirrorCorePage.tsx`, `EmotionLayer.ts` |
| **F10** | Alchemical Journey Transition | Calculates intermediate multi-track stepping path to guide user from negative affect to serene baseline. | `IMPLEMENTED` | `MusicIntentLayer.ts`, `recommender.py` |
| **F11** | Centralized Capability Registry | State machine managing `CAMERA`, `MICROPHONE`, `NOTIFICATIONS`, `LOCAL_STORAGE` with external revocation tracking. | `IMPLEMENTED` | `CapabilityRegistry.ts` |
| **F12** | Transient In-Browser Face Detection | Local face-api.js neural inference detecting facial expression; frames discarded immediately without storage or network egress. | `IMPLEMENTED` | `Camera.tsx` |
| **F13** | Application Consent Store | Session-only consent persistence (`purpose`, `decision`, `timestamp`, `policyVersion`) with withdrawal gates. | `IMPLEMENTED` | `ConsentRecord.ts` |
| **F14** | Third-Party Provider Registry | Formal audit log of all external endpoints, transmitted fields, received fields, user control level, and failover behavior. | `IMPLEMENTED` | `ProviderRegistry.ts` |
| **F15** | Data Classification & Retention | 9-tier data classification system enforcing zero persistence for `SENSITIVE_CONTEXT` and bounded TTL for `TEMPORARY_DATA`. | `IMPLEMENTED` | `DataClassifier.ts` |
| **F16** | Diagnostic Reliability Test Harness | Built-in workbench drawer simulating Error 150, network blackouts, latency benchmarks, and L1 cache purges. | `IMPLEMENTED` | `MusicMirrorCorePage.tsx` |
| **F17** | Acoustic DSP Soundwave Visualizer | HTML5 Canvas 60 FPS waveform animation reflecting energy, valence, and tempo. | `REMOVED` | Stripped in v2.04.02.0 per core-first directive. |
| **F18** | Interactive Circumplex Radar | SVG Cartesian radar visualization for manual coordinate picking. | `REMOVED` | Stripped in v2.04.02.0 per core-first directive. |
| **F19** | Offline IndexedDB Audio Cache | Client-side metadata and audio cache with LRU eviction and memory fallback. | `IMPLEMENTED` | `OfflineAudioCache.ts`, `MusicMirrorCore.ts` |

---

## 8. Functional Workflows

### 8.1 Affective Discovery & Mirroring Workflow
```text
[User selects Emotion or enables Camera]
               │
               ▼
[Camera.tsx displays purpose disclosure]
               │
      (User Clicks "Enable")
               │
               ▼
[CapabilityRegistry.request('CAMERA')]
               │
     (Local face-api.js inference)
               │
               ▼
[Extract Emotion & Confidence] ──> [Immediately discard frame]
               │
               ▼
[Compute Blended Valence & Energy]
               │
               ▼
[MusicMirrorCore.searchTracks(intentQuery)]
               │
               ├──> [Check L1/L2 Discovery Cache]
               │
               ├──> [If miss: SingleFlight locks duplicate requests]
               │
               └──> [Fetch Candidate Pool (10..25 items)]
                               │
                               ▼
               [Multi-Factor Weighted Ranking]
                               │
                               ▼
               [Select Best Candidate & Enqueue Queue]
                               │
                               ▼
               [Dispatch to YouTubePlaybackAdapter]
```

### 8.2 Sub-3s Fallback Recovery Ladder
```text
[YouTube IFrame Player triggers onError]
               │
               ├── Code 150 / 101 (Embed Restricted / Private)
               ├── Code 100 (Video Not Found / Removed)
               └── Code 2 / 5 (HTML5 / Invalid Parameter)
               │
               ▼
[MusicMirrorCore.reportFailure(code)]
               │
               ▼
[Increment Failover Counter in Observability Circular Buffer]
               │
               ▼
[Invalidate current candidate in local pool]
               │
               ▼
[Advance to Candidate (n+1) in Queue]
               │
    (Is Fallback within < 3000ms?) ──> YES: Telemetry records SLA Pass
               │
               ▼
[If Pool Exhausted: Execute Query Expansion Escalation (Levels 1-4)]
               │
               ▼
[If All Strategies Fail: Transition cleanly to NO_PLAYABLE_MUSIC state]
```

---

## 9. Technology Stack

| Component / Layer | Technology | Version | Usage & Responsibility | Architectural Rationale |
|---|---|---|---|---|
| **Frontend Framework** | React | `^19.0.0` | UI reactive state observation and DOM synchronization. | High-performance concurrent rendering; modern hooks-first paradigm. |
| **Language (Web)** | TypeScript | `~5.7.2` | Strong static typing across canonical domain models, contracts, and layers. | Eliminates runtime interface drift; enforces strict data schemas. |
| **Bundler / Tooling** | Vite / Rolldown | `^8.1.5` | Development hot-reloading and production ESM asset packaging. | Sub-500ms build times; optimized treeshaking and chunk splitting. |
| **Linter** | Oxlint | `^0.15.11` | Rust-based high-speed static code analysis. | Instantaneous CI validation; strict lint rules without Babel overhead. |
| **Test Runner (Web)** | Vitest | `^4.1.10` | Unit and integration testing across frontend layers and permission machines. | Native ESM support; mock compatibility with JSDOM and browser APIs. |
| **ML Inference (Web)** | face-api.js | `^0.22.2` | Local TensorFlow.js weights for facial affect classification. | 100% in-browser edge computing; zero camera frame transmission. |
| **Backend Framework** | FastAPI | `^0.115.0` | High-throughput async REST API serving song catalog and recommendations. | Native OpenAPI schemas, Pydantic data validation, async ASGI performance. |
| **Language (Server)**| Python | `3.12 / 3.14`| Server-side ingestion pipelines, heuristic ranking, and recommendation models. | Rich ecosystem for mathematical ranking and audio metadata processing. |
| **ORM / Database** | SQLAlchemy | `^2.0.0` | Database abstraction layer interacting with SQLite. | Type-safe queries, connection pooling, Alembic migration compatibility. |
| **Storage Engine** | SQLite (WAL) | `3.x` | Lightweight local relational persistence for songs, albums, and artists. | Zero external infrastructure overhead; sub-millisecond local reads. |
| **Test Runner (API)** | Pytest | `^8.0.0` | Integration and unit testing for all backend endpoints and ML layers. | Comprehensive fixture system; parameterized edge-case validation. |

---

## 10. Architecture

### 10.1 High-Level Component Topology
```text
┌────────────────────────────────────────────────────────────────────────┐
│                          REACT 19 FRONTEND                             │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                 MusicMirrorCore (Headless Singleton)            │   │
│   │                                                                │   │
│   │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │   │
│   │  │  Playback State  │  │   Queue Manager  │  │ Latency Mon  │  │   │
│   │  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │   │
│   └───────────┼─────────────────────┼───────────────────┼──────────┘   │
│               │                     │                   │              │
│               ▼                     ▼                   ▼              │
│   ┌───────────────────────┐ ┌──────────────────────────────────────┐   │
│   │ YouTubeRecoveryEngine │ │      YouTubeDiscoveryService         │   │
│   │ (Sub-3s Failover)     │ │   (L1/L2 Cache + SingleFlight)       │   │
│   └───────────┬───────────┘ └───────────────────┬──────────────────┘   │
│               │                                 │                      │
│               ▼                                 ▼                      │
│   ┌───────────────────────┐ ┌──────────────────────────────────────┐   │
│   │ YouTubePlaybackAdapter│ │          CapabilityRegistry          │   │
│   │  (IFrame API Mount)   │ │  (Camera, Mic, Storage, Revocation)  │   │
│   └───────────────────────┘ └──────────────────────────────────────┘   │
└─────────────────────────────────────────┬──────────────────────────────┘
                                          │ HTTP / REST
                                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          FASTAPI BACKEND                               │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                   Agnostic Metadata Orchestrator               │   │
│   │                                                                │   │
│   │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │   │
│   │  │ Catalog Service  │  │ Weighted Ranking │  │ Recommender  │  │   │
│   │  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │   │
│   └───────────┼─────────────────────┼───────────────────┼──────────┘   │
│               ▼                     ▼                   ▼              │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │            SQLite Database (WAL Mode / 200 Song Dataset)       │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Architectural Boundaries & Rules
1. **Zero Provider Leakage**: Components outside the adapter layer (`YouTubeDiscoveryService`, `YouTubePlaybackAdapter`) must never handle raw YouTube video objects. All items are converted to canonical `Track` entities upon ingress.
2. **Deterministic Fallbacks**: If the backend is completely offline, `MusicMirrorCore` automatically transitions to standalone operation, utilizing local synthetic audio URIs and offline candidate resolution.
3. **No Direct Hardware Probing**: UI components must never call `navigator.mediaDevices.getUserMedia()` directly. Every request routes through `CapabilityRegistry.request()`.

---

## 11. Repository / File Structure

```text
Music Mirror/
├── .agents/                               # Multi-agent orchestrator configurations and governance rules
├── backend/                               # Python FastAPI backend application
│   ├── app/
│   │   ├── api/routes/                    # REST route controllers (songs, catalog, recommend, mlops)
│   │   ├── core/                          # Security, config, database session, rate limiting
│   │   ├── database/                      # SQLAlchemy models and database connection
│   │   ├── ingestion/                     # Metadata ingestion, YouTube and Jamendo providers
│   │   ├── schemas/                       # Pydantic validation DTOs and contracts
│   │   └── services/                      # Weighted ranking, cache service, self-healing logic
│   ├── migrations/                        # Alembic migration scripts
│   ├── tests/                             # 20 Pytest suites (143 passing tests)
│   ├── main.py                            # ASGI entrypoint
│   └── requirements.txt                   # Backend dependencies
├── data/
│   └── songs.json                         # 200-song canonical seed dataset
├── docs/                                  # Architectural specifications, audits, execution logs
│   ├── BTECH_PROJECT_REPORT.md            # Academic B.Tech project report
│   ├── EXECUTION_HISTORY.md               # Monotonic execution milestone register
│   ├── OMNISTREAM_ARCHITECTURAL_LESSONS.md# Forensic audit of OmniStream & U-Tube
│   └── VERSION_HISTORY.md                 # Detailed semantic release history
├── frontend/                              # React 19 client application
│   ├── public/                            # Static assets and local face-api neural weights (/models)
│   ├── src/
│   │   ├── api/                           # API client with health checking and fallback mocking
│   │   ├── architecture/                  # Layered architecture implementation
│   │   │   ├── contracts/                 # Shared data contracts
│   │   │   ├── layers/                    # Discovery, Emotion, Playback, Observability layers
│   │   │   └── orchestrator/              # SessionOrchestrator and failover ladder
│   │   ├── components/                    # Functional UI components (Camera.tsx)
│   │   ├── config/                        # appConfig.ts (environment-aware settings)
│   │   ├── core/                          # MusicMirrorCore.ts (headless orchestration engine)
│   │   ├── domain/                        # Canonical domain models (Track, Source, Provenance)
│   │   ├── pages/                         # MusicMirrorCorePage.tsx (minimal functional control surface)
│   │   ├── permissions/                   # Centralized Privacy & Capability architecture
│   │   │   ├── CapabilityRegistry.ts      # Device state machine and revocation listener
│   │   │   ├── ConsentRecord.ts           # Session-only application consent store
│   │   │   ├── DataClassifier.ts          # 9-tier data classification & retention definitions
│   │   │   ├── ProviderRegistry.ts        # Third-party service audit registry
│   │   │   └── __tests__/                 # Vitest permission & privacy test suites (92 tests)
│   │   ├── services/                      # YouTubeDiscoveryService, YouTubeRecoveryEngine
│   │   └── index.css                      # Lean functional stylesheet (420 lines, zero animations)
│   ├── tests/e2e/                         # 4-tier E2E feature coverage test suite
│   ├── package.json                       # Client dependencies (v2.04.02.1)
│   └── vite.config.ts                     # Build configuration
├── CHANGELOG.md                           # Monotonic release change register
├── MUSIC-MIRROR.md                        # Authoritative Project Master Knowledge Base
├── README.md                              # Public introduction and quickstart
├── SYSTEM_DEFINITION.md                   # Authoritative system definition and operating philosophy
├── TECHNICAL_SPECIFICATION.md             # Detailed engineering specifications
└── VERSION_CONTROLLER.md                  # Authoritative version ledger & release status
```

---

## 12. Data Model

### 12.1 Canonical Entities (`frontend/src/domain/canonical.ts`)

```typescript
export interface Track {
  id: string;                      // Canonical deterministic ID: `yt_${videoId}` or `jam_${id}`
  title: string;                   // Cleaned, noise-free track title
  artist: string;                  // Primary artist name
  album?: string;                  // Album name (if available)
  durationSeconds: number;         // Track duration in seconds
  artworkUrl?: string;             // Validated thumbnail / cover URL
  acousticFeatures?: {             // Affective acoustic parameters
    valence: number;               // 0.0 (somber) to 1.0 (cheerful)
    energy: number;                // 0.0 (calm) to 1.0 (intense)
    tempo: number;                 // Beats per minute (BPM)
    mode: 'major' | 'minor';       // Harmonic tonality
  };
  primarySource: TrackSource;      // Verified streaming source
  backupSources: TrackSource[];    // Alternate sources for automated failover
  metadata: {
    language?: string;             // ISO language tag or common name
    genre?: string;                // Normalized genre classification
    isrc?: string;                 // International Standard Recording Code
    provenance: 'LOCAL_CATALOG' | 'YOUTUBE_API' | 'JAMENDO' | 'FALLBACK';
  };
}

export interface TrackSource {
  sourceType: 'youtube' | 'jamendo' | 'audio_url';
  streamUrl: string;               // Direct media URL or YouTube 11-char video ID
  format: 'iframe' | 'mp3' | 'aac';
  isPlayable: boolean;
  provenance: string;
}
```

### 12.2 Database Schema (`backend/app/database/models.py`)
- **`songs` table**:
  - `id`: Integer Primary Key (Autoincrement)
  - `title`: String(255), Index
  - `artist`: String(255), Index
  - `genre`: String(100), Index
  - `mood`: String(100), Index
  - `valence`: Float (0.0 to 1.0)
  - `energy`: Float (0.0 to 1.0)
  - `tempo`: Float (BPM)
  - `duration`: Integer (Seconds)
  - `youtube_id`: String(32), Unique, Index
  - `created_at`: DateTime (UTC)

---

## 13. API / Integration Layer

### 13.1 Core Endpoints (`backend/app/api/routes/`)
- `GET /health`: System health, database connection check, active provider, API version.
- `GET /api/v2/songs`: Filtered catalog query (`genre`, `mood`, `artist`, `limit`, `offset`).
- `GET /api/v2/songs/search`: Fuzzy title/artist query search with Levenshtein normalization.
- `GET /api/v2/songs/youtube-search`: External YouTube candidate pool retrieval (limit: 10..25) with server-side weighted scoring and in-memory TTL caching.
- `POST /api/v2/recommend`: Affective recommendation engine matching input emotion, mood policy (`reflect`, `regulate`, `catharsis`), and acoustic bounds.
- `POST /api/v2/playback/report`: Playback failure reporting for self-healing source switching.

### 13.2 External Integration Boundaries
- **YouTube Data API v3**: Quota-aware video metadata search. Server-side caching strictly bounds external API quota consumption.
- **YouTube IFrame Player API**: Client-side playback container (`#youtube-player-container`). Zero API keys are exposed to client JavaScript.
- **face-api.js Weights**: Loaded locally from `/models` directory on the origin server. No external CDN dependencies for neural execution.

---

## 14. Security

1. **Zero Client Secret Exposure**: All third-party API keys (YouTube API, Jamendo tokens) are stored exclusively in backend `.env` files and injected via server environment variables.
2. **Strict User Data Isolation**: In backend routes, user queries and preference updates are scoped by `current_user` dependency injection (`get_current_user`). No cross-tenant data leakage is possible.
3. **Untrusted External Ingress**: All responses from YouTube and external scrapers pass through Pydantic DTO sanitizers (`YouTubeCandidateDTO`) before reaching the domain layer.
4. **Content Security Compliance**: Iframes are locked to `https://www.youtube-nocookie.com` where possible, preventing third-party cookie persistence.

---

## 15. Privacy & Compliance

### 15.1 Core Privacy Principles (Spec §1, §2)
- **Minimum Access, Minimum Data, Minimum Retention, Maximum Transparency**: Access is requested only when a specific feature is activated.
- **Separation of Consent from Browser Permission**: Browser prompt approval is not treated as universal consent. Application consent must be granted first.

### 15.2 Privacy Architecture Components
- **`CapabilityRegistry.ts`**: Centralized gate for all device APIs. Precludes direct calls to `getUserMedia`. Automatically registers Permissions API watchers to catch external revocation.
- **`ConsentRecord.ts`**: Session-only storage (`sessionStorage`). Contains `purpose`, `decision`, `timestamp`, `policyVersion`. Stale policy versions invalidate old consent records immediately.
- **`DataClassifier.ts`**: 9-tier classification system. Explicitly marks `camera.raw_frame` and `camera.pixel_data` as `SENSITIVE_CONTEXT`, mandating `maxAgeSeconds: 0` (zero persistence).
- **`ProviderRegistry.ts`**: Formal inventory of third-party data flows, proving zero external transmission from client-side ML components.

### 15.3 DPDP Act 2023 (India) Compliance Alignment
- Notice and purpose specification precede any camera interaction.
- Transient processing ensures that biometric data is not stored or processed off-device.
- One-click withdrawal (`Disable Camera`) immediately shuts down media tracks, cancels pending detection loops, and releases video elements.

---

## 16. Performance & Reliability

### 16.1 Benchmarks & SLA Targets
- **Resolution SLA**: Candidate pool resolution and query ranking must complete in **< 3000ms**.
- **L1 Cache Speed**: Repeated discovery queries are served from in-memory cache in **< 5ms**.
- **Automated Fallback**: Sub-3-second transition to the next ranked candidate upon YouTube embed errors (Error 150/101).

### 16.2 Concurrency & SingleFlight Protection
- `SingleFlight` registry locks duplicate concurrent requests for identical query strings.
- `_inFlightRequests` in `CapabilityRegistry` deduplicates simultaneous permission calls, preventing browser prompt race conditions.

---

## 17. Testing

### 17.1 Test Matrix
- **Frontend Test Suite (Vitest)**: **236 / 236 PASSED** across 14 test suites:
  - `src/permissions/__tests__/capability.test.ts` (26 tests): Full state machine, concurrency, external revocation, guidance strings.
  - `src/permissions/__tests__/consent.test.ts` (23 tests): Session isolation, version invalidation, withdrawal.
  - `src/permissions/__tests__/classifier_and_providers.test.ts` (43 tests): Sensitivity classification, retention rules, data minimization audit.
  - `tests/e2e/tier1_feature_coverage.test.ts` (70 tests): End-to-end multi-tier feature verification (F1–F14).
  - Additional domain, recovery, and architecture suites (74 tests).
- **Backend Test Suite (Pytest)**: **143 / 143 PASSED** across 20 test files (M1/M2 edge cases, ranking algorithms, rate limiters, self-healing engine).
- **Static Analysis (Oxlint)**: 0 errors, 0 warnings across 48 files.
- **Type Checking (TypeScript)**: `tsc -b --noEmit` exits cleanly with code 0.
- **Production Packaging**: `vite build` succeeds in < 500ms with zero bundling errors.

---

## 18. Errors & Bugs (Historical Register)

| Issue ID | Date / Version | Symptoms | Root Cause | Affected Area | Resolution / Fix | Status |
|---|---|---|---|---|---|---|
| **BUG-01** | 2026-08-31 (`v2.00.00.1`) | Unit tests failing in headless Node/JSDOM environments. | `Audio` constructor undefined in non-browser execution contexts. | `MusicMirrorCore.ts` | Added conditional check `typeof window !== 'undefined'` and mock initialization. | `RESOLVED` |
| **BUG-02** | 2026-09-19 (`v2.04.01.1`) | UI header displayed `ENGINE: OFFLINE` when the backend was not running. | `checkHealth()` catch block set `health.status = 'OFFLINE'`, overriding the core engine's ready state. | `MusicMirrorCorePage.tsx` | Decoupled client-side engine beacon (`READY`) from API connectivity pill (`STANDALONE`). | `RESOLVED` |
| **BUG-03** | 2026-09-20 (`v2.04.02.0`) | Camera auto-activated on page mount without user action. | `useEffect` in `Camera.tsx` loaded models and requested `getUserMedia` automatically. | `Camera.tsx` | Replaced with explicit `NOT_REQUESTED` consent gate requiring user to click "Enable Camera". | `RESOLVED` |
| **BUG-04** | 2026-09-20 (`v2.04.02.1`) | `clearAllConsent()` failed in test environment. | `Object.keys(sessionStorage)` returned method keys rather than stored items in JSDOM mock. | `ConsentRecord.ts` | Refactored key collection to standard index loop `sessionStorage.key(i)`. | `RESOLVED` |
| **BUG-05** | 2026-09-20 (`v2.04.02.1`) | Simultaneous permission requests triggered multiple browser prompts. | Concurrent calls bypassed the in-memory state check before resolving. | `CapabilityRegistry.ts` | Implemented `_inFlightRequests` Map to join concurrent executions to the same promise. | `RESOLVED` |

---

## 19. Decisions (Architectural Decision Records)

- **AD-01: Headless Core Separation**: The business logic, state machines, and failover ladders must reside entirely in `MusicMirrorCore.ts` and associated services, ensuring the system functions independently of any UI view.
- **AD-02: SQLite WAL for Catalog**: Local relational storage uses SQLite in Write-Ahead Logging mode for fast read concurrency and zero network infrastructure dependencies.
- **AD-03: No Raw Sensory Persistence**: Camera frames are processed locally and discarded immediately. No image or biometric data is ever written to disk or sent to servers.
- **AD-04: Session-Only Consent Storage**: User permission consent is stored in `sessionStorage` rather than `localStorage` to prevent unintended cross-session authorization retention.
- **AD-05: Sub-3s SLA Fallback Ladder**: Playback recovery must switch to the next valid candidate within 3000ms upon receiving YouTube embed restrictions (150/101).
- **AD-06: Strict Core-First Freeze on UI/UX**: Decorative styling, animations, canvas widgets, and cosmetic badges are forbidden until the underlying engine is fully verified.
- **AD-07: Standardized Version Hierarchy (`A.BC.DE.F`)**: Version numbers strictly follow the universal standard (`MAJOR.SUBVERSION.FUNCTIONAL.PATCH`).
- **AD-08: In-Flight Concurrency Deduplication**: Simultaneous identical requests join a shared executing promise across discovery and capability checks to protect resources and prevent race conditions.

---

## 20. Guardrails & Rules

1. **Golden Rule of Modification**: Never modify code merely because it "looks better." Every change must have a technical reason grounded in correctness, performance, security, or reliability.
2. **No Factual AI Fabrication**: Machine learning and AI models must never invent or overwrite factual track identifiers, artist names, or canonical metadata.
3. **No Unannounced Device Probing**: No component may request camera, microphone, or sensor access without an explicit prior disclosure of purpose.
4. **No Git Writes Without Authorization**: Commit, push, reset, or branch deletion operations on remote repositories require explicit user directive.
5. **No Decorative Bloat in Core Phase**: Do not reintroduce emojis, gradients, soundwave canvas visualizers, or radar charts until the core verification gate is formally concluded.

---

## 21. Current State (`v2.05.00.0`)

- **Frontend**: Clean, functional, emoji-free control surface (`MusicMirrorCorePage.tsx`) linked to headless `MusicMirrorCore`. Lean `index.css` (420 lines).
- **Acoustic Audio DSP Engine**: Mathematical audio signal processing and spectral decomposition (`AudioDspEngine.ts`) extracting real-time RMS energy, spectral centroid (timbre brightness), Wiener entropy flatness, 7-band acoustic frequency distribution, dynamic beat onset detection, and metadata divergence validation.
- **Offline Audio Cache**: Client-side IndexedDB cache (`OfflineAudioCache.ts`) with LRU capacity management, search fallback, and zero-PII data classification.
- **PWA Service Worker & Stream Caching**: Dual-tier ServiceWorker (`sw.js` & `ServiceWorkerManager.ts`) caching app shell and dedicated audio stream cache (`mm-audio-stream-v1`).
- **Data Transmission Gate**: Runtime enforcement (`TransmissionGate.ts`, Spec §15) blocking unapproved destinations, barring `SENSITIVE_CONTEXT` transmission, and requiring consent for `PERSONAL_DATA`/`USER_DATA`.
- **Permissions**: Centralized `CapabilityRegistry`, `ConsentRecord`, `DataClassifier`, and `ProviderRegistry` fully operational and verified by 113 unit tests.
- **Backend**: FastAPI server providing catalog search, weighted ranking, and recommendation endpoints over a 200-song SQLite database.
- **Quality**: 284 frontend tests across 18 suites and 143 backend tests passing (100% green). Oxlint and TypeScript clean.

---

## 22. Known Limitations

1. **In-Memory Rate Limiting**: The backend rate limiter (`app/core/rate_limit.py`) uses an in-memory dictionary. Before horizontal multi-node deployment, this must be backed by Redis.
2. **Local YouTube IFrame Reliance**: Playback requires browser network connectivity to YouTube's CDN. Completely offline environments fall back to cached offline tracks and synthetic audio data URIs.
3. **Face-api Model Weight Footprint**: Neural network weights in `/public/models` require ~6MB initial download upon first camera activation.

---

## 23. Missing & Incomplete Areas

- **Microphone Acoustic Ingress**: Voice-based affective inference is defined in the taxonomy but not yet connected to client media streams.
- **Cross-Browser Permissions API Discrepancies**: Firefox and Safari exhibit partial support for `navigator.permissions.query({ name: 'camera' })`. Handled via safe try-catch fallbacks.

---

## 24. Remaining Tasks

### Priority 0 (Critical)
- *All P0 architectural, privacy, correctness, and stability tasks are currently satisfied.*

### Priority 1 (Important)
- *All P1 offline caching and data transmission gate tasks are currently satisfied.*

### Priority 2 (Enhancement)
- Expand the seed database from 200 to 1,000 canonical songs across diverse global genres.
- Add Redis-backed distributed rate limiting for multi-instance backend deployment.

---

## 25. Future Roadmap

1. **`v2.05.00.0` (SUB-VERSION)**: Acoustic Audio DSP & Real-Time FFT Spectral Analysis (`VERIFIED & COMPLETED`).
2. **`v2.06.00.0` (SUB-VERSION)**: Production UX/UI Makeup Phase (`VERIFIED & COMPLETED`).
3. **`v3.00.00.0` (MAJOR)**: Distributed Multi-Room Synchronized Audio Mesh.

---

## 26. Important Lessons

- **OmniStream / U-Tube Forensic Audit**: In earlier iterations of related software, heavy audio processing on the UI thread caused significant browser freezes, while persistent storage without version tags corrupted cross-session state. Music Mirror isolates all processing, keeps UI strictly reactive, and enforces explicit cache TTLs.
- **False Alarm Engine Offline State**: A health check failure in the backend previously marked the whole engine offline, confusing users. Decoupling client-side headless readiness from API availability resolved this.
- **Permission Prompt Concurrency**: Rapid, concurrent feature activation can trigger duplicate browser permission prompts. In-flight promise sharing (`SingleFlight`) completely eliminates this race condition.
- **Architectural Privacy Gates**: Relying purely on documentation or developer convention to avoid leaking sensor/biometric data is insufficient. A formal `TransmissionGate` that blocks payload transmission at runtime before serialization guarantees compliance.
- **Headless Mathematical DSP**: Computing acoustic features (spectral centroid, Wiener flatness, RMS) directly in an observable service decouple audio signal verification from any cosmetic rendering loop.
- **Pure CSS/Font Aesthetic Makeup**: Beautiful, modern UI does not require emojis, bloated icon libraries, or decorative noise. Space Grotesk, Outfit, JetBrains Mono, and translucent acoustic obsidian elevations deliver professional aesthetics with zero functional overhead.

---

## 27. Release / Version Information

| Version | Level | Commit | Date | Description |
|---|---|---|---|---|
| `1.00.00.0` | BASELINE | `f1b5e6e` | 2026-08-07 | Initial Music Mirror architecture with vision engine and UI baseline. |
| `2.00.00.0` | MAJOR | `a7971a6` | 2026-08-22 | Autonomous YouTube discovery engine with sequential failover and E2E harness. |
| `2.03.00.0` | SUB-VERSION | `5cea6f8` | 2026-09-19 | Core system rebuild, True Emotion multi-modal engine, and legacy UI elimination. |
| `2.03.02.0` | FUNCTIONAL | `5cea6f8` | 2026-09-19 | Complete Technical Operating Specification and canonical provenance models. |
| `2.03.02.1` | BUG/FIX | `5cea6f8` | 2026-09-19 | OmniStream/U-Tube forensic inspection and regression register integration. |
| `2.04.00.0` | SUB-VERSION | `5cea6f8` | 2026-09-19 | Acoustic Reflection interface and design system. |
| `2.04.01.0` | FUNCTIONAL | `5cea6f8` | 2026-09-19 | Soundwave DSP Canvas and Emotion Circumplex Radar visualization. |
| `2.04.01.1` | PATCH | `bad8f75` | 2026-09-19 | Fixed false-positive engine offline status when backend is unreachable. |
| `2.04.02.0` | FUNCTIONAL | `b10f86f` | 2026-09-20 | Core-first: strip decorative UI, centralized CapabilityRegistry, privacy-first Camera. |
| `2.04.02.1` | PATCH | `bbe4035` | 2026-09-20 | Complete Privacy & Consent architecture: ProviderRegistry, DataClassifier, and in-flight deduplication. |
| `2.04.03.0` | FUNCTIONAL | `6236db7` | 2026-09-20 | Offline IndexedDB Audio Caching, LRU eviction, memory fallback & core search integration. |
| `2.04.04.0` | FUNCTIONAL | `a920268` | 2026-09-20 | PWA ServiceWorker audio stream caching, TransmissionGate Spec §15 enforcement. |
| `2.05.00.0` | SUB-VERSION | `0cfe904` | 2026-09-20 | Acoustic Audio DSP & Real-Time FFT Spectral Analysis engine. |
| `2.06.00.0` | SUB-VERSION | `ccd4171` | 2026-09-20 | Production UX/UI Makeup Phase: sleek acoustic obsidian theme & typography. |
| `2.06.01.0` | FUNCTIONAL | PENDING | 2026-09-20 | Universal Modular Architecture, Change-Isolation Governance, and Architectural Ownership Registry. |

---

## 28. Final System Summary

Music Mirror is a fully functional, headless music intelligence and playback orchestration system built in React 19, TypeScript, and FastAPI. It receives user affective or textual intent, identifies candidate tracks across multiple providers, ranks them via multi-factor weighted scoring, and guarantees audio playback resilience via an automated sub-3-second fallback ladder.

The system is governed by a strict **Core-First**, **Privacy by Architecture**, and **Modular Change-Isolation** doctrine:
- Every page, feature, function, component, service, and API has a strictly defined ownership boundary (`ARCHITECTURE.md`, `DEPENDENCY_MAP.md`).
- All modifications are governed by the five-tier Change Radius (`DIRECT`, `RELATED`, `DEPENDENT`, `SHARED`, `UNRELATED`) with pre-flight change manifests.
- All device access routes through a centralized `CapabilityRegistry` with explicit consent disclosures.
- Camera processing is 100% transient and client-side, immediately discarding raw frames.
- Outgoing payloads are gated by `TransmissionGate.ts` enforcing `ProviderRegistry` validation and zero-PII transmission.
- Audio playback is resilient offline via IndexedDB cache (`OfflineAudioCache`) and ServiceWorker stream cache (`sw.js`).
- Acoustic playback fidelity and affective metadata are verified mathematically in real time via `AudioDspEngine.ts` (RMS, Centroid, Flatness, 7 Bands).
- Production UI is styled cleanly in Acoustic Obsidian with Google typography, zero emojis, and pure functional clarity.
- All tests pass (284 frontend, 143 backend), codebases are clean of lint/type errors, and builds compile without warnings.
