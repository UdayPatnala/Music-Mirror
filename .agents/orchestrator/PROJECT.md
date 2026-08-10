# Project: Music Mirror — Shared Contracts, Taxonomy & Music Catalog

## Architecture
- Framework: FastAPI 2.0.0, SQLAlchemy ORM, SQLite (`data/music_mirror.db`), Pytest.
- Layers:
  - Database Models: `backend/app/db/models.py` (`Song`, `Artist`, `Album`, `SongSource`, `UserMusicPreference`, `UserPlaybackReport`, `UserInteraction`, `UserAffinity`, `RepairIncident`)
  - Shared Contracts: `backend/app/schemas/` (`song.py`, `taxonomy.py`, `emotion.py`, `user_preference.py`)
  - API Router: `backend/app/api/routes/songs.py` mounted at `/api/v2/songs` in `backend/app/main.py`
  - Ingestion Pipeline: `backend/app/ingestion/ingestion_service.py` (`IngestionService`)
  - Test Suite: `backend/tests/` (116 passing tests across `test_catalog_endpoints.py`, `test_m2_catalog_edge_cases.py`, `test_shared_contracts.py`, etc.)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Taxonomy Pydantic Schemas | `GenreDTO`, `MoodDTO`, `TagDTO`, `TaxonomySummaryDTO` | M1 | R1 |
| 2 | Catalog & Ingestion Contracts | `SongSourceDTO`, `SongCreateDTO`, `SongUpdateDTO`, enhanced `SongDTO` | M1 | R1 |
| 3 | ORM to Pydantic Mappings | Verify bidirectional mapping between SQLAlchemy models and Pydantic schemas | M1 | R1 |
| 4 | Catalog Filtering Endpoints | `GET /api/v2/songs` with `genre`, `mood`, `language`, `tag`, `sub_genre`, audio feature ranges | M2 | R2 |
| 5 | Non-500 Error Handling | Return 200 OK with empty lists or 404 HTTPExceptions on missing/empty data | M2 | R2 |
| 6 | Metadata Ingestion Endpoint | `POST /api/v2/songs` for ingesting song records via `IngestionService` | M2 | R2 |
| 7 | Taxonomy Metadata Endpoints | `GET /api/v2/songs/meta/taxonomy`, `/genres`, `/moods`, `/tags` returning contracts | M2 | R2 |
| 8 | E2E & Unit Test Verification | Pytest tests for schema mappings, endpoint filtering, ingestion, and non-500 checks | M3 | Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Shared Contracts & Taxonomy | Define Pydantic schemas in `backend/app/schemas/taxonomy.py` and `song.py`, ensure ORM mapping | None | DONE |
| 2 | M2: Music Catalog Endpoints & Ingestion | Build out `songs.py` router (`GET /api/v2/songs` filtering, `POST` ingestion, meta endpoints) | M1 | DONE |
| 3 | M3: Testing & Acceptance Verification | Add Pytest test suites in `backend/tests/`, verify all acceptance criteria | M1, M2 | DONE |

## Interface Contracts
### `backend/app/schemas/taxonomy.py` ↔ `backend/app/api/routes/songs.py`
- `GenreDTO`: `name: str`, `normalized_name: str`, `description: Optional[str]`, `song_count: int = 0`
- `MoodDTO`: `name: str`, `normalized_name: str`, `valence_range: Optional[Tuple[float, float]]`, `energy_range: Optional[Tuple[float, float]]`, `description: Optional[str]`, `song_count: int = 0`
- `TagDTO`: `name: str`, `category: Optional[str]`, `usage_count: int = 0`
- `TaxonomySummaryDTO`: `genres: List[GenreDTO]`, `moods: List[MoodDTO]`, `tags: List[TagDTO]`, `total_genres: int`, `total_moods: int`, `total_tags: int`
- `SongSourceDTO`: `id: str`, `song_id: str`, `source_type: str`, `source_id: str`, `source_url: Optional[str]`, `status: str`, `health_score: float`, `reliability_score: float`, `channel_name: Optional[str]`
- `SongCreateDTO`: `title: str`, `artist_name: str`, `album_title: Optional[str]`, `duration: int = 180`, `genre: str = "Pop"`, `sub_genre: Optional[str]`, `language: str = "English"`, `mood: str = "neutral"`, `tags: Optional[str]`, `cover_image_url: Optional[str]`, `audio_url: Optional[str]`, `preview_url: Optional[str]`, `explicit: bool = False`

## Code Layout
- `backend/app/schemas/taxonomy.py`: Taxonomy & source DTOs.
- `backend/app/schemas/song.py`: Updated song DTOs (`SongDTO`, `SongCreateDTO`, `SongUpdateDTO`, `PaginatedSongsResponse`).
- `backend/app/schemas/__init__.py`: Package exports for all 18 DTOs.
- `backend/app/api/routes/songs.py`: Updated router endpoints.
- `backend/app/ingestion/ingestion_service.py`: Updated metadata ingestion bridge logic.
- `backend/tests/test_shared_contracts.py`, `backend/tests/test_catalog_endpoints.py`, `backend/tests/test_m2_catalog_edge_cases.py`: Unit and edge-case tests.
