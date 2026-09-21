# Music Mirror — Universal Modular Architecture & Change-Isolation Specification

> **AUTHORITATIVE ARCHITECTURE RECORD**  
> Current Version: `2.06.01.0`  
> Classification: Universal Modular Architecture & Change-Isolation Governance  
> Architectural Governance: `A.BC.DE.F` Universal Version Controller (`VERSION_CONTROLLER.md`)  
> Operating Standard: **Domain/Feature Ownership — Zero Coupling — Change Radius Isolation**

---

## 1. System Overview & Core Mission

Music Mirror (MM) is a decoupled, headless music intelligence, affective recommendation, and resilient playback orchestration system. Its user interface is strictly a reactive observer of the core headless engine.

### Core Architectural Invariant
> **"Every page, feature, function, component, workflow, service, API, data model, button, interaction, and system capability must have a clearly identifiable ownership boundary so that modifying one thing does not unnecessarily modify, overwrite, delete, or destabilize unrelated parts of the project."**

---

## 2. Architecture Hierarchy & System Boundaries

The system organizes all code into strict domain and feature boundaries rather than generic technical file buckets:

```text
d:\PROJECT\Btech\Music Mirror
│
├── frontend/
│   ├── src/
│   │   ├── core/                  [APP / CORE ENGINE SHELL]
│   │   ├── pages/                 [PAGE COMPOSITIONS]
│   │   ├── domain/                [CANONICAL CONTRACTS & DOMAIN TRUTH]
│   │   ├── permissions/           [PRIVACY, CAPABILITY & TRANSMISSION GATE DOMAIN]
│   │   ├── services/              [HEADLESS AUDIO & DISCOVERY SERVICES]
│   │   ├── architecture/          [MULTI-STAGE PIPELINE LAYERS]
│   │   │   ├── layers/            [EMOTION, INTENT, PLAYBACK, OBSERVABILITY]
│   │   │   ├── orchestrator/      [APPLICATION & SESSION ORCHESTRATION]
│   │   │   └── types/             [PIPELINE TYPINGS]
│   │   ├── components/            [DOMAIN-SPECIFIC HARDWARE UI]
│   │   ├── config/                [CENTRALIZED CONFIGURATION]
│   │   └── api/                   [BACKEND REST CLIENT INFRASTRUCTURE]
│   └── tests/                     [E2E HARNESS & FIXTURES]
│
├── backend/
│   ├── app/
│   │   ├── core/                  [SECURITY, GOVERNANCE & RATE LIMITING]
│   │   ├── db/                    [PERSISTENCE, MODELS & WAL BACKUP]
│   │   ├── schemas/               [CANONICAL DTOS & SCHEMAS]
│   │   ├── services/              [RECOMMENDATION, COGNITIVE & MLOPS ENGINES]
│   │   ├── ingestion/             [NORMALIZATION, DEDUPLICATION & SEED DATA]
│   │   └── api/routes/            [DOMAIN-ISOLATED REST API ENDPOINTS]
│   └── tests/                     [BACKEND PYTEST SUITES]
│
└── .agents/rules/                 [GOVERNANCE SPECIFICATIONS & POLICIES]
```

---

## 3. Architectural Ownership Map

### A. Frontend Ownership Map

| Domain / Subsystem | Primary Boundary | Owning Components / Services | Responsibility |
|---|---|---|---|
| **Headless Core Engine** | `frontend/src/core/` | `MusicMirrorCore.ts` | Central singleton state machine, playback queue, volume, audio element hook, DSP wiring, and failover orchestration. |
| **Console Page Shell** | `frontend/src/pages/` | `MusicMirrorCorePage.tsx` | Pure reactive UI composition: Header, Playback Bar, Queue, Visualizers, and Diagnostics Drawer. |
| **Application Bootstrap** | `frontend/src/` | `App.tsx`, `main.tsx` | React 19 root bootstrap, top-level layout mount, error boundary container. |
| **Domain Contracts** | `frontend/src/domain/` | `canonical.ts` | Single source of truth for canonical entities (`Track`, `Artist`, `PlaybackState`, `QueueState`, `UserPreferences`). |
| **Privacy & Consent** | `frontend/src/permissions/` | `CapabilityRegistry.ts`, `ConsentRecord.ts`, `DataClassifier.ts`, `ProviderRegistry.ts`, `TransmissionGate.ts` | Spec §15 Data Transmission Gate, hardware capability negotiation, purpose-scoped user consent, and zero-PII enforcement. |
| **Acoustic Audio DSP** | `frontend/src/services/` | `AudioDspEngine.ts` | Web Audio API FFT analysis (2048 bins), RMS energy, spectral centroid, Wiener flatness, 7-band decomposition, beat onset detection. |
| **Offline Audio Cache** | `frontend/src/services/` | `OfflineAudioCache.ts` | IndexedDB audio blob caching, LRU bounded storage, memory fallback. |
| **Service Worker PWA** | `frontend/src/services/`, `public/` | `ServiceWorkerManager.ts`, `sw.js` | Dual-tier offline stream caching and application shell offline support. |
| **Candidate Discovery** | `frontend/src/services/` | `YouTubeDiscoveryService.ts` | SingleFlight query deduplication, L1 memory cache (30m TTL), 5-level query expansion ladder. |
| **Sequential Recovery** | `frontend/src/services/` | `YouTubeRecoveryEngine.ts` | Autonomous sub-3-second failover across candidate pool on YouTube embed/playback errors (150, 100, 2, 5). |
| **Emotion & Intent** | `frontend/src/architecture/layers/` | `CameraDriver.ts`, `EmotionLayer.ts`, `MusicIntentLayer.ts` | Transient WebRTC camera capture, client-side face classification, valence/energy intent mapping. |
| **Playback Adapters** | `frontend/src/architecture/layers/PlaybackLayer/` | `PlaybackStateMachine.ts`, `HTML5AudioPlaybackAdapter.ts`, `YouTubePlaybackAdapter.ts`, `PlaybackProvider.ts` | Low-level audio/video driver abstraction and discrete state transitions. |
| **Provider Adapters** | `frontend/src/architecture/layers/ProviderAdapterLayer/` | `YouTubeProviderAdapter.ts`, `JamendoProviderAdapter.ts`, `RoyaltyFreeFallbackAdapter.ts`, `MusicProviderAdapter.ts` | Normalizing heterogeneous third-party provider responses into canonical `Track` DTOs. |
| **Client Personalization**| `frontend/src/architecture/layers/PersonalizationLayer/` | `PersonalizationEngine.ts`, `PersonalizationScorer.ts`, `PersonalizationStore.ts` | Client-side exponential decay preference learning, artist repetition penalty. |
| **Observability** | `frontend/src/architecture/layers/` | `ObservabilityLayer.ts` | Monotonic session token event tracing, latency telemetry, zero-PII audit logging. |
| **API Client** | `frontend/src/api/` | `client.ts` | Typed REST communication with backend endpoints with timeout and retry controls. |
| **Configuration** | `frontend/src/config/` | `appConfig.ts`, `emotionLabels.ts` | Global runtime constants, feature flags, version strings, emotion circumplex quadrants. |

---

### B. Backend Ownership Map

| Domain / Subsystem | Primary Boundary | Owning Modules | Responsibility |
|---|---|---|---|
| **Core & Security** | `backend/app/core/` | `config.py`, `auth.py`, `rate_limiter.py`, `governance.py` | Environment settings, JWT authentication, sliding-window rate limits, governance validation. |
| **Database & WAL** | `backend/app/db/` | `database.py`, `models.py`, `backup.py` | SQLAlchemy 2.0 async engine, ORM entity definitions, SQLite WAL snapshotting and backups. |
| **Schemas & DTOs** | `backend/app/schemas/` | `song.py`, `songs.py`, `emotion.py`, `taxonomy.py`, `user_preference.py` | Pydantic v2 schemas for API contracts and request/response validation. |
| **Recommendation** | `backend/app/services/` | `recommendation_engine.py`, `ranking_service.py`, `cognitive_engine.py` | Affective matching, harmonic transition paths, multi-factor ranking (intent 50%, profile 35%, novelty 15%). |
| **Self-Healing & MLOps**| `backend/app/services/` | `self_healing_engine.py`, `ml_model_ecosystem.py`, `mlops_pipeline.py`, `catalog_reconciliation.py` | Automated catalog error quarantine, mood embedding models, dataset drift detection. |
| **Metadata Ingestion** | `backend/app/ingestion/` | `normalizer.py`, `deduplication.py`, `youtube_provider.py`, `seed_real_catalog.py` | Noise-stripping regex pipeline, Levenshtein entity resolution, catalog seeding. |
| **Domain REST API** | `backend/app/api/routes/` | `health.py`, `songs.py`, `recommendations.py`, `interactions.py`, `user_preferences.py`, `telemetry.py`, `reports.py`, `admin.py`, `local_explorer.py` | Domain-partitioned REST route controllers with input validation and HTTP exception boundaries. |

---

## 4. Module Registry

| Module Name | Architectural Path | Public Interface | Direct Dependencies | Allowed Consumers |
|---|---|---|---|---|
| **MusicMirrorCore** | `frontend/src/core/MusicMirrorCore.ts` | `MusicMirrorCore.getInstance()` | `canonical.ts`, `PlaybackStateMachine`, `AudioDspEngine`, `YouTubeDiscoveryService`, `OfflineAudioCache`, `TransmissionGate` | `MusicMirrorCorePage.tsx`, App Shell |
| **TransmissionGate** | `frontend/src/permissions/TransmissionGate.ts` | `evaluateTransmission()`, `transmitSafely()`, `assertCanTransmit()` | `DataClassifier.ts`, `ProviderRegistry.ts`, `ConsentRecord.ts` | `MusicMirrorCore`, `api/client.ts`, Observability |
| **AudioDspEngine** | `frontend/src/services/AudioDspEngine.ts` | `AudioDspEngine.getInstance()`, `connectAudioElement()`, `computeMetrics()` | Web Audio API (`AudioContext`, `AnalyserNode`) | `MusicMirrorCore.ts` |
| **OfflineAudioCache** | `frontend/src/services/OfflineAudioCache.ts` | `OfflineAudioCache.getInstance()`, `putTrackAudio()`, `getTrackAudio()` | IndexedDB (`mm_audio_store_v1`) | `MusicMirrorCore.ts` |
| **ServiceWorkerManager** | `frontend/src/services/ServiceWorkerManager.ts` | `ServiceWorkerManager.getInstance()`, `register()`, `purgeAudioStreamCache()` | `navigator.serviceWorker`, `caches` | `MusicMirrorCore.ts`, App Shell |
| **YouTubeDiscoveryService** | `frontend/src/services/YouTubeDiscoveryService.ts` | `searchTracks()`, `clearCache()`, `getCacheStats()` | `canonical.ts`, `SingleFlight`, L1 Cache | `MusicMirrorCore.ts`, `DiscoveryLayer.ts` |
| **CapabilityRegistry** | `frontend/src/permissions/CapabilityRegistry.ts` | `checkCapability()`, `requestCapability()`, `revokeCapability()` | `navigator.permissions`, `ConsentRecord.ts` | `CameraDriver.ts`, `MusicMirrorCorePage.tsx` |
| **RecommendationEngine** | `backend/app/services/recommendation_engine.py` | `get_recommendations()`, `get_transition_path()` | `models.py`, `cognitive_engine.py`, `ranking_service.py` | `api/routes/recommendations.py` |
| **SelfHealingEngine** | `backend/app/services/self_healing_engine.py` | `report_failure()`, `get_quarantine_list()`, `trigger_healing()` | `models.py`, `catalog_reconciliation.py` | `api/routes/reports.py`, `api/routes/admin.py` |

---

## 5. Dependency Flow & Anti-Coupling Invariants

```text
[ APPLICATION SHELL ] 
        │
        ▼
[ DOMAIN MODULES & CONTROLLERS ] 
        │
        ▼
[ CORE FEATURE ENGINES & SERVICES ]
        │
        ▼
[ INFRASTRUCTURE ADAPTERS & DRIVERS ]
        │
        ▼
[ CANONICAL DATA MODELS & SHARED UTILS ]
```

### Strict Architectural Invariants
1. **No Circular Imports**: Feature modules must never circularly depend on one another.
2. **UI Never Accesses Hardware Directly**: UI components cannot call `navigator.mediaDevices.getUserMedia` directly. Access must route through `CapabilityRegistry` $\to$ `CameraDriver`.
3. **UI Never Queries Providers Directly**: UI components cannot invoke external YouTube/Jamendo fetch requests directly. All queries dispatch through `MusicMirrorCore`.
4. **Zero-PII Network Invariant**: No payload containing `DataClass.SENSITIVE_CONTEXT` may traverse network boundaries. Enforced at runtime by `TransmissionGate.ts`.
5. **No Orphan Code**: Every file in `frontend/src/` and `backend/app/` is mapped to an authoritative domain with explicit test coverage.

---

## 6. End-to-End Traceability Chains

### Trace 1: Affective Emotion Detection to Playback
```text
User initiates Camera Scan
  │
  ▼
[UI] MusicMirrorCorePage.tsx triggers handleScanEmotion()
  │
  ▼
[Capability] CapabilityRegistry.requestCapability('camera')
  │
  ▼
[Consent] ConsentRecord checks policy version & Purpose.EMOTION_INFERENCE
  │
  ▼
[Hardware] CameraDriver.ts captures single transient frame via WebRTC
  │
  ▼
[Inference] face-api.js neural model infers emotion vector (Client-side WASM)
  │  (Raw frame is immediately GC'd; zero server egress)
  ▼
[Domain] EmotionLayer.ts maps emotion vector to circumplex coordinates
  │
  ▼
[Logic] MusicIntentLayer.ts translates coordinates to MusicIntent (Valence, Energy, BPM)
  │
  ▼
[Core] MusicMirrorCore.ts receives MusicIntent and dispatches searchIntent()
  │
  ▼
[Discovery] YouTubeDiscoveryService.ts queries candidates with SingleFlight deduplication
  │
  ▼
[Normalization] ProviderAdapter normalizes candidate to canonical Track DTO
  │
  ▼
[Validation] Track playability verified against offline cache & provider API
  │
  ▼
[Playback] HTML5AudioPlaybackAdapter or YouTubePlaybackAdapter starts playback
  │
  ▼
[DSP Analysis] AudioDspEngine.ts connects to audio stream; computes live RMS, Centroid, Flatness
  │
  ▼
[UI Update] MusicMirrorCorePage.tsx reflects PLAYING status, track metadata, and acoustic metrics
```

### Trace 2: Playback Error Trapping & Sub-3s Sequential Fallback
```text
YouTube Player encounters Error Code 150 (Embed Restricted)
  │
  ▼
[Adapter] YouTubePlaybackAdapter traps error event in onPlayerError()
  │
  ▼
[StateMachine] PlaybackStateMachine transitions to ERROR state
  │
  ▼
[Recovery] YouTubeRecoveryEngine intercepts failure within 500ms
  │
  ▼
[Ladder Step 1] Fallback to Ranked YouTube Candidate #2 (time elapsed: ≤ 1200ms)
  │  (If network offline or unplayable)
  ▼
[Ladder Step 2] Fallback to Local Seeded SQLite Catalog track (time elapsed: ≤ 1800ms)
  │  (If complete blackout)
  ▼
[Ladder Step 3] Fallback to RoyaltyFreeFallbackAdapter with Data-URI audio (Zero Network)
  │
  ▼
[Success] PlaybackStateMachine recovers to PLAYING; sub-3-second SLA satisfied
```

---

## 7. State Ownership & Single Source of Truth Ledger

| State Category | Authoritative Owner | Storage Medium | Synchronization Mechanism |
|---|---|---|---|
| **Active Playback State** | `MusicMirrorCore` | Memory Singleton | Observable subscriber pattern (`subscribe()`) |
| **Track Queue & Index** | `MusicMirrorCore` | Memory Singleton | Queue mutations broadcast to UI observers |
| **Acoustic Audio DSP** | `AudioDspEngine` | Web Audio AnalyserNode | Real-time sampling on request (`getMetrics()`) |
| **Device Capabilities** | `CapabilityRegistry` | Memory + Browser Permissions API | SingleFlight promise memoization & change listeners |
| **User Privacy Consent** | `ConsentRecord` | `localStorage` (`mm_consent_*`) | Timestamped policy version validation |
| **Offline Audio Streams**| `OfflineAudioCache` + `sw.js` | IndexedDB + CacheStorage | Cache-first retrieval with LRU bounded eviction |
| **Canonical Song Catalog**| Backend SQLite DB | `backend/data/music_mirror.db` | SQLAlchemy 2.0 async sessions with WAL journaling |
| **User Musical Profile** | `PersonalizationStore` | `localStorage` (`mm_user_prefs`) | Exponential decay weights updated on track finish |

---

## 8. Change Radius Classification & Modification Protocol

Before modifying any file, classify it into the five-tier change radius:

```text
[ DIRECT ]     Files directly implementing the requested change.
[ RELATED ]    Files directly configuring or supporting the direct files.
[ DEPENDENT ]  Files consuming the modified interface (require explicit impact analysis).
[ SHARED ]     Multi-consumer infrastructure (requires caution & regression verification).
[ UNRELATED ]  All other modules. STRICTLY FROZEN.
```

### Mandatory Change Manifest Pre-Flight
```text
CHANGE MANIFEST:
- Requested:   [Exact user requirement]
- Direct:      [List of directly modified files]
- Related:     [List of directly supporting files]
- Dependent:   [List of consuming files evaluated for impact]
- Shared:      [List of shared modules impacted, if any]
- Unrelated:   [Strictly protected from modification]
- Radius Gate: Direct + necessary Related only
```

---

## 9. Testing Ownership & Proximity

All code is protected by co-located or domain-aligned test suites:

- **Frontend Core & Domain**: `frontend/src/__tests__/domain.test.ts`
- **Architecture Layers**: `frontend/src/architecture/__tests__/` (9 test suites)
- **Privacy & Permissions**: `frontend/src/permissions/__tests__/` (4 test suites)
- **Services & DSP**: `frontend/src/services/__tests__/` (3 test suites)
- **End-to-End Harness**: `frontend/tests/e2e/tier1_feature_coverage.test.ts` (70 E2E tests)
- **Backend Services & API**: `backend/tests/` (21 test suites, 143 unit/integration tests)

---

## 10. Zero Phantom / Zero Orphan File Audit Register

| Audit Category | Count | Status | Verified Invariant |
|---|---|---|---|
| **Frontend Source Files** | 57 files | `100% OWNED` | Every file belongs to an identified domain; zero orphan files. |
| **Frontend Tests** | 18 test suites (284 tests) | `100% GREEN` | Comprehensive coverage across all frontend layers. |
| **Backend Modules** | 50+ modules | `100% OWNED` | Every module belongs to an identified domain; zero orphan files. |
| **Backend Tests** | 20 test suites (143 tests) | `100% GREEN` | Comprehensive coverage across all backend services and endpoints. |
| **Phantom Files** | 0 files | `ZERO PHANTOMS` | All documented files physically exist in the repository. |
