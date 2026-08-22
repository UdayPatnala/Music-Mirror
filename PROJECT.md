# Project: Music Mirror Autonomous YouTube Discovery & Playback Engine

## Architecture
Music Mirror is a decoupled, modern music discovery and playback application:
- **Backend**: FastAPI (Python 3.14 / SQLAlchemy 2.0 / SQLite WAL / yt-dlp) providing catalog management, taxonomy filtering, source resolution, and high-performance YouTube metadata discovery.
- **Frontend**: React 19 + TypeScript + Vite + Zustand layered architecture (ProviderAdapterLayer, PlaybackLayer, DiscoveryLayer, PersonalizationLayer, ObservabilityLayer, SessionOrchestrator) providing emotion-based music exploration and in-app embedded YouTube IFrame playback.
- **Data Flow**: User Query / Emotion Intent -> Query Normalizer & Expansion -> SingleFlight In-flight Deduplication & Cache Check -> YouTube Candidate Discovery Pool (=10..25$) -> Multi-Factor Weighted Scoring & Ranking -> Pre-playback Validation -> In-App IFrame Playback -> Central Recovery State Machine (sub-3s fallback on restriction/error -> query strategy retry -> graceful terminal state) -> Zero-PII Observability Telemetry.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Multi-Pass Query Normalization | Unicode NFKD normalization, punctuation/noise stripping, artist-title extraction | M1, M2 | R1 |
| F2 | YouTube Candidate Pool Fetching | Retrieval of multi-candidate metadata pool (=10..25$) via yt-dlp / API | M1 | R1 |
| F3 | Multi-Factor Weighted Scoring | Composite scoring combining string similarity (0.35), channel authority (0.25), duration proximity (0.20), popularity (0.10), and recency (0.10) with negative token penalty | M1, M2 | R2 |
| F4 | Channel Authority & Negative Filtering | Official badge, VEVO, and topic channel detection; penalty for reaction, cover, loop, live tokens | M1, M2 | R2 |
| F5 | In-App IFrame Playback Integration | YouTube IFrame Player API integration with full lifecycle state bindings (onReady, onStateChange, onError) | M3 | R3 |
| F6 | Rich Player Controls & State Machine | Play, pause, seek, volume, mute, progress ticker, fullscreen, loading and buffering indicators | M3 | R3 |
| F7 | Pre-Playback Candidate Validation | Fast format verification (11-char ID) and oEmbed playability probing | M3 | R4 |
| F8 | Automated Sequential Fallback Ladder | Sub-3s automated failover from candidate $ to +1$ upon playback/embed error (101, 150, 100, 2, 5) | M3 | R4 |
| F9 | Query Strategy Expansion Retry | 5-level query expansion ladder on pool exhaustion before terminal state | M2, M3 | R4 |
| F10 | Graceful Terminal Error State | Clean NO_PLAYABLE_MUSIC UI and recovery state when all candidates and retry strategies fail | M3 | R4 |
| F11 | Dual-Tier Caching Layer | L1 Query Cache (30 min TTL) and L2 Video Metadata Cache (24h TTL) | M1, M2 | R5 |
| F12 | In-Flight SingleFlight Deduplication | Concurrency registry preventing redundant simultaneous external calls for duplicate queries | M1, M2 | R5 |
| F13 | Background Candidate Preparation | Pre-caching and pre-fetching next candidate in queue | M2, M3 | R5 |
| F14 | Observability & Diagnostic Metrics | Latency tracking, candidate count distributions, fallback rate counters, error code taxonomy in circular buffer | M2, M3 | R6 |
| F15 | 4-Tier Opaque-Box E2E Test Suite | Automated test harness & test catalogue covering Tiers 1-4 (Nominal, Boundary, Cross-feature, Real-world) | E2E Track, M4 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Suite Track | Design test harness, mock YouTube player, and complete 4-tier requirement-driven E2E test suite publishing TEST_READY.md | none | IN_PROGRESS |
| M1 | Backend Discovery, Weighted Scoring & Caching API | Upgrade YouTube provider, multi-candidate search endpoint, scoring algorithms, and backend caching/deduplication | none | PLANNED |
| M2 | Frontend Discovery Engine, SingleFlight & Observability | Implement normalization, expansion, client-side scoring, L1/L2 caches, SingleFlight deduplication, and metrics telemetry | M1 | PLANNED |
| M3 | In-App Playback Engine, Central Recovery & Fallback Ladder | YouTube IFrame Player integration, error mapping, sub-3s fallback ladder, query expansion retry, and UI controls | M2 | PLANNED |
| M4 | Final Milestone: 100% E2E Test Pass & Hardening | Execute full test suite against integrated system, verify all acceptance criteria, and perform Tier 5 adversarial hardening | E2E, M3 | PLANNED |

## Interface Contracts

### Backend Discovery API: GET /api/v2/songs/youtube-search
- **Request Parameters**:
  - query: str (required, min length 1)
  - limit: int (optional, default 10, max 25)
  - expected_duration_ms: Optional[int] (optional duration for scoring alignment)
  - 	arget_artist: Optional[str] (optional artist for authority scoring)
- **Response Schema (YouTubeSearchResponseDTO)**:
  - query: str
  - 
ormalized_query: str
  - cached: bool
  - candidates: List[YouTubeCandidateDTO]
    - ideo_id: str (11-char ID)
    - 	itle: str
    - channel_name: str
    - channel_is_verified: bool
    - channel_is_topic: bool
    - channel_is_vevo: bool
    - duration_seconds: int
    - published_at: Optional[str]
    - iew_count: Optional[int]
    - 	humbnail_url: str
    - score: float (0.0 to 1.0)
    - score_breakdown: ScoreBreakdownDTO (similarity, authority, duration, recency, popularity, penalties)

### Frontend Discovery Contract (DiscoveryLayer)
- discover(query: string, options?: DiscoveryOptions): Promise<DiscoveryResult>
- deduplicateInFlight(key: string, fetcher: () => Promise<T>): Promise<T>
- getCached(key: string): DiscoveryResult | null

### Playback Provider Contract (PlaybackProvider)
- initialize(containerId: string): Promise<void>
- load(track: TrackCandidate): Promise<void>
- play(): Promise<void>
- pause(): Promise<void>
- seek(positionMs: number): Promise<void>
- setVolume(volumePercent: number): void
- getPlaybackState(): PlaybackState
- onStateChange(callback: (state: PlaybackState) => void): () => void
- onError(callback: (error: PlaybackError) => void): () => void

## Code Layout
- ackend/app/ingestion/youtube_provider.py: YouTube metadata extraction and flat playlist parsing
- ackend/app/services/ranking_service.py: Multi-criteria weighted scoring engine
- ackend/app/services/cache_service.py: In-memory TTL cache and SingleFlight deduplicator
- ackend/app/api/routes/songs.py: Song and YouTube discovery endpoints
- ackend/app/schemas/: Pydantic request/response DTOs
- rontend/src/architecture/layers/DiscoveryLayer.ts: Query normalization, multi-candidate discovery, L1/L2 cache
- rontend/src/architecture/layers/SingleFlight.ts: Concurrency deduplication registry
- rontend/src/architecture/layers/PersonalizationLayer/PersonalizationScorer.ts: Relevance scoring & token ranking
- rontend/src/architecture/layers/PlaybackLayer/PlaybackProvider.ts: Abstract player interface
- rontend/src/architecture/layers/PlaybackLayer/YouTubePlaybackAdapter.ts: YouTube IFrame API adapter
- rontend/src/architecture/layers/ObservabilityLayer.ts: Diagnostic metrics and error logger
- rontend/src/architecture/orchestrator/SessionOrchestrator.ts: Central Recovery State Machine & Fallback Ladder
- rontend/src/pages/MoodRoom.tsx: In-app playback UI, loading, controls, error banners
- rontend/tests/e2e/: 4-Tier E2E test suite and mock test harness
