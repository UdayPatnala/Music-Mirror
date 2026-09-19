# MUSIC MIRROR DESIGN & ENGINEERING DIRECTOR RULE

## PRIMARY OBJECTIVE
Music Mirror (MM) is a **music intelligence, discovery, metadata, recommendation, and playback-orchestration system** whose user interface is only one possible client.

MM's purpose is to understand the user's musical and emotional context and reliably transform that context into validated, playable music without friction or fragility.

---

## 10-STAGE CORE PIPELINE INVARIANT
Every operation on Music Mirror must respect the 10-stage deterministic pipeline:
$$\text{UNDERSTAND} \to \text{MODEL} \to \text{RETRIEVE} \to \text{NORMALIZE} \to \text{RESOLVE} \to \text{RANK} \to \text{VALIDATE} \to \text{PLAY} \to \text{OBSERVE} \to \text{LEARN}$$

1. **UNDERSTAND**: Multi-modal fusion of facial expressions, subjective feeling state, and user reflective context notes.
2. **MODEL**: Structured `MusicIntent` (valence, energy, target BPM, harmonic mode, policy: `REFLECT`, `REGULATE`, `CATHARSIS`, `BALANCE`).
3. **RETRIEVE**: Multi-provider querying (YouTube Discovery, Jamendo API, local SQLite catalog).
4. **NORMALIZE**: Canonical domain modeling (`canonical.ts`).
5. **RESOLVE**: Entity deduplication, video ID validation, variant resolution.
6. **RANK**: Multi-factor scoring (intent alignment, channel authority, recency, popularity, penalties).
7. **VALIDATE**: Pre-flight playability check, provider capability attribution.
8. **PLAY**: Sub-3s sequential fallback ladder (YouTube IFrame $\to$ HTML5 Audio $\to$ Data URI).
9. **OBSERVE**: Headless state machine telemetry and error code trapping.
10. **LEARN**: Client-side personalization updates (exponential decay $\lambda = 0.98$, cold-start heuristics).

---

## SOURCES OF TRUTH
- **Domain Truth**: Canonical domain model (`canonical.ts`).
- **Provider Truth**: Raw third-party provider DTOs (always untrusted, normalized before ingestion).
- **Runtime Truth**: `MusicMirrorCore` headless state machine.
- **User Truth**: `PersonalizationStore` (local storage, zero biometrics).
- **Model Inference**: Probabilistic emotion detection (never treated as immutable fact).

---

## CORE-FIRST OPERATING PHILOSOPHY
- **UI is a Client, Not the Architecture**: The visual interface remains minimal and frozen during the core phase (`MusicMirrorCorePage.tsx`).
- **Never Allow Visual Polish to Hide Architectural Weakness**: MM must first be a technically trustworthy music engine before any UI/UX refinement.
- **Sub-3s Failover SLA**: When embeds or streams fail (Error 150, 100, 2, 5), failover must occur in $< 3000\text{ ms}$.
- **Zero-PII Telemetry**: Never transmit or persist raw facial imagery, video frames, biometric tensors, or IP addresses.
