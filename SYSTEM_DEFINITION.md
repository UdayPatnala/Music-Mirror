# MUSIC MIRROR — SYSTEM DEFINITION, PURPOSE AND OPERATING PHILOSOPHY

> **AUTHORITATIVE ARCHITECTURAL SPECIFICATION**  
> Version: `2.03.01.0` | Status: `VERIFIED` | Priority: `CORE ENGINE FIRST`

---

## 1. Product Identity & Role

Music Mirror (MM) is **NOT merely a music player, a music-search website, or a UI experiment**.

Music Mirror is a **music intelligence, discovery, metadata, recommendation, and playback-orchestration system** whose user interface is only one possible client.

The system's objective is to understand a user's musical and emotional context and reliably transform that context into validated, playable music without friction or fragility.

---

## 2. The 10-Stage Core Pipeline

Music Mirror operates strictly on the following deterministic end-to-end pipeline:

```text
┌─────────────────────────┐
│ 1. UNDERSTAND           │ User context, emotional state, facial stream, subjective notes
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ 2. MODEL                │ Structured MusicIntent (valence, energy, target BPM, harmonic mode, policy)
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ 3. RETRIEVE             │ Candidate discovery across YouTube IFrame, Jamendo API, local SQLite catalog
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ 4. NORMALIZE            │ Canonical schema normalization (Track, Artist, Duration, Sources, AudioFeatures)
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ 5. RESOLVE              │ Entity resolution, variant deduplication, video ID format validation
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ 6. RANK                 │ Multi-factor ranking: intent matching, authority, popularity, penalties
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ 7. VALIDATE             │ Pre-flight playability check, provider capability attribution, duration sanity
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ 8. PLAY                 │ Sub-3s sequential fallback ladder (YouTube IFrame → HTML5 Audio → Data URI)
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ 9. OBSERVE              │ Playback state machine telemetry, error code trapping, monotonic session tokens
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ 10. LEARN               │ Local personalization engine update (exponential decay λ=0.98, cold-start)
└─────────────────────────┘
```

---

## 3. MM's Central Idea

Music Mirror answers the fundamental question:

> *"Given what is known about the user, their current context, and the available music, what music should be considered next, and how can that music be reliably identified, validated, and played through an appropriate source?"*

To solve this, MM decomposes the challenge into decoupled subsystems:
1. **Context Understanding**: Multi-modal fusion of webcam expressions, subjective mood input, and contextual notes.
2. **Intent Modeling**: Conversion of subjective emotions into objective acoustic targets (Russell's circumplex: valence $\in [0, 1]$, energy $\in [0, 1]$, BPM, mode).
3. **Candidate Discovery**: Multi-provider querying (YouTube Discovery Service, Jamendo API, seed database).
4. **Entity Resolution**: Deduplication of tracks, video ID filtering, and provider mapping.
5. **Quality & Ranking Evaluation**: Scoring based on relevance, channel authority, audio feature alignment, and repetition suppression.
6. **Playability & Availability**: Pre-playback format validation and automated failover when embeds are blocked (e.g. YouTube Error 150).
7. **Playback Orchestration**: Execution via headless state machine (`MusicMirrorCore`).
8. **Observation & Adaptation**: Feedback loop adjusting user weights locally with zero privacy compromise.

---

## 4. MM is NOT One Monolithic AI Model

Music Mirror rejects the fragile pattern:
$$\text{User} \longrightarrow \text{LLM} \longrightarrow \text{Song}$$

Instead, MM is engineered as a deterministic pipeline assisted by specialized probabilistic models where appropriate:

```text
Context (Physical + Subjective)
        ↓
Specialized Processing (face-api.js WASM / Circumplex Mapper)
        ↓
Structured Intent (MusicIntent DTO)
        ↓
Deterministic Retrieval (L1 Cache + 5-Level Expansion Ladder)
        ↓
Structured Metadata Normalization (Canonical Track DTO)
        ↓
Deterministic Multi-Factor Ranking (Composite Scorer)
        ↓
Playability Validation & Orchestration (Headless Engine)
```

AI models assist the system where probabilistic reasoning is useful (e.g., classifying facial action units into emotion categories). AI models **never invent deterministic facts** such as track duration, artist names, album identifiers, or playback URLs.

---

## 5. Explicit Sources of Truth

Music Mirror establishes strict boundary separation:

| Layer | Source of Truth | Scope & Responsibility |
| :--- | :--- | :--- |
| **Domain Truth** | `frontend/src/domain/canonical.ts` | Canonical domain models (`Track`, `Artist`, `PlaybackState`, `QueueState`). The single authoritative contract for the entire system. |
| **Provider Truth** | External Provider DTOs (`YouTubeCandidate`, `JamendoTrack`) | Raw third-party data. Always treated as untrusted and normalized before entering the domain layer. |
| **Runtime Truth** | `MusicMirrorCore` State Machine | Active playback status (`IDLE`, `SEARCHING`, `PREPARING`, `PLAYING`, `PAUSED`, `ERROR`), current track, active queue, audio volume. |
| **User Truth** | `PersonalizationStore` (LocalStorage) | User music preferences, liked/blocked artists, listening history. Exclusively client-side; zero biometric data stored. |
| **Model Inference** | Probabilistic Inference (`DetectionResult`) | Observable emotion inference and confidence scores. Never treated as immutable truth; always cross-validatable with subjective user input. |

---

## 6. Core Operating Philosophy & Design Principles

1. **Deterministic Where Possible, Probabilistic Only Where Useful**: Facts are retrieved and validated; only subjective interpretations are inferred.
2. **Provider-Independent**: No subsystem is tightly coupled to YouTube, Jamendo, or any single service. Providers sit behind uniform adapters.
3. **Testable Without UI**: The entire 10-stage pipeline can be executed, benchmarked, and verified headlessly (verified via 281 automated tests).
4. **Observable**: Monotonic event telemetry buffers log state transitions, latencies, and error codes without capturing PII.
5. **Recoverable & Fault-Tolerant**: Every external failure has an automatic recovery path (Sub-3s SLA failover ladder).
6. **Client-Side Privacy**: Raw facial imagery, video frames, and biometric tensors never leave the user's local browser canvas.

---

## 7. UI Philosophy: Client, Not Architecture

During the Core System phase:
- Visual UI is **FROZEN** and minimized to a functional console (`MusicMirrorCorePage.tsx`).
- Decorative layouts, animations, visual players, and marketing landing pages are deprioritized.
- The UI exists solely to exercise, observe, and verify the underlying engine.
- A beautiful UI over an unstable engine is a failure; a minimal UI over a rock-solid, verified engine is a success.

---

## 8. Definition of Success

Music Mirror is deemed successful when the entire 10-stage loop operates repeatedly and reliably:

$$\text{Context} \to \text{Intent} \to \text{Retrieval} \to \text{Normalize} \to \text{Resolve} \to \text{Rank} \to \text{Validate} \to \text{Play} \to \text{Observe} \to \text{Learn}$$

Under nominal conditions, boundary limits, network degradation, and external provider failures.
