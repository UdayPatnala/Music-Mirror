# MUSIC MIRROR — COMPLETE TECHNICAL OPERATING SPECIFICATION

> **Authoritative Version:** `2.04.01.0`  
> **System Architecture:** Headless Music Intelligence & Playback Orchestration Engine  
> **Lead Architect:** Patnala Uday Kumar  
> **Operating Mode:** CORE ENGINE FIRST (UI De-prioritized / Client Only)  

---

## 1. System Architecture

Music Mirror operates as a decoupled 11-engine architecture:

```text
                    MUSIC MIRROR

                         │
                         ▼
                 CONTEXT ENGINE
                         │
                         ▼
                 INTENT ENGINE
                         │
                         ▼
                RETRIEVAL ENGINE
                  /            \
                 /              \
        LOCAL CATALOG       PROVIDERS
                 \              /
                  \            /
                   ▼          ▼
                 CANDIDATE POOL
                         │
                         ▼
                  METADATA ENGINE
                         │
                         ▼
                ENTITY RESOLUTION
                         │
                         ▼
                    FILTERING
                         │
                         ▼
                    RANKING
                         │
                         ▼
                 PLAYABILITY
                    ENGINE
                         │
                         ▼
                 PLAYBACK ENGINE
                         │
                         ▼
                 FEEDBACK ENGINE
                         │
                         └──────→ CONTEXT UPDATE
```

---

## 2. Two Distinct Data Flows

Music Mirror strictly isolates catalog ingestion from runtime playback orchestration:

### Flow A. Catalog Ingestion (Offline / Batch / Background)
```text
Provider ──► Metadata Request ──► Validation ──► Normalization ──► Entity Matching ──► Deduplication ──► Enrichment ──► Quality Scoring ──► Canonical Catalog
```
- Handled by `backend/app/ingestion/` (`ingestion_service.py`, `normalizer.py`, `deduplication.py`).
- Executes schema verification, ISRC matching, audio feature normalization, and persistent database storage.

### Flow B. Runtime Retrieval (Real-Time / User Session)
```text
User / Context ──► Structured Intent ──► Catalog Search ──► Provider Search (if needed) ──► Candidate Merge ──► Filtering ──► Ranking ──► Playability Check ──► Playback
```
- Handled by `frontend/src/core/MusicMirrorCore.ts` and `backend/app/services/` (`ranking_service.py`, `source_discovery.py`).
- Sub-3000ms SLA, L1 query cache (30-min TTL), SingleFlight deduplication, and zero UI blocking.

---

## 3. Canonical Domain Models

Defined authoritatively in `frontend/src/domain/canonical.ts`:

### Track
```typescript
export interface Track {
  id: string;
  title: string;
  normalizedTitle: string;
  artist: string;
  artists: string[];
  artistIds?: string[];
  album?: string | null;
  albumId?: string | null;
  duration?: number;
  releaseDate?: string | null;
  trackNumber?: number;
  discNumber?: number;
  explicit?: boolean;
  language?: string;
  genres?: string[];
  isrc?: string | null;
  externalIds?: Record<string, string>;
  metadataQuality?: MetadataQualityScore;
  metadataStatus?: 'VALIDATED' | 'PROVISIONAL' | 'CONFLICT' | 'QUARANTINED';
  artworkUrl?: string | null;
  metadata: TrackMetadata;
  acousticFeatures: AcousticFeatures;
  primarySource: AudioSource;
  availableSources: AudioSource[];
  provenance?: Record<string, MetadataRecord>;
}
```

### Artist
```typescript
export interface Artist {
  id: string;
  name: string;
  normalizedName: string;
  aliases?: string[];
  externalIds?: Record<string, string>;
  imageUrl?: string | null;
  genres: string[];
}
```

### Album
```typescript
export interface Album {
  id: string;
  title: string;
  normalizedTitle: string;
  artistId?: string;
  artistIds?: string[];
  releaseDate?: string | null;
  albumType?: 'album' | 'single' | 'ep' | 'compilation';
  artwork?: string | null;
  coverImageUrl?: string | null;
  externalIds?: Record<string, string>;
}
```

### Source
```typescript
export interface Source {
  id: string;
  trackId: string;
  provider: string;
  externalId: string;
  sourceType: 'youtube' | 'jamendo' | 'local' | 'stream' | 'fallback';
  playbackRef: string;
  urlOrReference?: string | null;
  availability: 'AVAILABLE' | 'RESTRICTED' | 'UNAVAILABLE' | 'GEO_BLOCKED';
  region?: string;
  quality?: string;
  lastChecked: number;
  provenance?: Record<string, MetadataRecord>;
}
```

### MetadataRecord (Provenance)
```typescript
export interface MetadataRecord<T = unknown> {
  field: string;
  value: T;
  provider: string;
  retrievedAt: number;
  confidence: number;
  version?: string;
}
```

### PlaybackState
```typescript
export interface PlaybackState {
  status: PlaybackStatus;
  trackId?: string | null;
  sourceId?: string | null;
  position?: number;
  duration?: number;
  volume?: number;
  queueId?: string;
  requestId?: string;
  error: CoreError | null;
  currentTrack: Track | null;
  nextTrack: Track | null;
  currentTimeSeconds: number;
  durationSeconds: number;
  progressPercent: number;
  volumePercent: number;
  isMuted: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  activeProviderId: string;
  sequenceToken: number;
}
```

### SearchResult
```typescript
export interface SearchResult {
  query: string;
  normalizedQuery: string;
  provider?: string;
  results?: Track[];
  retrievedAt?: number;
  latency?: number;
  error?: CoreError | null;
  isCached: boolean;
  tracks: Track[];
  totalResults: number;
  latencyMs: number;
}
```

---

## 4. Metadata Provenance & Conflict Reconciler

Never treat external metadata as anonymous truth. For all ingested fields, provenance is tracked:
- `value`: Normalized representation.
- `provider`: Identity of source (e.g. `youtube-v3`, `jamendo-api`, `seed-sqlite`).
- `retrievedAt`: Unix epoch millisecond timestamp.
- `confidence`: Provider trustworthiness weight ($0.0 \le c \le 1.0$).

When multiple providers return conflicting values, `MetadataConflictEngine` (`backend/app/services/identity_resolution.py`) reconciles:
1. Deterministic ISRC match ($+0.5$ confidence).
2. Provider ID exact match ($+0.4$ confidence).
3. Duration within 3 seconds ($+0.15$ confidence).
4. Longest non-noisy title / majority voting for artist names.

---

## 5. Metadata Retrieval Strategy

1. **Step 1 — Search Canonical Catalog**: Query local/seeded database first using normalized query, artist aliases, and fuzzy tokens.
2. **Step 2 — Determine Confidence**: If match confidence $> 0.85$, return immediately (sub-5ms latency).
3. **Step 3 — Query Providers**: If confidence $< 0.85$, trigger `YouTubeDiscoveryService` or `JamendoProviderAdapter` based on provider capability attributes (`officialEmbed`, `directStream`, `metadataOnly`).
4. **Step 4 — Resolve Variants**: Reconcile version types (original, remix, live, acoustic, cover, radio edit, instrumental) before queue insertion.

---

## 6. Query Construction Ladder

Queries are built from structured intent rather than unstructured blobs:
- **Level 0 (Exact)**: `"{title} {artist}"`
- **Level 1 (Core)**: Normalized non-punctuated tokens
- **Level 2 (Artist)**: Primary artist + canonical genre
- **Level 3 (Mood Acoustic)**: Target valence + energy descriptors (e.g., `"calm acoustic melody"`)
- **Level 4 (Broadened)**: Baseline genre seed pool
- **Level 5 (Fallback)**: Offline royalty-free data URI catalog

---

## 7. Normalization Standards

Implemented via `backend/app/ingestion/normalizer.py`:
- Lowercase comparison form.
- Unicode NFKD decomposition (stripping diacritics).
- Punctuation-to-space replacement collapsing whitespace.
- Noise pattern stripping (e.g., `(Official Music Video)`, `[4K HD]`, `Full Video Song`, `(Lyrics)`).
- Preserves original display title in `title`, normalized key in `normalizedTitle`.

---

## 8. Entity Resolution Engine

Distinguishes between identical titles that are different recordings:
- **Deterministic**: Exact ISRC or Provider ID match.
- **Duration Boundary**: Tracks differing by $> 5\text{ seconds}$ are treated as distinct recordings even with identical titles.
- **Version Tags**: Explicit regex detection for `Live`, `Acoustic`, `Remix`, `Instrumental`, `Sped Up`, `Slowed`.

---

## 9. Metadata Quality Score

Every track receives a composite quality score ($0.0 \le Q \le 1.0$):
$$Q = 0.25 \cdot C_{\text{identity}} + 0.20 \cdot C_{\text{artist}} + 0.15 \cdot C_{\text{duration}} + 0.15 \cdot C_{\text{source}} + 0.15 \cdot \text{Completeness} + 0.10 \cdot \text{Freshness}$$

---

## 10. AI Model Strategy

- **Intent & Semantic Understanding**: Specialized models process natural-language and emotion cues into structured JSON DTOs:
  ```json
  {
    "mood": ["serene"],
    "energy": 0.25,
    "tempoPreference": 75,
    "genres": ["ambient", "acoustic"],
    "languages": ["Telugu", "English"],
    "explicitPreference": false,
    "confidence": 0.95,
    "policy": "REFLECT"
  }
  ```
- **Rule of Truth**: AI models produce **intent**, never fake metadata (duration, source URL, or ISRC).

---

## 11. Embedding Model Scope

- Embeddings are used strictly for semantic mood similarity, genre proximity, and preference clustering.
- Embeddings are **NEVER** used for deterministic track identification when ISRCs or Provider IDs are available.

---

## 12. Ranking Model

Two-stage separation:
1. **Retrieval**: "What could match?" (Recall candidate pool of 10–25 tracks).
2. **Ranking**: "Which candidate is most appropriate?" (Interpretable multi-factor weighted scorer):
   $$\text{Score} = 0.50 \cdot \text{IntentMatch} + 0.35 \cdot \text{Personalization} + 0.15 \cdot \text{Authority} - \text{RepetitionPenalty}$$

---

## 13. Recommendation Maturity Stages

- **Stage 1**: Rule-based acoustic boundaries (Valence / Energy thresholds).
- **Stage 2**: Weighted scoring ranker with exponential decay ($\lambda = 0.98$). *(Active)*
- **Stage 3**: Semantic vector embedding retrieval. *(Active in ML Ecosystem)*
- **Stage 4**: Personalized contextual multi-armed bandit. *(Planned)*
- **Stage 5**: Deep hybrid reinforcement ranker. *(Future)*

---

## 14. Emotion & Context Stabilization

Raw webcam signals undergo temporal Exponential Moving Average (EMA) smoothing ($\alpha = 0.25$, window $= 10$ frames):
- Rapid micro-expressions do not cause abrupt song changes.
- Track transitions require sustained emotional shifts ($> 3000\text{ ms}$) or explicit user intent.

---

## 15. Real-Time Search Hierarchy

Hierarchy:
1. In-memory L1 Cache ($< 5\text{ ms}$)
2. SQLite Canonical Database ($< 20\text{ ms}$)
3. Fast YouTube Candidate Pool ($< 600\text{ ms}$)
4. Secondary Provider (Jamendo API) ($< 1500\text{ ms}$)
5. Bounded Timeout: Any remote provider taking $> 2500\text{ ms}$ times out and triggers local catalog fallback.

---

## 16. Caching Architecture

- **Key**: `${query}:${limit}`
- **TTL**: 30 minutes (1800s)
- **Max Entries**: 500 query sets
- **SingleFlight Deduplication**: Concurrent identical queries share one in-flight Promise.
- **Cache Invalidation**: Explicit via `clearDiscoveryCache()` or TTL expiry.

---

## 17. Playability vs Found Separation

- **`FOUND`**: Track metadata exists in catalog or discovery search.
- **`PLAYABLE`**: Audio source verified via legitimate, supported browser interfaces:
  - YouTube: IFrame Embed Player API (Code 150 / 100 / 2 / 5 pre-flight trapped).
  - HTML5 Audio: Direct audio stream URL verified with valid MIME type.
  - Fallback: Pre-packaged data URI audio with 0 ms network dependency.

---

## 18. Playback Engine State Machine

```text
[IDLE] ──► [LOADING] ──► [READY] ──► [PLAYING] ◄──► [PAUSED]
                                          │
                                     [BUFFERING]
                                          │
                                      [ENDED] ──► [NEXT]
                                          │
                                      [ERROR] ──► [RECOVERY] ──► [PLAYING / READY]
```

---

## 19. Concurrency & Race-Condition Safety

- Monotonic `sequenceToken` / `sessionToken` increments on every operation.
- Out-of-order network responses are rejected when token $<$ current state token.
- `AbortController` aborts superseded discovery requests.

---

## 20. Failure Strategy & Sub-3s SLA

When a playback or network error occurs:
- Error code trapped in $\le 500\text{ ms}$.
- Provider marked degraded.
- Engine advances to Candidate #2 in $\le 1200\text{ ms}$.
- Guaranteed failover transition $< 3000\text{ ms}$.

---

## 21. Performance Instrumentation Targets

- **Query-to-Candidate Ready**: $< 800\text{ ms}$
- **L1 Cache Retrieval**: $< 5\text{ ms}$
- **Fallback Advance Latency**: $< 1200\text{ ms}$
- **Frontend Bundle Size**: $< 1\text{ MB}$ (JS), $< 1\text{ kB}$ (CSS)
- **Memory Footprint**: Bounded queue history (max 20 entries)

---

## 22. Performance Principle

The primary performance metric is:
> **Time from valid user/context intent to a trustworthy, validated, playable track ($< 2000\text{ ms}$).**

---

## 23. Storage Separation

- **Canonical Catalog**: SQLite `songs.db` (read-only in client runtime).
- **Cache**: In-memory `Map` (ephemeral).
- **User Data**: `LocalStorage` (`musicmirror_user_preference_profile_v1`).
- **Session State**: React `useState` & `MusicMirrorCore` memory.

---

## 24. User Feedback Loops

- **Implicit**: `COMPLETED` ($+0.05$), `SKIP` ($-0.08$), `REPLAY` ($+0.10$).
- **Explicit**: `LIKE` ($+0.25$), `DISLIKE` ($-0.40$), `BLOCK_ARTIST` ($-\infty$).
- **Decay**: Exponential decay ($\lambda = 0.98$) applied to prevent permanent saturation.

---

## 25. Observability & Telemetry

End-to-end trace correlation tokens:
$$\text{requestId} \to \text{intentId} \to \text{searchId} \to \text{candidateSetId} \to \text{rankingId} \to \text{playbackSessionId}$$
Logs are human-readable, structured, and free of PII.

---

## 26. Security & Privacy Governance

- **Zero-PII Biometric Storage**: Camera frames and face embeddings never leave browser memory.
- **Credential Decoupling**: API secrets decoupled from source tracking.
- **CORS Hardening**: Strict origin whitelist (`http://localhost:5173`, `http://127.0.0.1:5173`).

---

## 27. Testing Matrix (287 / 287 Tests Passing)

- **Nominal Flow**: Intent $\to$ Discovery $\to$ Ranking $\to$ Playback.
- **Boundary / Stress**: Rapid concurrent searches, empty candidate pools, malformed JSON.
- **Failure Injection**: Embed Error 150, network blackout, storage corruption, race conditions.
- **Pass Rate**: 143/143 Backend Pytest + 144/144 Frontend Vitest = 100%.

---

## 28. Headless Verification

The entire system is 100% executable and verifiable without mounting a visual interface. The UI is strictly a reactive observer of `MusicMirrorCore`.

---

## 29. Implementation Phases

```text
Phase 0: Forensic Audit               [COMPLETED]
Phase 1: Domain Models                [COMPLETED]
Phase 2: Provider Abstraction         [COMPLETED]
Phase 3: Metadata Ingestion           [COMPLETED]
Phase 4: Normalization                [COMPLETED]
Phase 5: Entity Resolution            [COMPLETED]
Phase 6: Catalog & Search             [COMPLETED]
Phase 7: Intent Engine                [COMPLETED]
Phase 8: Candidate Ranking            [COMPLETED]
Phase 9: Playability Engine           [COMPLETED]
Phase 10: Playback Orchestration      [COMPLETED]
Phase 11: Feedback Engine             [COMPLETED]
Phase 12: Caching & Persistence       [COMPLETED]
Phase 13: Reliability & SLA           [COMPLETED]
Phase 14: Testing & Verification      [COMPLETED]
Phase 15: Performance Optimization    [COMPLETED]
Phase 16: Security & Privacy Audit    [COMPLETED]
Phase 17: Final Core Gate & Hardening [COMPLETED - FROZEN]
Phase 18: UI/UX Engineering           [COMPLETED]
Phase 19: Soundwave DSP Canvas & Radar [COMPLETED]
```

---

## 30. Final Core Gate Status

```text
CORE SYSTEM STATUS: VERIFIED
UI/UX STATUS:       ACTIVE (Phase 19 Dynamic Soundwave & Circumplex Radar implemented)
VERSION:            2.04.01.0
NEXT PHASE:         PHASE 20 — OFFLINE INDEXEDDB AUDIO CACHING (v2.04.02.0)
```
