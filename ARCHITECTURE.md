# MusicMirror System Architecture & Technical Specification

> **Version:** 2.0.0 (Stage 01 Foundation + Stage 02 Emotion Engine + Stage 03 Music Intent Engine + Stage 04 Discovery Engine + Stage 05 Playback & Session Orchestration + Stage 06 End-to-End Real-Time Loop + Stage 07 Privacy-First Personalization)  
> **Author & Lead Architect:** Patnala Uday Kumar  
> **License & Cost Model:** 100% Free / Zero-Cost to End User  

---

## 1. System Goals & Non-Goals

### 1.1 Core Goals
* **Zero-Touch Emotion-to-Music Flow:** Open the app, grant camera access, infer observable facial emotion, generate music intent, discover appropriate track candidates, and begin playback with minimal user friction.
* **Zero-Cost to End User:** Eliminate dependencies on paid APIs, paid AI cloud endpoints, subscription services, or paid databases.
* **Legitimate Playback Only:** Play music exclusively through authorized, legitimate browser mechanisms (YouTube IFrame API, Jamendo CC API, FreeSound open audio, HTML5 audio streams). No website scraping, DRM bypass, or audio hijacking.
* **Client-Side Privacy:** Perform facial emotion inference entirely within the user's browser canvas/WASM runtime. Never upload facial images or video frames.
* **Privacy-First Local Personalization:** Learn individual user music preferences (`preferredGenres`, `preferredArtists`, `preferredLanguages`, `energyPreference`, `blockedGenres`, `blockedArtists`) locally without cloud LLMs, without paid recommendation APIs, and without storing facial biometrics or mental-health profiles.
* **Provider-Agnostic Core:** Decouple domain recommendation and intent logic from specific music providers or ML models.
* **Graceful Degradation:** Ensure full app usability (manual mood selection, fallback audio catalogs) if camera permissions are denied, emotion model fails to load, or external music APIs are unreachable.

### 1.2 Non-Goals
* **No Eye Tracking / Eye Control:** Gaze-based navigation is out of scope and intentionally omitted.
* **No Skeuomorphic CD Animations:** CD tray animations, spin-eject-insert visual gimmicks are out of scope and omitted.
* **No Medical/Clinical Claims:** Expression classification outputs are probabilistic observable inferences, not medical or psychological diagnosis.

---

## 2. STAGE 07: Privacy-First Personalization Architecture

```mermaid
graph TD
    subgraph 1. Feedback Inputs
        Implicit[Implicit Events: COMPLETED, SKIP, REPLAY, MANUAL_SELECTION]
        Explicit[Explicit Events: LIKE, DISLIKE, ADD_PREFERENCE, BLOCK_ARTIST]
    end

    subgraph 2. Personalization Engine (Client-Side)
        Implicit --> IncrementalUpdate[Incremental Weight Adjustments: alpha=0.05]
        Explicit --> DirectOverride[Manual & Explicit Weight Adjustments: delta=0.25 to 1.0]
        IncrementalUpdate --> DecayEngine[Exponential Decay: lambda=0.98]
        DirectOverride --> DecayEngine
        DecayEngine --> Store[PersonalizationStore: LocalStorage v1.0.0]
    end

    subgraph 3. Personalization Scorer & Ranking Integration
        Store --> Profile[MusicPreferenceProfile]
        Candidates[Discovery Layer Candidates] --> Scorer[PersonalizationScorer]
        Intent[Stage 03 MusicIntent] --> Scorer
        Profile --> Scorer
        Scorer --> HardConstraints{Hard Constraints Check?}
        HardConstraints -- Blocked Artist/Genre or Explicit Disabled --> Filtered[-Infinity / Discarded]
        HardConstraints -- Pass --> CompositeScore[Composite Final Score: 50% Intent + 35% Personalization - Repetition Penalty]
        CompositeScore --> RankedQueue[Ranked Candidates Queue]
    end
```

---

## 3. Data Inventory & Privacy Boundaries

### 3.1 What is Stored (Client-Side LocalStorage `musicmirror_user_preference_profile_v1`)
* `version`: Schema version (`'1.0.0'`)
* `userId`: Local session identifier
* `explicitContentAllowed`: Boolean flag for explicit lyrics
* `preferredLanguages`: Array of preferred language strings
* `preferredGenres`: Map of genre strings to normalized weights ($0.0 \le w \le 1.0$)
* `blockedGenres`: Array of blocked genre strings
* `preferredArtists`: Map of artist strings to normalized weights ($-1.0 \le w \le 1.0$)
* `blockedArtists`: Array of blocked artist strings
* `skipCount` & `playCount`: Aggregate interaction counters

### 3.2 What is EXCLUDED & NEVER Stored
* **NO** facial images or camera video frames
* **NO** face embeddings or biometric identifiers
* **NO** mental-health, clinical, or medical profile inferences
* **NO** permanent emotion-linked records ("when sad, user plays X")
* **NO** third-party analytics or cross-site tracking cookies
* **NO** paid cloud LLM or recommendation API tokens

---

## 4. Technology Choices & Rationale

| Category | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript | High reliability, strict type checking, standard UI library. |
| **Build System** | Vite 8 + tsc | Fast HMR, optimized production bundler, zero-config TS support. |
| **Personalization Engine** | `PersonalizationEngine` + `PersonalizationScorer` | Local-first, incremental learning, exponential decay ($\lambda = 0.98$), hard constraint filtering. |
| **Local Storage** | `PersonalizationStore` | Versioned schema (`version: '1.0.0'`), prototype pollution protection, corrupt data recovery. |
| **Emotion Inference** | Client-Side `face-api.js` (tfjs-wasm) | 100% free, runs in browser canvas via WebGL/WASM. Zero backend server costs, complete user privacy. |
| **Playback Engines** | `YouTubePlaybackAdapter` + `HTML5AudioPlaybackAdapter` | Legitimate iframe embeds & open HTML5 audio streams. 100% legal, zero DRM bypass. |
| **Testing** | Vitest + PyTest | 62 Vitest tests (unit, integration, deterministic simulation fixture); 9 PyTest backend tests. |

---

## 5. Verification Matrix

```
✓ Frontend Production Build:  npm run build --prefix frontend (tsc -b && vite build) → PASSED (0 errors)
✓ Frontend Lint Check:        npm run lint --prefix frontend (oxlint)                → PASSED (0 errors)
✓ Frontend Vitest Suite:     npx vitest run                                          → PASSED (62/62 tests)
✓ Backend PyTest Suite:       python -m pytest backend/tests                         → PASSED (9/9 tests)
```
