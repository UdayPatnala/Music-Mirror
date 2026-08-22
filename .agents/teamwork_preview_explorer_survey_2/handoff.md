# Handoff Report — Explorer 2 (Discovery & Optimization Spec Miner)

**Milestone**: Explorer Survey / Specification Mining (R1, R2, R5, R6)  
**Timestamp**: 2026-08-21T07:56:00Z  
**Author**: Explorer 2 (Discovery & Optimization Spec Miner)  
**Target Recipient**: Parent Orchestrator (`3a4be52a-a0be-4f72-8d4c-df06edfeee5b`) & Implementation Team  

---

## 1. Observation

Directly observed codebase evidence and file inspections:

1. **YouTube Provider Ingestion & Metadata Extraction**:
   - In `backend/app/ingestion/youtube_provider.py` (lines 18-59), `YouTubeMetadataProvider.search_metadata` extracts YouTube items using `yt_dlp` with `extract_flat: "in_playlist"` and returns candidate dictionaries with `source_id`, `raw_title`, `channel_name`, `duration`, `thumbnail_url`, `published_at`, and `view_count`.
   - In `backend/app/api/routes/songs.py` (lines 280-313), `/api/v2/songs/youtube-search` executes a naive token overlap matching (`score = overlap / len(query_words)`) and sorts candidates strictly by this single metric.
   - In `frontend/src/architecture/layers/ProviderAdapterLayer/YouTubeProviderAdapter.ts` (lines 11-51, 103-179), YouTube search is currently bound to a hardcoded dictionary (`TRACK_YOUTUBE_IDS`) and mock candidates list rather than dynamic multi-candidate scoring.

2. **Relevance Ranking & Scoring Architecture**:
   - In `frontend/src/architecture/layers/PersonalizationLayer/PersonalizationScorer.ts` (lines 84-135), scoring computes intent distance (`vDiff + eDiff`), genre/artist preference weights, and repetition penalty, but lacks YouTube-specific channel authority recognition, token Levenshtein matching, duration deviation penalty, and negative clickbait/reaction filtering.
   - In `backend/app/services/source_discovery.py` (lines 50-72), `SourceDiscoveryService._verify_source` checks duration (`abs(can_dur - src_dur) > 5000ms`) and substring matching, providing a baseline for source verification.

3. **Caching & Deduplication Layers**:
   - In `frontend/src/architecture/layers/DiscoveryLayer.ts` (lines 35-37, 121-135), a single-level intent cache (`cache: Map<string, CacheEntry>`) exists with 15-minute TTL and max size 100, but lacks a dedicated L2 Video Metadata Cache and does not implement in-flight Promise deduplication (SingleFlight pattern), meaning concurrent identical searches trigger redundant queries.
   - In `frontend/src/architecture/layers/DiscoveryLayer.ts` (lines 112-117, 151-153), generation tokens and `AbortController` cancellation exist, which cleanly abort superseded requests.

4. **Observability & Diagnostics**:
   - In `frontend/src/architecture/layers/ObservabilityLayer.ts` (lines 3-47, 49-112), `LoggerService` and `SessionTraceLogger` track performance markers (`startPerfMarker`, `endPerfMarker`) and a 100-item event buffer, but lack structured failure reason taxonomy codes (e.g. `ERR_YT_EMBED_RESTRICTED_150`) and candidate pool score distributions.
   - In `backend/app/api/routes/health.py` (lines 98-174), `/api/v2/health/playback` provides database interaction counts and circuit breaker health, establishing the precedent for backend diagnostic telemetry without user PII.

---

## 2. Logic Chain

1. **From Observation 1**: The current YouTube discovery implementation in `frontend/src/architecture/layers/ProviderAdapterLayer/YouTubeProviderAdapter.ts` uses static fallback lists, and `backend/app/api/routes/songs.py` uses naive token overlap. To satisfy **R1 (Query Intelligence & Candidate Discovery)**, we must integrate the multi-pass normalization pipeline (Unicode NFKD, noise token stripping, artist-title decomposition) and the 5-tier query expansion ladder (Tier 0 to Tier 4) with $K=10..25$ candidate pool retrieval.
2. **From Observation 2**: Current scoring in `PersonalizationScorer.ts` only scores emotion fit and learned genre weights. To satisfy **R2 (Weighted Scoring & Relevance Ranking)**, we need a multi-criteria formula combining string similarity ($0.35$), channel authority / VEVO / `- Topic` ($0.25$), duration proximity ($0.20$), popularity ($0.10$), and recency ($0.10$), with negative deductions for reaction, 1-hour loops, covers, and live recordings.
3. **From Observation 3**: The existing cache in `DiscoveryLayer.ts` is only a single-level intent map. To satisfy **R5 (Optimization)**, we must introduce a **Dual Caching Layer** (L1 Query Cache with 30m TTL + L2 Video Metadata Cache with 24h TTL) and an in-flight **SingleFlight deduplication registry** so that concurrent identical searches make exactly 1 external network call.
4. **From Observation 4**: Observability currently tracks basic timings in `ObservabilityLayer.ts` without categorization of player failure codes. To satisfy **R6 (Observability & Performance Monitoring)**, we must establish a structured error code taxonomy (`ERR_YT_EMBED_RESTRICTED_150`, `ERR_YT_NOT_FOUND_100`, etc.), latency breakdown collector, candidate pool metrics, and a 200-event circular buffer strictly isolating internal diagnostics from normal end-user UI.

---

## 3. Caveats

- **No Code Modified**: In strict adherence to read-only explorer constraints, no source files were changed during this survey.
- **YouTube IFrame Embedding Restrictions**: YouTube video owners can dynamically restrict 3rd-party domain embedding at any time (Error 150/101). The discovery engine must treat all candidates as potentially restricted and rely on the background preparation and automated fallback ladder to maintain uninterrupted playback.
- **yt-dlp Backend vs Direct YouTube Data API v3**: `yt-dlp` flat playlist extraction provides zero-cost metadata without API key quotas, but has higher latency ($200\text{ms}$) than direct memory caches. L1/L2 caching is critical to keep overall response times $<5\text{ms}$ on repeat queries.

---

## 4. Conclusion

A comprehensive technical blueprint and complete feature/edge case inventory have been documented in `analysis.md`. The design fulfills all acceptance criteria:
1. **R1**: Robust multi-pass normalization, semantic artist-title extraction, 5-tier expansion ladder, and $K=10..25$ candidate pool fetching.
2. **R2**: Multi-criteria weighted scoring algorithm ($w_{\text{sim}}=0.35, w_{\text{auth}}=0.25, w_{\text{dur}}=0.20, w_{\text{pop}}=0.10, w_{\text{rec}}=0.10$), channel authority classification, duration bounding, and negative token penalties.
3. **R5**: Dual L1/L2 caching layer (30m / 24h TTLs), in-flight SingleFlight deduplication, generation token cancellation, and background next-candidate preparation.
4. **R6**: Fine-grained latency breakdown, failure reason taxonomy, 200-event circular diagnostic buffer, and strict zero-PII privacy guarantees.

---

## 5. Verification Method

To independently verify the findings and specifications:

1. **Codebase Inspection**:
   - Inspect `frontend/src/architecture/layers/DiscoveryLayer.ts` to review current caching and provider querying.
   - Inspect `frontend/src/architecture/layers/PersonalizationLayer/PersonalizationScorer.ts` to verify scoring logic.
   - Inspect `backend/app/ingestion/youtube_provider.py` to review `yt_dlp` metadata extraction fields.
   - Inspect `backend/app/api/routes/songs.py` lines 280–313 to observe the naive YouTube search endpoint.

2. **Existing Test Suite Verification**:
   - Run Vitest tests: `npm test --prefix frontend` (or `npx vitest run --dir frontend`)
   - Run Pytest tests: `python -m pytest backend/tests`
   - All existing tests pass, confirming baseline integrity.

3. **Artifact Review**:
   - Read `d:\PROJECT\Btech\Music Mirror\.agents\teamwork_preview_explorer_survey_2\analysis.md` for complete mathematical formulas, data schemas, and edge case matrices.
