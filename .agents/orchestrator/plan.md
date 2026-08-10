# Orchestrator Master Plan — Music Mirror

## Objective
Implement Shared Contracts, Music Catalog, and Taxonomy layers for Music Mirror per R1 and R2 in `d:\PROJECT\Music Mirror\.agents\ORIGINAL_REQUEST.md`.

## Phase 0: Codebase Survey & Feature Inventory [COMPLETED]
- 3 parallel Explorers surveyed Database Models, API Architecture, and Test Suite.
- Findings aggregated into `PROJECT.md` at `d:\PROJECT\Music Mirror\.agents\orchestrator\PROJECT.md`.

## Phase 1: Milestone 1 — Shared Contracts & Taxonomy (Requirement R1) [IN_PROGRESS]
- **Target Files**: `backend/app/schemas/taxonomy.py`, `backend/app/schemas/song.py`, `backend/app/schemas/__init__.py`.
- **Requirements**:
  - Implement Pydantic schemas: `GenreDTO`, `MoodDTO`, `TagDTO`, `TaxonomySummaryDTO`, `SongSourceDTO`, `SongCreateDTO`, `SongUpdateDTO`.
  - Ensure all schemas use Pydantic V2 syntax (`ConfigDict(from_attributes=True)` or `orm_mode=True` as appropriate).
  - Link schemas to existing SQLAlchemy models (`Song`, `Artist`, `Album`, `SongSource`).
- **Iteration Loop**: Explorer -> Worker -> Reviewer -> Challenger -> Auditor -> Gate.

## Phase 2: Milestone 2 — Music Catalog Endpoints & Metadata Ingestion (Requirement R2) [PLANNED]
- **Target Files**: `backend/app/api/routes/songs.py`, `backend/app/main.py`.
- **Requirements**:
  - Update `GET /api/v2/songs` to support filtering by `genre`, `mood`, `language`, `tag`, `sub_genre`, `artist_id`, `explicit`, and range filters (`energy_min`, `energy_max`, `valence_min`, `valence_max`).
  - Implement `POST /api/v2/songs` (metadata ingestion) using `SongCreateDTO` and `IngestionService.ingest_song_record`.
  - Update `/meta/taxonomy`, `/meta/genres`, `/meta/moods`, `/meta/tags`, and `/{song_id}/source` endpoints.
  - Guarantee non-500 handling on missing data or zero-match queries (return 200 OK with empty lists or 404 HTTPExceptions).
- **Iteration Loop**: Explorer -> Worker -> Reviewer -> Challenger -> Auditor -> Gate.

## Phase 3: Milestone 3 — Test Suite & Acceptance Verification [PLANNED]
- **Target Files**: `backend/tests/test_taxonomy_and_contracts.py`, `backend/tests/test_database_and_ingestion.py`.
- **Requirements**:
  - Add comprehensive pytest tests for schema validation and ORM mappings.
  - Add tests for single (`genre`, `mood`), combined (`genre` + `mood`), non-matching, and missing data catalog endpoint queries.
  - Add tests for `POST /api/v2/songs` ingestion.
  - Verify 100% pass on pytest test suite.
- **Iteration Loop**: Explorer -> Worker -> Reviewer -> Challenger -> Auditor -> Gate.

## Phase 4: Final Verification & Claim Completion [PLANNED]
- Send message to Sentinel with full verification report claiming completion.
