# Handoff Report — Explorer 2 (API Architecture & Router Structure Survey)

## 1. Observation
- **Repository Location:** `d:\PROJECT\Music Mirror`
- **Main FastAPI Entrypoint:** `backend/app/main.py` (imported by `backend/main.py`)
  - Lines 27-43 of `backend/app/main.py`:
    ```python
    app = FastAPI(title=settings.PROJECT_NAME, version="2.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/health", tags=["Health & Observability"])
    app.include_router(songs.router, prefix="/api/v2/songs", tags=["Songs Catalog & Metadata"])
    app.include_router(user_preferences.router, prefix="/api/v2/user/preferences", tags=["User Music Preferences"])
    app.include_router(reports.router, prefix="/api/v2/reports", tags=["Playback Self-Healing & Reports"])
    app.include_router(recommendations.router, prefix="/recommend", tags=["Recommendations"])
    app.include_router(telemetry.router, prefix="/telemetry", tags=["Telemetry"])
    app.include_router(local_explorer.router, prefix="/local-explorer", tags=["Local Explorer"])
    ```
- **Registered Route Namespaces (`backend/app/main.py`):**
  1. `/api/v2/songs` — Catalog & Metadata management (`backend/app/api/routes/songs.py`)
  2. `/api/v2/user/preferences` — User Music Preferences (`backend/app/api/routes/user_preferences.py`)
  3. `/api/v2/reports` — Playback problem reporting & self-healing (`backend/app/api/routes/reports.py`)
  4. `/recommend` — Emotion recommendation engine & transitions (`backend/app/api/routes/recommendations.py`)
  5. `/health` — Observability, database metrics, governance, MLOps, playback health (`backend/app/api/routes/health.py`)
  6. `/telemetry` — Cognitive telemetry tracking & evolution (`backend/app/api/routes/telemetry.py`)
  7. `/local-explorer` — Local filesystem directory browsing & audio streaming (`backend/app/api/routes/local_explorer.py`)

- **Unmounted / Unlinked Routers:**
  - `backend/app/api/routes/admin.py`: Defines `/safe-mode`, `/user/{target_user_id}`, `/repair-incidents` (not currently mounted in `app/main.py`).
  - `backend/app/api/routes/interactions.py`: Defines `POST /`, `GET /`, `GET /affinity` (not currently mounted in `app/main.py`).

- **Version 1 (`api/v1`) Status:**
  - Search across `backend/` confirmed **no `api/v1` routes exist**. All catalog and preference APIs are standardized under `/api/v2/`.

- **Existing Songs API Router (`backend/app/api/routes/songs.py`):**
  - `GET /api/v2/songs`: Lines 62-102
    ```python
    @router.get("", response_model=PaginatedSongsResponse)
    def get_songs(
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        genre: Optional[str] = None,
        mood: Optional[str] = None,
        language: Optional[str] = None,
        search: Optional[str] = None,
        db: Session = Depends(get_db),
    ):
    ```
    - Filtering implementation:
      - `genre`: `func.lower(Song.genre).contains(genre.lower())`
      - `mood`: `func.lower(Song.mood) == mood.lower()`
      - `language`: `func.lower(Song.language) == language.lower()`
      - `search`: checks `Song.normalized_title`, `Artist.normalized_name`, `Song.genre`
    - Pagination: `total_pages = math.ceil(total / limit) if total > 0 else 1`.
    - Non-500 handling: Returns empty list `items: []` with `total: 0` when query returns no records.
  - `GET /api/v2/songs/search`: Lines 105-126 — Quick title/artist/genre search returning `List[SongDTO]`.
  - `GET /api/v2/songs/{song_id}`: Lines 129-135 — Song details by ID, raises `HTTPException(status_code=404, detail="Song not found")`.
  - `GET /api/v2/songs/meta/genres`: Lines 137-140 — Distinct sorted list of genres in DB.
  - `GET /api/v2/songs/meta/moods`: Lines 143-146 — Distinct sorted list of moods in DB.
  - `GET /api/v2/songs/{song_id}/source`: Lines 149-208 — Resolves active, highest-health `SongSource` for player. Returns structured `"status": "unavailable"` object instead of 500 when source threshold not met.

- **Contracts & Pydantic Schemas (`backend/app/schemas/song.py`):**
  - `SongDTO`: Maps to `Song` model (`from_attributes=True`). Contains `id`, `title`, `normalized_title`, `artist_id`, `artist_name`, `album_id`, `album_title`, `duration`, `duration_str` (M:SS), `release_date`, `genre`, `sub_genre`, `language`, `explicit`, `track_number`, `cover_image_url`, `audio_url`, `preview_url`, `popularity`, AI feature attributes (`energy`, `danceability`, `valence`, `acousticness`, `instrumentalness`, `tempo`), `mood`, `tags`, `description`, `youtube_id`, and nested `artist` (`ArtistDTO`) and `album` (`AlbumDTO`).
  - `PaginatedSongsResponse`: `items: List[SongDTO]`, `total: int`, `page: int`, `limit: int`, `total_pages: int`.

- **Metadata Ingestion Pipeline (`backend/app/ingestion/`):**
  - `IngestionService.ingest_song_record(db, song_data, source_type)` (`backend/app/ingestion/ingestion_service.py:49-128`): Upserts `Artist`, `Album`, `Song`, and `SongSource` with normalization and deduplication.
  - `IngestionService.seed_database(db)` (`ingestion_service.py:130-145`): Populates database with 200+ curated items from `SEED_SONGS` (`seed_data.py`).
  - CLI runner: `backend/app/ingestion/cli.py` (`--seed`, `--query`, `--limit`, `--dry-run`).

- **Error Handling & Middleware:**
  - `HTTPException` used across routers for 400 (Bad Request), 401 (Unauthorized), 404 (Not Found), 429 (Rate Limit Exceeded).
  - Auth guard (`backend/app/core/auth.py`): `get_current_user` enforces Bearer token / `X-Auth-Token` validation, raising 401 if unauthenticated.
  - Rate limiter (`backend/app/core/rate_limiter.py`): `MemoryRateLimiter` enforces 300 requests/min per client, raising 429.

- **Test Suite Verification (`backend/tests/test_database_and_ingestion.py`):**
  - `test_get_songs_api(client, db_session)` (lines 90-101): Verifies `GET /api/v2/songs` status code 200, paginated structure, and `duration_str` format.
  - `test_search_songs_api(client, db_session)` (lines 103-110): Verifies `/api/v2/songs/search?q=Buttabomma`.

---

## 2. Logic Chain
1. **Observation 1:** `backend/app/main.py` mounts `songs.router` at `/api/v2/songs` and no `api/v1` routes exist in the project.
   **Deduction:** `/api/v2/songs` is the canonical version 2 endpoint for catalog queries and taxonomy filtering.
2. **Observation 2:** `backend/app/api/routes/songs.py` implements `@router.get("")` supporting `page`, `limit`, `genre`, `mood`, `language`, and `search` query parameters.
   **Deduction:** The base framework for `GET /api/v2/songs` with taxonomy filtering already exists and maps to SQLAlchemy `Song` and `Artist` models via `PaginatedSongsResponse` and `SongDTO`.
3. **Observation 3:** `get_songs()` uses `func.lower(Song.genre).contains(...)` and `func.lower(Song.mood) == ...`, returning empty `items: []` with `total_pages = 1` when no records match.
   **Deduction:** Non-500 handling for missing data / zero-match queries is already active in `songs.py`.
4. **Observation 4:** Metadata ingestion logic is fully realized in `IngestionService.ingest_song_record` and `IngestionService.seed_database` in `backend/app/ingestion/ingestion_service.py`, but has no direct HTTP REST endpoint in `songs.py` (currently run via CLI or startup auto-seed).
   **Deduction:** Implementing requirement R2 in full involves ensuring `GET /api/v2/songs` filtering meets all taxonomy schema contracts (R1) and optionally exposing a REST ingestion endpoint if required by the API suite.

---

## 3. Caveats
- `backend/app/api/routes/admin.py` and `backend/app/api/routes/interactions.py` are present in the router directory but are NOT included in `app.main.py`. The Implementer agent should check if `interactions.py` should be mounted under `/api/v2/user/interactions`.
- Read-only constraint: No changes were made to source code or tests during this survey phase.

---

## 4. Conclusion
The API architecture is built on FastAPI 2.0.0 with a clean router module structure under `backend/app/api/routes/`. The catalog endpoint `GET /api/v2/songs` already exists, supports pagination (`page`, `limit`), taxonomy filtering (`genre`, `mood`, `language`), and text search (`search`), returning Pydantic DTOs (`PaginatedSongsResponse` / `SongDTO`). Ingestion logic is handled via `IngestionService`. All missing-data conditions return 200 OK with clean empty payloads or 404 HTTPExceptions, completely preventing 500 internal server errors.

---

## 5. Verification Method
- **Pytest Suite Verification:** Run `python -m pytest backend/tests`
- **Inspect Router Configuration:** Check `backend/app/main.py` lines 27-44.
- **Inspect Songs Router:** Check `backend/app/api/routes/songs.py` lines 62-102.
- **Inspect Schemas:** Check `backend/app/schemas/song.py` lines 29-76.
- **Invalidation Condition:** Any direct database query error that throws an unhandled exception or returns a HTTP 500 status code on valid or empty queries.
