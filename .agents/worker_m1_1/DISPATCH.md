## 2026-08-21T08:05:57Z
You are the Milestone 1 Worker (Backend Discovery, Weighted Scoring & Caching API) for the Music Mirror upgrade project.
Working directory: d:\PROJECT\Btech\Music Mirror\.agents\worker_m1_1
Original Request: d:\PROJECT\Btech\Music Mirror\.agents\ORIGINAL_REQUEST.md
Project Master Plan: d:\PROJECT\Btech\Music Mirror\PROJECT.md
Explorer 2 Findings: d:\PROJECT\Btech\Music Mirror\.agents\teamwork_preview_explorer_survey_2\analysis.md
Codebase Root: d:\PROJECT\Btech\Music Mirror

Your Exclusive File Ownership:
- `backend/app/ingestion/youtube_provider.py`
- `backend/app/services/ranking_service.py`
- `backend/app/services/cache_service.py`
- `backend/app/schemas/songs.py`
- `backend/app/api/routes/songs.py`
- `backend/tests/test_youtube_discovery.py`
- `backend/tests/test_weighted_ranking.py`
- `backend/tests/test_cache_dedup.py`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Mission:
Implement Milestone 1 backend components:
1. Query Normalization & Preprocessing:
   - Implement Unicode NFKD normalization, punctuation/noise removal, artist-title extraction.
2. Multi-Candidate YouTube Discovery Pool:
   - Enhance `backend/app/ingestion/youtube_provider.py` to extract candidate pools ($K=10..25$) with complete metadata (`video_id`, `title`, `channel_name`, `channel_is_verified`, `channel_is_topic`, `channel_is_vevo`, `duration_seconds`, `published_at`, `view_count`, `thumbnail_url`).
3. Multi-Criteria Weighted Scoring & Ranking:
   - Create `backend/app/services/ranking_service.py` implementing composite weighted ranking:
     $S = w_{sim} \cdot S_{sim} + w_{auth} \cdot S_{auth} + w_{dur} \cdot S_{dur} + w_{pop} \cdot S_{pop} + w_{rec} \cdot S_{rec} - \text{Penalties}$
     with weights $w_{sim}=0.35, w_{auth}=0.25, w_{dur}=0.20, w_{pop}=0.10, w_{rec}=0.10$.
   - Recognize channel authority (VEVO, Topic, Verified badges) and apply negative penalties for reaction, review, cover, loop, live, 1 hour tokens.
4. Dual Caching & Concurrency SingleFlight Deduplication:
   - Create `backend/app/services/cache_service.py` implementing L1 Query Cache (30 min TTL), L2 Metadata Cache (24h TTL), and in-flight SingleFlight deduplication preventing duplicate external calls for identical concurrent queries.
5. Upgrade YouTube Search API Route:
   - Upgrade `GET /api/v2/songs/youtube-search` in `backend/app/api/routes/songs.py` to use the ranking and caching services, returning `YouTubeSearchResponseDTO` containing ranked candidate pool with detailed score breakdowns.
6. Comprehensive Unit Tests & Verification:
   - Create `backend/tests/test_youtube_discovery.py`, `backend/tests/test_weighted_ranking.py`, and `backend/tests/test_cache_dedup.py`.
   - Run the backend test suite: `python -m pytest backend/tests` ensuring 100% tests pass with zero regressions.
7. Write `handoff.md` and send a message back to the orchestrator when complete.
