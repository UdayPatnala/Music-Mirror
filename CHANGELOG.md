# CHANGELOG

All notable changes to the Music Mirror platform are documented in this file in adherence to the **Universal Version Control & Change Governance System** (`A.BC.DE.F`).

---

## 2.06.04.0 — 2026-09-21

- **Type**: Functional / Minor Revision (Level E)
- **Status**: Verified

### Spotify Secondary Provider Integration & Cross-Provider Identity Resolution

#### Added & Modernized
- **Spotify Secondary Metadata Provider (`SpotifyMetadataProvider`)**: Implemented backend Spotify provider using OAuth2 Client Credentials flow with client token caching, structured search, track lookup, and 429 Too Many Requests exponential backoff.
- **Cross-Provider Identity Resolution (`cross_match_spotify_youtube`)**: Deterministic multi-factor candidate matching supporting ISRC identity parity (1.0 confidence), normalized title and artist token overlap, and duration tolerance checks (±3s).
- **Enriched Candidate Envelopes**: Integrated parallel Spotify metadata discovery into YouTube discovery routes (`/api/v2/songs/youtube-search`), augmenting YouTube candidates with matched Spotify IDs, ISRCs, and ranking bonuses.
- **Frontend Spotify Provider Adapter (`SpotifyProviderAdapter`)**: Implemented provider adapter contract with explicit metadata playability semantics (`status: 'UNAVAILABLE'`, `testedCapability: 'metadataOnly'`) ensuring zero audio extraction and strictly compliant official embed delegation.
- **Canonical Normalizer Enrichment**: Extended domain models (`NormalizedCandidate`, `Track`) and `CanonicalNormalizer` with `spotifyId`, `isrc`, `albumName`, and `spotifyUri`.
- **Privacy & Provider Registry Hardening**: Registered `spotify_api` under `METADATA_PROVIDER` in `ProviderRegistry` with graceful degradation, zero client-side credentials, and strict zero-PII transmission.

### Verification
- Frontend (Vitest): **307/307 PASSED** across 20 test files (including 5 new unit tests for Spotify adapter)
- Backend (pytest): **149/149 PASSED** across 21 test files (including 6 new tests for Spotify provider and identity matching)
- Oxlint: 0 errors, 0 warnings (68 files)
- Production Build: 0 errors, clean TypeScript build

---

## 2.06.03.0 — 2026-09-21

- **Type**: Functional / Minor Revision (Level E)
- **Status**: Verified

### Decoupled Music Provider Integration & Entity Resolution

#### Added & Modernized
- **Domain Decoupling (`provider.ts`)**: Defined provider-agnostic `MusicProvider` contract, search options, normalized candidate response envelopes, and standard error taxonomy (`NETWORK_ERROR`, `RATE_LIMITED`, `NOT_FOUND`, `UNAVAILABLE`, etc.).
- **Variant Classification Engine (`VariantClassifier.ts`)**: Built heuristic classification mapping YouTube title/channel context into 8 distinct variants: `OFFICIAL_TRACK`, `OFFICIAL_VIDEO`, `LYRIC_VIDEO`, `LIVE_VERSION`, `REMIX`, `COVER`, `UNOFFICIAL_UPLOAD`, and `UNKNOWN`.
- **Entity Resolution & Provenance Normalization (`CanonicalNormalizer.ts`)**: Decoupled publisher channels from musical artists, stripping bracketed promotional noise, handling authoritative record label distributor channels (`T-Series`, `Sony Music`, `Aditya Music`), and mapping candidates to canonical `Track` models with field-level provenance confidence scoring.
- **YouTube Playback Adapter (`YouTubePlaybackAdapter.ts`)**: Extracted iframe embed creation and HTML5 postMessage bridge out of `MusicMirrorCore.ts`, creating clean abstraction boundaries for embedded playback.
- **YouTube Provider Adapter (`YouTubeProviderAdapter.ts`)**: Implemented provider adapter with explicit candidate validation (`isValidVideoId`), capability mapping (`officialEmbed`), and playability assessment.
- **Explicit Fallback Source Tagging**: Tagged all search discovery results with explicit source tags (`LIVE_PROVIDER_RESULT`, `LOCAL_CATALOG_RESULT`, `OFFLINE_RESULT`) ensuring transparent origin reporting without synthetic factual fabrication.

### Verification
- Frontend (Vitest): **302/302 PASSED** across 19 test files (including 18 new unit tests for provider integration)
- Backend (pytest): **143/143 PASSED** across 20 test files
- Oxlint: 0 errors, 0 warnings (66 files)
- Production Build: 0 errors, full TypeScript type-safety verified

---

## 2.06.02.0 — 2026-09-21

- **Type**: Bug / Fix Patch (Level F)
- **Status**: Verified

### Camera Stream Mount Synchronization & Audible Playback Engine

#### Fixed & Optimized
- **`Camera.tsx` Stream Mount Synchronization**: Added reactive `useEffect` listening to `phase === 'ACTIVE'` ensuring `videoRef.current.srcObject` is properly bound and `.play()` is invoked when `<video>` mounts in the DOM, eliminating the black video rectangle and ensuring continuous face emotion detection frames.
- **`Camera.tsx` Video Sizing**: Added explicit dimensions (`height: 240px`, `objectFit: cover`) and relaxed `detectLoop` readyState check to `>= 2` (`HAVE_CURRENT_DATA`) to enable immediate face tracking without stutter.
- **`MusicMirrorCore.ts` YouTube Playback Embed**: Wired real YouTube iframe embed into `#youtube-player-container` with cross-window `postMessage` command delegation for `play`, `pause`, `resume`, `stop`, `seek`, `setVolume`, and `toggleMute`.
- **`MusicMirrorCorePage.tsx` Container Binding**: Explicitly bound `musicMirrorCore.bindYouTubeContainer('youtube-player-container')` during page initialization.
- **`MusicMirrorCore.ts` Procedural Harmonic Audio Generator**: Implemented `createHarmonicWavUri(valence, energy)` generating valid 8-bit mono PCM musical audio chords matching the emotional profile of fallback tracks, replacing silent placeholders with genuine audible sound.
- **`AudioDspEngine.ts` Web Audio Resume**: Added `resumeContext()` and auto-resume in `connectElement` to unblock browser Web Audio autoplay policy suspension.

### Verification
- Frontend (Vitest): **284/284 PASSED** across 18 test files
- Backend (pytest): **143/143 PASSED** across 20 test files
- Oxlint: 0 errors, 0 warnings (60 files)
- TypeScript: Clean / Exit 0
- Production Vite Build: Exit 0 (524ms)

---

## 2.06.01.0 — 2026-09-20

- **Type**: Functional Revision (Level DE)
- **Status**: Verified

### Universal Modular Architecture & Change-Isolation Governance

#### Added & Codified
- **`.agents/rules/universal_modular_architecture_and_change_isolation.md`**: Authoritative system-wide governance rule enforcing domain/feature ownership boundaries, locality of code, change radius classification (Direct, Related, Dependent, Shared, Unrelated), and the 18-step master change workflow.
- **`ARCHITECTURE.md` (Overhauled)**: Comprehensive living architectural specification documenting the 10-stage core pipeline, frontend & backend domain ownership maps, module registry, end-to-end traceability chains, state ownership register, and zero-phantom/zero-orphan file audit.
- **`DEPENDENCY_MAP.md`**: Mermaid-rendered subsystem relationship diagram and module dependency matrix enforcing unidirectional downward dependency flow and zero circular coupling.

### Verification
- Frontend (Vitest): **284/284 PASSED** across 18 test files
- Backend (pytest): **143/143 PASSED** across 20 test files
- Oxlint: 0 errors, 0 warnings (60 files)
- TypeScript (tsc -b --noEmit): Clean / Exit 0
- Production Vite Build: Exit 0 (386ms)

---

## 2.06.00.0 — 2026-09-20

- **Type**: Sub-Version Milestone (Level BC)
- **Status**: Verified

### Production UX/UI Makeup Phase (Acoustic Obsidian Theme & Refined Typography)

#### Added & Modernized
- **Acoustic Obsidian Design Theme**: Replaced temporary raw wireframe styles with a sleek Obsidian and Indigo Reflection palette (`#050811`, `#0c1322`, `#141f36`).
- **Harmonic Typography System**: Integrated Google Fonts (`Space Grotesk` for brand/headers, `Outfit` for core interface and body copy, `JetBrains Mono` for telemetry and DSP matrices).
- **Glassmorphism & Surface Elevation**: Subtle translucent surface borders (`rgba(255, 255, 255, 0.07)`), ambient indigo backdrops, and hardware-accelerated transitions (150ms ease).
- **Ergonomic Diagnostics & Fallback Visibility**: Restyled diagnostics drawer, session trace logs, telemetry pills, and sequential fallback ladder indicators with color-coded status beacons.
- **Privacy & Consent Modal Styling**: Added dark, distraction-free modal overlay styles for privacy disclosures, device permissions, and consent confirmations.
- **Strict Zero-Emoji Governance**: Maintained 100% adherence to zero-emoji and zero-decorative-clutter requirements, achieving visual excellence purely through typography, color harmony, and micro-interactions.

### Verification
- Frontend (Vitest): **284/284 PASSED** across 18 test files
- Backend (pytest): **143/143 PASSED** across 20 test files
- Oxlint: 0 errors, 0 warnings (60 files)
- TypeScript (tsc -b --noEmit): Clean / Exit 0
- Production Vite Build: Exit 0 (386ms), CSS 12.49KB (2.78KB gzipped)

---

## 2.05.00.0 — 2026-09-20

- **Type**: Sub-Version Milestone (Level BC)
- **Status**: Verified

### Acoustic Audio DSP & Real-Time FFT Spectral Analysis Engine

#### Added
- **`AudioDspEngine.ts`**: High-precision mathematical audio DSP engine built on Web Audio API `AudioContext` and `AnalyserNode` (2048 FFT bins).
  - **RMS Signal Energy**: Direct root-mean-square calculation $[0.0, 1.0]$ across time-domain audio samples.
  - **Spectral Centroid**: Perceived brightness calculation (spectral center of gravity in Hz).
  - **Spectral Flatness**: Wiener entropy calculation (geometric mean / arithmetic mean) distinguishing harmonic tonality from white noise.
  - **Spectral Rolloff**: 85% energy concentration frequency boundary calculation.
  - **7-Band Acoustic Decomposition**: Real-time energy segmentation into Sub-bass (20–60Hz), Bass (60–250Hz), Low-Mid (250–500Hz), Mid (500–2000Hz), High-Mid (2000–4000Hz), Presence (4000–6000Hz), and Brilliance (6000–20000Hz).
  - **Dynamic Onset Detection**: Automatic transient energy jump detection for rhythm and beat alignment.
  - **Acoustic Metadata Validation**: Computes divergence between track affective metadata coordinates (expected energy/valence) and live audio signal characteristics.
- **`audio_dsp_engine.test.ts`**: 16 unit tests validating RMS calculation, spectral centroid discrimination, Wiener entropy flatness, 85% rolloff, 7-band frequency decomposition, onset detection, and metadata divergence checks.

#### Enhanced
- **`MusicMirrorCore.ts`**: Automatically connects active HTML5 audio element to `audioDspEngine`; exposes `getAcousticDspMetrics()` and `validateTrackAcoustics()`.
- **`MusicMirrorCorePage.tsx`**: Added "Sample Acoustic DSP" button in the diagnostics drawer outputting real-time RMS, Centroid, and Flatness readings.
- **`DataClassifier.ts`**: Registered `audio.rms_energy`, `audio.spectral_centroid`, `audio.spectral_flatness`, `audio.bands`, and `audio.validation_result` as `DataClass.INTERNAL`.

### Verification
- Frontend (Vitest): **284/284 PASSED** across 18 test files (+16 new tests)
- Backend (pytest): **143/143 PASSED** across 20 test files
- Oxlint: 0 errors, 0 warnings (60 files)
- TypeScript (tsc -b --noEmit): Clean / Exit 0
- Vite Build: Exit 0 (463ms), CSS 8.77KB

---

## 2.04.04.0 — 2026-09-20

- **Type**: Functional Revision (Level DE)
- **Status**: Verified

### PWA ServiceWorker Audio Stream Caching & TransmissionGate Privacy Enforcement

#### Added
- **`sw.js` (PWA Service Worker)**: Dual-tier caching service worker for offline shell (`mm-static-v2.04.04.0`) and dedicated audio stream cache (`mm-audio-stream-v1`).
  - Cache-first with bounded capacity (60 tracks) for audio chunks/streams (`.mp3`, `.m4a`, `.wav`, Jamendo streams).
  - Stale-while-revalidate for application assets (JS, CSS, SVGs).
  - PostMessage diagnostic protocol for `PURGE_AUDIO_CACHE` and `GET_CACHE_STATS`.
- **`ServiceWorkerManager.ts`**: Centralized service worker lifecycle coordinator.
  - Exposes `register()`, `unregister()`, `getStatus()`, `purgeAudioStreamCache()`, `getCacheStats()`.
  - Node/JSDOM environment resilient with direct `caches` fallback.
- **`TransmissionGate.ts` (Spec §15 Data Transmission Gate)**:
  - Strict destination verification against `ProviderRegistry.ts`.
  - Permanent architectural block and rejection of `DataClass.SENSITIVE_CONTEXT` (camera raw frames, biometric landmarks, raw PCM audio).
  - Consent enforcement for `PERSONAL_DATA` and `USER_DATA` via `ConsentRecord.ts`.
  - Unregistered fields blocked by default as unreviewed security risks.
  - Zero-PII structured audit log tracking field names and metrics only.
  - Helper functions: `evaluateTransmission()`, `assertCanTransmit()`, `sanitizeTransmissionPayload()`, `transmitSafely()`.
- **Test Suites**:
  - `transmission_gate.test.ts`: 13 comprehensive unit tests validating provider authorization, biometric blocking, consent gating, revocation, sanitization, and zero-PII logging.
  - `service_worker_manager.test.ts`: 8 unit tests validating singleton lifecycle, registration, unsupported fallbacks, cache purging, and metrics calculation.

#### Enhanced
- **`index.html`**: Linked `/manifest.json` for full PWA installability and ServiceWorker scope resolution.
- **`main.tsx`**: Automatic ServiceWorker background registration on startup.
- **`MusicMirrorCorePage.tsx`**: Added "Purge SW Cache" control button to diagnostics drawer alongside IndexedDB purge.
- **`CapabilityRegistry.ts` & `ConsentRecord.ts`**: Synchronized `CURRENT_POLICY_VERSION` to `2.04.04.0`.

### Verification
- Frontend (Vitest): **268/268 PASSED** across 17 test files (+21 new tests)
- Backend (pytest): **143/143 PASSED** across 20 test files
- Oxlint: 0 errors, 0 warnings (58 files)
- TypeScript (tsc -b --noEmit): Clean / Exit 0
- Vite Build: Exit 0 (651ms), CSS 8.77KB (<10KB budget)

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
