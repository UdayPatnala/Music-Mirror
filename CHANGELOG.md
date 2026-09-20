# CHANGELOG

All notable changes to the Music Mirror platform are documented in this file in adherence to the **Universal Version Control & Change Governance System** (`A.BC.DE.F`).

---

## 2.04.03.0 — 2026-09-20

- **Type**: Functional Revision (Level DE)
- **Status**: Verified

### Offline IndexedDB Audio Caching & Client-Side Media Cache Engine

#### Added
- **`OfflineAudioCache.ts`**: Persistent client-side audio and track metadata cache using IndexedDB (`MusicMirrorOfflineDB`) with in-memory fallback.
  - Implements LRU capacity management (default 50 tracks max) with automatic oldest-entry eviction.
  - Exposes `saveTrack()`, `getTrack()`, `getRecord()`, `hasTrack()`, `getAllTracks()`, `searchTracks()`, `removeTrack()`, `clear()`, `getStats()`.
  - Zero PII: strictly classified as `DataClass.PROVIDER_DATA` in `DataClassifier.ts`.
- **`offline_audio_cache.test.ts`**: 11 unit tests verifying initialization, saving, retrieval, search by title/artist/genre, LRU eviction, byte size calculation, and memory fallback resilience.
- **Diagnostics Control Surface**: Added "Purge Offline DB" diagnostic button in `MusicMirrorCorePage.tsx` providing immediate one-click cache wiping per Spec §18.

#### Enhanced
- **`MusicMirrorCore.ts`**:
  - Automatically caches verified active tracks into `offlineAudioCache` upon playback.
  - Integrated persistent offline search fallback into `searchTracks()` when backend network or local SQLite catalog is unreachable.
  - Exposes `getOfflineCacheStats()` and `clearOfflineCache()` API methods.
- **`DataClassifier.ts`**: Registered `cache.offline_audio_blob` and `cache.offline_track_metadata` as `DataClass.PROVIDER_DATA`.

### Verification
- Frontend (Vitest): **247/247 PASSED** across 15 test files (+11 new offline cache tests)
- Backend (pytest): **143/143 PASSED**
- Oxlint: 0 errors, 0 warnings (50 files)
- TypeScript (tsc -b --noEmit): Clean / Exit 0
- Vite Build: Exit 0 (710ms)

---

## 2.04.02.1 — 2026-09-20

- **Type**: Patch / Revision (Level F)
- **Status**: Verified

### Privacy, Consent, Permissions & Data-Access System Complete Specification

#### Added
- **`ProviderRegistry.ts` (Spec §13)**: Centralized registry recording every external service (`provider`, `purpose`, `data_sent`, `data_received`, `authentication_required`, `retention_known`, `user_control`, `failure_behavior`). Registered active providers: YouTube Data API v3, YouTube IFrame Player API, Music Mirror Backend, face-api.js.
- **`DataClassifier.ts` (Spec §14)**: Formal data classification system defining 9 data classes from `SENSITIVE_CONTEXT` to `PUBLIC`. Maps all internal and external data fields to their respective sensitivity class and retention policy. Disallows persistence of `SENSITIVE_CONTEXT` and `TEMPORARY_DATA`.
- **`ConsentRecord.ts` Test Suite**: 23 dedicated unit tests validating consent persistence, withdrawal lifecycle, policy version invalidation, and session isolation.
- **`classifier_and_providers.test.ts`**: 43 comprehensive unit tests validating field classification, retention bounds, data minimization rules, and provider registry lookups.

#### Enhanced
- **`CapabilityRegistry.ts` (Spec §4 & §30)**:
  - Upgraded model to match full Spec §4 schema: `id`, `category`, `purpose`, `required`, `currentState`, `requestedAt`, `updatedAt`, `policyVersion`, `reason`.
  - Exposed standardized methods: `check()`, `request()`, `revokeGuidance()`, `getState()`, `isAvailable()`.
  - Added concurrent in-flight request deduplication via `_inFlightRequests` to prevent duplicate browser prompts or race conditions.
  - Added 3 new unit tests covering Spec §4 model compliance and concurrent request deduplication.

### Verification
- Frontend (Vitest): **236/236 PASSED** across 14 test files
- Backend (pytest): **143/143 PASSED**
- Oxlint: 0 errors, 0 warnings
- TypeScript (tsc -b --noEmit): Clean
- Vite Build: Exit 0 (444ms)

---

## 2.04.02.0 — 2026-09-20

- **Type**: Functional Revision (Level DE)
- **Status**: Verified

### Core-First Directive — Minimal UI + Privacy System

#### Removed (decorative, no functional value)
- `AcousticSoundwaveCanvas.tsx` — 60 FPS canvas animation (pure cosmetic, no core function)
- `CircumplexRadar.tsx` — decorative SVG with gradients, glow effects, emoji labels (concept preserved; component premature)
- All emojis from JSX throughout `MusicMirrorCorePage.tsx`
- All gradient backgrounds, glow `box-shadow` effects, and hover micro-animations from `index.css`
- `brand-icon-wrapper` decorative icon and `brand-tagline` text
- Emotion card visual bars (`bar-fill`/`bar-track`) and emoji fields
- 950+ lines of "Acoustic Reflection" design system CSS

#### Added — Centralized Privacy/Permission System
- **`frontend/src/permissions/CapabilityRegistry.ts`**: Centralized device capability state machine. All device/browser permission access must go through this registry. States: `NOT_REQUESTED → REQUESTING → GRANTED/DENIED/BLOCKED/UNAVAILABLE/REVOKED/ERROR`. Methods: `requestCapability()`, `getState()`, `isGranted()`, `isAvailable()`, `markRevoked()`, `markError()`, `revokeGuidance()`, `subscribe()`, `watchExternalRevocation()`.
- **`frontend/src/permissions/ConsentRecord.ts`**: Application-level consent recording using sessionStorage only. Records `purpose`, `decision`, `timestamp`, `policyVersion`. Auto-invalidates when policy version changes. Provides `withdrawConsent()`.
- **`frontend/src/permissions/__tests__/capability.test.ts`**: 23 permission state machine tests covering all transitions, subscription behavior, listener error resilience, external revocation, and `revokeGuidance()` output.

#### Changed — Camera (Privacy Compliance)
- **`Camera.tsx`** fully rewritten. Camera is NOT auto-requested on mount.
- Implements explicit consent gate: user must click "Enable Camera" after reading purpose disclosure (purpose, processing location, data retention, optional status).
- Camera access request is triggered only through `CapabilityRegistry.requestCapability('CAMERA')`.
- Consent is recorded via `ConsentRecord.recordConsent()` before triggering browser prompt.
- All phase states rendered as plain text: `NOT_REQUESTED`, `LOADING_MODELS`, `REQUESTING`, `ACTIVE`, `DENIED`, `BLOCKED`, `UNAVAILABLE`, `ERROR`.
- Removed: `lucide-react` icon imports, landmark canvas, lighting analysis, decorative overlays.
- Stream stopped on disable or component unmount.

#### Changed — MusicMirrorCorePage
- All emojis removed from JSX.
- `AcousticSoundwaveCanvas` and `CircumplexRadar` imports and usages removed.
- Camera section now controlled by Show/Hide toggle — Camera component itself gates the browser prompt.
- Emotion cards show: label, mode, BPM, valence/energy values (text only, no decorative bars).
- Policy buttons show text labels only.
- `TRUE_EMOTIONS` renamed to `EMOTIONS`; `emoji` and `accentColor` fields removed.

#### Changed — index.css
- Replaced 991-line "Acoustic Reflection" design system with 420-line minimal functional stylesheet.
- CSS bundle: 20.7KB → 8.77KB (−57%).
- Zero gradients, zero glow effects, zero animation keyframes.
- All new class names prefixed `mm-` for clarity.

### Tests
- Frontend (Vitest): **167/167 PASSED** (+23 new capability tests)
- Backend (pytest): **143/143 PASSED**
- oxlint: 0 errors, 0 warnings
- tsc -b --noEmit: exit 0
- vite build: exit 0 (527ms)

---

## 2.04.01.0 — 2026-09-19

- **Type**: Functional Revision (Level DE)
- **Status**: Verified

### Added
- **Dynamic Soundwave DSP Canvas (`AcousticSoundwaveCanvas.tsx`)**:
  - HTML5 2D Canvas multi-harmonic waveform visualizer modulating wave amplitude, speed, and crest harmonics according to active track tempo (BPM), energy, and valence.
  - Features calm breathing oscillation during paused/idle state and harmonic mode lighting (major: amber/cyan crests; minor: deep indigo/violet swells).
- **Interactive Russell Circumplex Affective Radar (`CircumplexRadar.tsx`)**:
  - Interactive 2D Cartesian plane mapping Valence ($X \in [-1, 1]$) and Arousal ($Y \in [-1, 1]$) with quadrant semantics (Euphoric, Tense/Cathartic, Melancholic, Serene).
  - Displays user affective coordinates, playing track acoustic points, and animated directional trajectory vectors when regulation policies are active.
  - Supports direct click-to-reposition coordinates to intuitively fine-tune target emotional intent.

---

## 2.04.00.0 — 2026-09-19

- **Type**: Sub-Version / Milestone (Level BC)
- **Status**: Verified

### Added
- **Phase 18 Dedicated UI/UX Engineering ("Acoustic Reflection")**:
  - Implemented responsive, high-performance dark obsidian production design system in `frontend/src/index.css` using native CSS variables with zero heavy UI dependencies.
  - **The Mirror Studio**: Facial detection frame with expression overlay, True Emotion taxonomy chips, valence/energy radar badges, subjective feeling notes, and 4 mirror policies (**REFLECT**, **REGULATE**, **CATHARSIS**, **BALANCE**) with step transition visualizations.
  - **Playback & Acoustic Deck**: Now Playing hero deck with acoustic badges (Valence, Energy, BPM, Key Mode), responsive YouTube iframe mount, precision transport controls, seekbar, and volume slider.
  - **Discovery & Queue Console**: Unified real-time YouTube & local catalog search, candidate pool cards with instant play/enqueue, and queue management table.
  - **Diagnostic & Self-Healing Console (Collapsible)**: Drawer revealing real-time session trace event logs, L1 discovery cache statistics, failover SLA timing budget, and test runner triggers.

---

## 2.03.03.0 — 2026-09-19

- **Type**: Functional Revision / Architecture Cleanup (Level DE)
- **Status**: Verified

### Removed
- **Dead Code Elimination**: Removed obsolete multi-page Zustand store (`src/store/useAppStore.ts` and directory `src/store/`), unused preferences API (`src/services/userPreferencesApi.ts`), unused types (`src/types/index.ts` and directory `src/types/`), unused toast alert (`src/components/NetworkStatusIndicator.tsx`), and duplicate `ApplicationError` definitions (`src/domain/types.ts`).
- **Unused Dependencies Pruned**: Removed unused `react-router-dom` and `zustand` dependencies from `frontend/package.json` following single-page core architecture consolidation.

### Changed
- **Concurrency & Reliability Hardening**:
  - Implemented monotonic `activeSearchToken` and stale response rejection in `MusicMirrorCore.searchTracks()`.
  - Added debounce timer tracking and cancellation in `YouTubeRecoveryEngine` (`start()`, `stop()`, `reportSuccess()`, `reportFailure()`) to prevent timer leaks and ghost candidate advancements.
  - Unified `LoggerService` in `src/architecture/layers/ObservabilityLayer.ts` to support multi-parameter polymorphic logging and performance marks.
  - Consolidated `ApplicationError` into canonical `src/architecture/types/domain.ts` with optional `severity`.

### Added
- **Historical Architectural Regression Guards Suite**: Created `frontend/src/architecture/__tests__/historical_guards.test.ts` implementing automated unit tests verifying the 6 OmniStream failure mode guards (stale search token rejection, debounce timer isolation, audio URI scheme validation, sub-3000ms failover SLA, honest empty state, and track provenance integrity).

### Verification
- **Frontend Tests (Vitest)**: 144/144 PASSED (100% across 11 test suites)
- **Backend Tests (pytest)**: 143/143 PASSED (100% across 19 test suites)
- **TypeScript & Production Build**: `tsc -b && vite build` built cleanly (0 errors)
- **Linter (oxlint)**: 0 errors, 0 warnings across 44 files
- **Version Alignment**: `2.03.03.0` synchronized across `package.json`, `appConfig.ts`, `client.ts`, `MusicMirrorCorePage.tsx`, `domain.test.ts`, `VERSION_CONTROLLER.md`, `CHANGELOG.md`, and `PROJECT_STATE.md`.

---

## 2.03.02.1 — 2026-09-19

- **Type**: Minor Fix / Documentation Update (Level F)
- **Status**: Verified

### Added
- **OmniStream & U-Tube Forensic Inspection & Lessons**: Authored `docs/OMNISTREAM_ARCHITECTURAL_LESSONS.md` providing a comprehensive 26-section forensic analysis of OmniStream v1.9.0 across U-Tube, CineMorph, OPCA boundaries, and OMS standards.
- **Master Regression Register ("DO NOT REPEAT")**: Cataloged 8 historical failure patterns (main-thread freezing during EBML parsing, false "NO ACTIVE SCREENING SESSION" state, `HEAD` requests on `blob:` URLs, silent fallback to Rickroll/unrelated pop tracks, uncoordinated dual caches, and synthetic metadata fabrication) with specific Music Mirror architectural guards.
- **Cross-Product Comparative Matrix**: Formulated an 11-dimension comparison between OmniStream/U-Tube and Music Mirror, establishing clear architectural divergence between a content-centric video portal and a context-centric music intelligence system.

### Verification
- **Inspection Integrity**: 100% read-only inspection of OmniStream codebase without mutation.
- **Music Mirror Core Stability**: Preserved full test matrix pass rate (281 / 281 tests passing).

---

## 2.03.02.0 — 2026-09-19

- **Type**: Functional Revision (Level DE)
- **Status**: Verified

### Added
- **Complete Technical Operating Specification**: Created `TECHNICAL_SPECIFICATION.md` detailing the 11-engine architecture, the two isolated data flows (Flow A: Catalog Ingestion vs Flow B: Runtime Retrieval), and 18 implementation phases.
- **Canonical Provenance Models**: Enriched `frontend/src/domain/canonical.ts` with `MetadataRecord<T>`, `MetadataQualityScore`, `StructuredMusicIntent`, explicit `Source` model, and field-level provenance tracking.
- **Domain Entity Harmonization**: Updated `Track`, `Artist`, `Album`, `PlaybackState`, and `SearchResult` with strict field parity to Section 3 specifications while preserving 100% backward compatibility.

### Verification
- **Backend Tests (pytest)**: 143/143 PASSED (100%)
- **Frontend Tests (Vitest)**: 138/138 PASSED (100%)
- **TypeScript & Build**: Clean exit 0 (`tsc -b && vite build`)
- **Linter (oxlint)**: 0 errors, 0 warnings across 49 files
- **Version Display Consistency**: Verified (`VERSION_CONTROLLER.md` = `package.json` = `appConfig.ts` = UI footer: `v2.03.02.0`)

---

## 2.03.01.0 — 2026-09-19

- **Type**: Functional Revision (Level DE)
- **Status**: Verified

### Added
- **Authoritative System Definition Artifact**: Created `SYSTEM_DEFINITION.md` detailing the 10-stage deterministic pipeline (`UNDERSTAND` $\to$ `MODEL` $\to$ `RETRIEVE` $\to$ `NORMALIZE` $\to$ `RESOLVE` $\to$ `RANK` $\to$ `VALIDATE` $\to$ `PLAY` $\to$ `OBSERVE` $\to$ `LEARN`).
- **5 Sources of Truth Framework**: Codified Domain Truth, Provider Truth, Runtime Truth, User Truth, and Model Inference boundaries.
- **Architectural Synchronization**: Modernized `ARCHITECTURE.md` to authoritative version `2.03.01.0`, documenting the 281-test verification matrix, the sub-3s failover budget, and technology selections.
- **Director Rule Alignment**: Updated `.agents/rules/music_mirror_director.md` to enforce the Core-First operating philosophy and eliminate obsolete presentation references.

### Verification
- **Backend Tests (pytest)**: 143/143 PASSED (100%)
- **Frontend Tests (Vitest)**: 138/138 PASSED (100%)
- **TypeScript & Build**: Clean exit 0 (`tsc -b && vite build`)
- **Linter (oxlint)**: 0 errors, 0 warnings across 49 files
- **Version Display Consistency**: Verified (`VERSION_CONTROLLER.md` = `package.json` = `appConfig.ts` = UI footer: `v2.03.01.0`)

---

## 2.03.00.0 — 2026-09-19

- **Type**: Sub-Version Milestone (Level BC)
- **Status**: Verified

### Added
- **True Emotion Multi-Modal Affective Engine**: 7-archetype taxonomy (`serene`, `joyful`, `melancholy`, `triumphant`, `focused`, `cathartic`, `centered`) mapped to precise valence, energy, target BPM, and harmonic mode.
- **Mirroring Intent Policies**: `REFLECT`, `REGULATE` (alchemical transition pathways), `CATHARSIS` (tension release), and `BALANCE` (homeostasis).
- **Headless Core Engine**: Unified singleton (`MusicMirrorCore.ts`) managing playback state machines, failover timers, queue orchestration, and telemetry buffers.
- **Single-Page Diagnostic Console**: Function-first interface (`MusicMirrorCorePage.tsx`) integrating real-time telemetry, failure injection (Embed Error 150, offline mode), discovery search, and queue management.
- **Sub-3s Sequential Fallback Ladder**: Automatic failover from unplayable YouTube embeds to candidate pool, local SQLite catalog, and zero-network data URIs.
- **Canonical Domain Models**: Formalized pure domain contracts (`Track`, `Artist`, `PlaybackState`, `QueueState`, `UserPreferences`) in `canonical.ts`.

### Changed
- **Frontend Architecture**: Completely removed multi-page routing and decorative marketing components; consolidated into function-first single page.
- **Stylesheet Size**: Replaced 2,080-line (56 KB) visual CSS with a 0.76 KB functional reset.
- **Backend CORS**: Whitelisted `http://localhost:5173` and `http://127.0.0.1:5173`.
- **YouTube Search Resiliency**: Added SQLite candidate fallback when remote discovery returns zero items.

### Removed
- **Decorative Pages**: Deleted `LandingPage.tsx`, `DashboardPage.tsx`, `MoodRoom.tsx`, `ProfilePage.tsx`, `SummaryPage.tsx`, `NotFoundPage.tsx`.
- **Decorative Assets & Packages**: Deleted branding hero images; pruned `framer-motion` and `recharts` from `package.json`.

### Verification
- **Backend Tests (pytest)**: 143/143 PASSED (100%)
- **Frontend Tests (Vitest)**: 138/138 PASSED (100%)
- **TypeScript & Build**: Clean exit 0 (`tsc -b && vite build`)
- **Linter (oxlint)**: 0 errors, 0 warnings across 49 files
- **UI/UX Status**: FROZEN (Ready for UI/UX Engineering)

---

## 2.02.00.0 — 2026-09-11

- **Type**: Sub-Version Milestone (Level BC)
- **Status**: Verified

### Added
- 3-Layer Project Memory architecture and Universal Project Engineering rule integration.
- Automated governance audit test suites.

### Verification
- Tests: 281/281 PASS
