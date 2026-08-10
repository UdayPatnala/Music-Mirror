# Explorer 1 Handoff Report — Database Models, Taxonomy & Shared Contracts Analysis

## 1. Observation

### 1.1 Project Structure & System Context
* Original request (`d:\PROJECT\Music Mirror\.agents\ORIGINAL_REQUEST.md`):
  - R1: Establish Shared Contracts & Taxonomy (Pydantic schemas and baseline taxonomy logic for genres, moods, tags).
  - R2: Develop Music Catalog Endpoints (`GET /api/v2/songs` with filtering by genre and mood, metadata ingestion, strict adherence to `Song` and `Artist` database models).
* Technical Stack: FastAPI 2.0.0, SQLAlchemy ORM, SQLite (`music_mirror.db` with WAL mode and foreign key enforcement), PyTest test suite.

### 1.2 Database Configuration
* **File:** `d:\PROJECT\Music Mirror\backend\app\db\database.py` (lines 1–37)
  - **Database URL:** `os.getenv("DATABASE_URL", "sqlite:///.../data/music_mirror.db")` (lines 9–10)
  - **SQLite PRAGMAs:** `PRAGMA foreign_keys=ON`, `PRAGMA journal_mode=WAL` configured via event listener on `connect` (lines 20–25).
  - **Session & Base:** `SessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)` (line 27); `Base = declarative_base()` (line 28). `get_db()` dependency yields DB session (lines 31–36).

### 1.3 Existing SQLAlchemy ORM Models Catalog
All 9 SQLAlchemy models are defined in `d:\PROJECT\Music Mirror\backend\app\db\models.py` (lines 1–307):

1. **`Artist`** (`backend/app/db/models.py:23-38`):
   - Table: `artists`
   - Fields:
     - `id`: `Column(String(36), primary_key=True, default=generate_uuid)`
     - `name`: `Column(String(255), nullable=False)`
     - `normalized_name`: `Column(String(255), nullable=False, unique=True, index=True)`
     - `image_url`: `Column(Text, nullable=True)`
     - `bio`: `Column(Text, nullable=True)`
     - `genres`: `Column(String(255), nullable=True)` (comma-separated string)
     - `country`: `Column(String(100), nullable=True)`
     - `created_at`: `Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)`
     - `updated_at`: `Column(DateTime, default=..., onupdate=..., nullable=False)`
   - Relationships:
     - `songs`: `relationship("Song", back_populates="artist", cascade="all, delete-orphan")`
     - `albums`: `relationship("Album", back_populates="artist", cascade="all, delete-orphan")`

2. **`Album`** (`backend/app/db/models.py:40-60`):
   - Table: `albums`
   - Fields:
     - `id`: `Column(String(36), primary_key=True, default=generate_uuid)`
     - `title`: `Column(String(255), nullable=False)`
     - `normalized_title`: `Column(String(255), nullable=False, index=True)`
     - `artist_id`: `Column(String(36), ForeignKey("artists.id", ondelete="CASCADE"), nullable=False, index=True)`
     - `cover_image_url`: `Column(Text, nullable=True)`
     - `release_date`: `Column(String(50), nullable=True)`
     - `album_type`: `Column(String(50), default="album")`
     - `total_tracks`: `Column(Integer, default=1)`
     - `created_at`, `updated_at`: `DateTime`
   - Table Arguments: `UniqueConstraint("artist_id", "normalized_title", name="uix_album_artist_title")`
   - Relationships:
     - `artist`: `relationship("Artist", back_populates="albums")`
     - `songs`: `relationship("Song", back_populates="album", cascade="all, delete-orphan")`

3. **`Song`** (`backend/app/db/models.py:62-116`):
   - Table: `songs`
   - Fields:
     - `id`: `Column(String(36), primary_key=True, default=generate_uuid)`
     - `title`: `Column(String(255), nullable=False)`
     - `normalized_title`: `Column(String(255), nullable=False, index=True)`
     - `artist_id`: `Column(String(36), ForeignKey("artists.id", ondelete="CASCADE"), nullable=False, index=True)`
     - `album_id`: `Column(String(36), ForeignKey("albums.id", ondelete="SET NULL"), nullable=True, index=True)`
     - `album_title`: `Column(String(255), nullable=True)`
     - `duration`: `Column(Integer, nullable=False, default=180)` (seconds)
     - `release_date`: `Column(String(50), nullable=True)`
     - `genre`: `Column(String(100), nullable=False, default="Pop", index=True)`
     - `sub_genre`: `Column(String(100), nullable=True)`
     - `language`: `Column(String(50), nullable=False, default="English", index=True)`
     - `explicit`: `Column(Boolean, default=False)`
     - `track_number`: `Column(Integer, default=1)`
     - `disc_number`: `Column(Integer, default=1)`
     - `cover_image_url`: `Column(Text, nullable=True)`
     - `audio_url`: `Column(Text, nullable=True)`
     - `preview_url`: `Column(Text, nullable=True)`
     - `lyrics_availability`: `Column(Boolean, default=False)`
     - `isrc`: `Column(String(50), nullable=True, index=True)`
     - `popularity`: `Column(Integer, default=80, index=True)`
     - `energy`: `Column(Float, default=0.5, index=True)`
     - `danceability`: `Column(Float, default=0.5)`
     - `valence`: `Column(Float, default=0.5, index=True)`
     - `acousticness`: `Column(Float, default=0.5)`
     - `instrumentalness`: `Column(Float, default=0.0)`
     - `tempo`: `Column(Float, default=120.0)`
     - `key`: `Column(Integer, nullable=True)`
     - `mode`: `Column(Integer, nullable=True)`
     - `loudness`: `Column(Float, nullable=True)`
     - `mood`: `Column(String(50), nullable=False, default="neutral", index=True)`
     - `tags`: `Column(Text, nullable=True)` (comma-separated string)
     - `description`: `Column(Text, nullable=True)`
     - `youtube_id`: `Column(String(100), nullable=True, index=True)`
     - `is_estimated_ai_metrics`: `Column(Boolean, default=True)`
     - `created_at`, `updated_at`: `DateTime`
   - Table Arguments:
     - `UniqueConstraint("artist_id", "normalized_title", name="uix_song_artist_title")`
     - `Index("idx_song_genre_mood", "genre", "mood")`
     - `Index("idx_song_valence_energy", "valence", "energy")`
   - Relationships:
     - `artist`: `relationship("Artist", back_populates="songs")`
     - `album`: `relationship("Album", back_populates="songs")`
     - `sources`: `relationship("SongSource", back_populates="song", cascade="all, delete-orphan")`

4. **`SongSource`** (`backend/app/db/models.py:118-156`):
   - Table: `song_sources`
   - Fields: `id`, `song_id` (FK to `songs.id`), `source_type`, `source_id`, `source_url`, `status`, `health_score`, `priority`, `success_count`, `failure_count`, `consecutive_failures`, `reliability_score`, `title_at_source`, `duration_at_source`, `thumbnail_url`, `channel_name`, `last_checked_at`, `last_verified_at`, `last_fetched_at`, `stale_after_hours`, `created_at`, `updated_at`.
   - Table Arguments: `UniqueConstraint("source_type", "source_id", name="uix_source_type_id")`
   - Relationships: `song`: `relationship("Song", back_populates="sources")`

5. **`UserMusicPreference`** (`backend/app/db/models.py:158-185`):
   - Table: `user_music_preferences`
   - Fields: `id`, `user_id` (unique, indexed), `profile_version`, `discovery_mode`, `energy_preference`, `tempo_preference`, `vocal_preference`, `explicit_content_mode`, `preferred_genres` (JSON), `preferred_artists` (JSON), `preferred_moods` (JSON), `preferred_languages` (JSON), `blocked_artists` (JSON), `blocked_songs` (JSON), `private_session`, `do_not_learn`, `created_at`, `updated_at`.

6. **`UserPlaybackReport`** (`backend/app/db/models.py:187-205`):
   - Table: `user_playback_reports`
   - Fields: `id`, `user_id`, `song_id` (FK to `songs.id`), `source_id`, `report_type`, `issue_classification`, `description`, `error_code`, `status`, `confidence`, `created_at`, `updated_at`.

7. **`UserInteraction`** (`backend/app/db/models.py:207-242`):
   - Table: `user_interactions`
   - Fields: `id`, `user_id`, `song_id` (FK to `songs.id`), `interaction_type`, `play_duration_seconds`, `song_duration_seconds`, `completion_ratio`, `session_id`, `is_private_session`, `context_emotion`, `context_genre`, `created_at`.
   - Relationships: `song`: `relationship("Song", foreign_keys=[song_id])`

8. **`UserAffinity`** (`backend/app/db/models.py:244-273`):
   - Table: `user_affinities`
   - Fields: `id`, `user_id`, `entity_type` ('SONG', 'ARTIST', 'GENRE', 'MOOD', 'LANGUAGE'), `entity_id`, `affinity_score`, `interaction_count`, `positive_count`, `negative_count`, `last_interaction_at`, `profile_version`, `created_at`, `updated_at`.
   - Table Arguments: `UniqueConstraint("user_id", "entity_type", "entity_id", name="uix_affinity_user_entity")`

9. **`RepairIncident`** (`backend/app/db/models.py:275-303`):
   - Table: `repair_incidents`
   - Fields: `id`, `incident_id` (unique), `song_id` (FK to `songs.id`), `old_source_id`, `new_source_id`, `classification`, `reason`, `confidence`, `verification_result`, `canary_passed`, `rolled_back`, `rolled_back_at`, `algorithm_version`, `trigger`, `created_at`, `updated_at`.

### 1.4 Existing Pydantic Schemas catalog
* **`backend/app/schemas/song.py`**:
  - `ArtistDTO`: `id`, `name`, `normalized_name`, `image_url`, `bio`, `genres`, `country`.
  - `AlbumDTO`: `id`, `title`, `normalized_title`, `artist_id`, `cover_image_url`, `release_date`, `total_tracks`.
  - `SongDTO`: `id`, `title`, `normalized_title`, `artist_id`, `artist_name`, `album_id`, `album_title`, `duration`, `duration_str`, `release_date`, `genre`, `sub_genre`, `language`, `explicit`, `track_number`, `cover_image_url`, `audio_url`, `preview_url`, `popularity`, `energy`, `danceability`, `valence`, `acousticness`, `instrumentalness`, `tempo`, `mood`, `tags`, `description`, `youtube_id`, `artist`, `album`.
  - `PaginatedSongsResponse`: `items: List[SongDTO]`, `total: int`, `page: int`, `limit: int`, `total_pages: int`.
* **`backend/app/schemas/emotion.py`**:
  - `EmotionRequest`, `SongResponse`, `RecommendationResponse`, `TransitionRequest`, `TransitionResponse`.
* **`backend/app/schemas/user_preference.py`**:
  - `UserMusicPreferenceDTO`, `UpdateUserMusicPreferencePayload`.

---

## 2. Logic Chain

1. **Observation 1.1 & 1.3 → Database Model Assessment**:
   - The database model `Song` contains direct columns for `genre` (`String(100)`), `sub_genre` (`String(100)`), `mood` (`String(50)`), `language` (`String(50)`), and `tags` (`Text` - comma separated).
   - `Artist` contains `genres` (`String(255)`).
   - This database design relies on denormalized string columns for taxonomy attributes on `Song` and `Artist` rather than separate normalized relational tables (`Genre`, `Mood`, `Tag`).

2. **Observation 1.4 → Shared Contracts Gap Analysis**:
   - While `SongDTO`, `ArtistDTO`, and `AlbumDTO` exist in `backend/app/schemas/song.py`, there are **NO Pydantic schemas defined for Taxonomy entities/responses** (e.g. `GenreDTO`, `MoodDTO`, `TagDTO`, `TaxonomySummaryDTO`, `TaxonomyFilterDTO`).
   - `SongSource` exists as a SQLAlchemy model (`SongSource`), but there is no `SongSourceDTO` in `backend/app/schemas/song.py`. In `backend/app/api/routes/songs.py:183-208`, the endpoint returns a raw Python `dict` instead of a validated Pydantic model.
   - For metadata ingestion (R1 / R2 requirement), there is currently **NO Pydantic request schema** (such as `SongCreateDTO` / `SongIngestPayload` or `SongUpdateDTO`) to validate incoming payloads for song ingestion endpoints.

3. **Observation 1.1 & 1.3 → Music Catalog Router (`backend/app/api/routes/songs.py`) Gap Analysis**:
   - `GET /api/v2/songs` (lines 62–102) handles query parameters `page`, `limit`, `genre`, `mood`, `language`, `search`.
   - `genre` is filtered using `func.lower(Song.genre).contains(genre.lower())`.
   - `mood` is filtered using `func.lower(Song.mood) == mood.lower()`.
   - `language` is filtered using `func.lower(Song.language) == language.lower()`.
   - **Missing Filtering Capabilities**: Filtering by `tags` (comma-separated tag lookup), `sub_genre`, `artist_id`, `album_id`, `explicit`, or audio feature ranges (`energy_min`, `energy_max`, `valence_min`, `valence_max`).
   - **Missing Taxonomy Metadata Endpoints**: `GET /meta/genres` and `GET /meta/moods` exist, but there is no `GET /meta/tags`, `GET /meta/languages`, or unified `GET /meta/taxonomy` endpoint.
   - **Missing Metadata Ingestion Endpoint**: Requirement R2 states "build out the songs API router to allow for catalog querying, filtering by taxonomy..., and metadata ingestion". Currently, `IngestionService.ingest_song_record` is used only during database seeding in `main.py` and `cli.py`, but there is **no HTTP endpoint** `POST /api/v2/songs` or `POST /api/v2/songs/ingest` in `songs.py` to ingest new song metadata programmatically via API.

---

## 3. Caveats

* **Database Normalization Strategy**: The project currently uses flat string columns for `genre`, `sub_genre`, `mood`, `tags` directly inside `songs` table rather than separate `genres`, `moods`, `tags` tables. Attempting a full relational database migration to create separate `Genre`/`Mood`/`Tag` tables would break existing raw query references and tests unless carefully backward-compatible. Preserving the existing `Song` schema while building comprehensive Pydantic schemas and taxonomy helper utilities is the least risky path aligned with prompt constraints ("strict adherence to existing Song and Artist database models").
* **Frontend Expectations**: Frontend (`frontend/src/domain/types.ts`) uses `MusicCandidate` with properties `valence`, `energy`, `tempo`, `genre`, `language`, `providerId`, `providerData`. `SongDTO` maps cleanly to these fields.

---

## 4. Conclusion

1. **Existing Database Schema**: The 9 SQLAlchemy models in `backend/app/db/models.py` (`Artist`, `Album`, `Song`, `SongSource`, `UserMusicPreference`, `UserPlaybackReport`, `UserInteraction`, `UserAffinity`, `RepairIncident`) provide complete coverage for songs, artists, albums, sources, and user preferences/interactions.
2. **Required Shared Contracts Additions (`backend/app/schemas/`):**
   - **Taxonomy Schemas:** `GenreDTO`, `MoodDTO`, `TagDTO`, `TaxonomySummaryDTO` in a new or updated schema module (`backend/app/schemas/taxonomy.py` or added to `song.py`).
   - **Song Ingestion Schemas:** `SongCreateDTO` / `SongIngestPayload` and `SongUpdateDTO` to validate song metadata ingestion payloads.
   - **Source Contract:** `SongSourceDTO` to validate source resolution API responses.
   - **Enhanced `SongDTO`:** Ensure `tag_list: List[str]` is computed from comma-separated `tags`.
3. **Required Music Catalog API Router Updates (`backend/app/api/routes/songs.py`):**
   - Implement `POST /api/v2/songs` (or `POST /api/v2/songs/ingest`) for metadata ingestion using `IngestionService.ingest_song_record`.
   - Expand `GET /api/v2/songs` filters to support `tag`, `sub_genre`, `artist_id`, `explicit`, and range filters for `energy`/`valence`.
   - Add `/meta/tags` and `/meta/taxonomy` endpoints returning taxonomy statistics.
   - Refactor `GET /{song_id}/source` response to use `SongSourceDTO`.

---

## 5. Verification Method

### 5.1 Automated PyTest Suite Verification
Run pytest tests from the project root:
```bash
python -m pytest backend/tests/test_database_and_ingestion.py
python -m pytest backend/tests
```

### 5.2 Specific Inspection Points
1. Inspect `backend/app/db/models.py` (lines 23–156) to ensure no breaking structural edits were made to `Artist`, `Album`, `Song`, `SongSource`.
2. Inspect `backend/app/schemas/song.py` (and new schema files) to confirm `GenreDTO`, `MoodDTO`, `TagDTO`, `SongSourceDTO`, `SongCreateDTO`, `TaxonomySummaryDTO` exist and inherit from `BaseModel` with `from_attributes=True`.
3. Call `GET /api/v2/songs?genre=Pop&mood=happy` and `POST /api/v2/songs` to confirm catalog filtering and metadata ingestion operate without errors.
