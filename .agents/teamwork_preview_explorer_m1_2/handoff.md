# Handoff Report — Explorer M1_2 (Catalog Schemas & Baseline Contracts)

## 1. Observation

Direct investigation of the codebase revealed the following exact structures and interfaces:

1. **Existing Schemas File (`backend/app/schemas/song.py:1-76`)**:
   - `ArtistDTO` (lines 5-14): Maps `id`, `name`, `normalized_name`, `image_url`, `bio`, `genres`, `country`.
   - `AlbumDTO` (lines 17-27): Maps `id`, `title`, `normalized_title`, `artist_id`, `cover_image_url`, `release_date`, `total_tracks`.
   - `SongDTO` (lines 29-68): Contains basic fields (`id`, `title`, `artist_id`, `artist_name`, `album_id`, `album_title`, `duration`, `duration_str`, `release_date`, `genre`, `sub_genre`, `language`, `explicit`, `track_number`, `cover_image_url`, `audio_url`, `preview_url`, `popularity`), AI feature attributes (`energy`, `danceability`, `valence`, `acousticness`, `instrumentalness`, `tempo`), `mood`, `tags` (string), `description`, `youtube_id`, and relationships (`artist`, `album`).
   - Missing schemas in `song.py`: `SongCreateDTO`, `SongUpdateDTO`, and derived `tag_list: List[str]` in `SongDTO`.

2. **Database Models (`backend/app/db/models.py:23-116`)**:
   - `Artist` model (lines 23-38): `id`, `name`, `normalized_name` (unique index), `image_url`, `bio`, `genres`, `country`.
   - `Album` model (lines 40-60): `id`, `title`, `normalized_title`, `artist_id` (FK), `cover_image_url`, `release_date`, `total_tracks`.
   - `Song` model (lines 62-116): `id`, `title`, `normalized_title`, `artist_id` (FK), `album_id` (FK), `album_title`, `duration` (default 180), `release_date`, `genre` (default "Pop"), `sub_genre`, `language` (default "English"), `explicit` (default False), `track_number`, `disc_number`, `cover_image_url`, `audio_url`, `preview_url`, `popularity` (default 80), normalized float audio features (`energy`, `danceability`, `valence`, `acousticness`, `instrumentalness`, `tempo`), `mood` (default "neutral"), `tags` (comma-separated string), `description`, `youtube_id`, `is_estimated_ai_metrics`.

3. **Existing Ingestion & Route Helpers (`backend/app/ingestion/ingestion_service.py:49-129`, `backend/app/api/routes/songs.py:23-59`)**:
   - `IngestionService.ingest_song_record` expects a dictionary with metadata (`title`, `artist`, `album`, `duration`, `genre`, `language`, `cover_image_url`, `audio_url`, `preview_url`, `popularity`, `energy`, `valence`, `tempo`, `mood`, `youtube_id`).
   - `build_song_dto` in `songs.py` maps ORM model to `SongDTO`, formatting `duration_str` and reading `artist.name`.

---

## 2. Logic Chain

1. **`SongCreateDTO` Design**:
   - For metadata ingestion and endpoint creation (`POST /api/v2/songs`), incoming payloads must validate required canonical song attributes:
     - `title`: `str` (required)
     - `artist_name`: `str` (required)
     - `album_title`: `Optional[str] = None`
     - `duration`: `int = 180` (seconds, >= 1)
     - `genre`: `str = "Pop"`
     - `sub_genre`: `Optional[str] = None`
     - `language`: `str = "English"`
     - `mood`: `str = "neutral"`
     - `tags`: `Optional[str] = None` (comma-separated string)
     - `cover_image_url`: `Optional[str] = None`
     - `audio_url`: `Optional[str] = None`
     - `preview_url`: `Optional[str] = None`
     - `explicit`: `bool = False`
     - Optional audio/AI features & metadata: `release_date`, `popularity`, `energy`, `danceability`, `valence`, `acousticness`, `instrumentalness`, `tempo`, `description`, `youtube_id`.
   - `SongCreateDTO` maps 1:1 to `IngestionService.ingest_song_record` inputs.

2. **`SongUpdateDTO` Design**:
   - For partial metadata updates (`PATCH /api/v2/songs/{song_id}`), all fields must be optional (`Optional[...] = None`).
   - This permits `song_data.model_dump(exclude_unset=True)` for partial field updates without overwriting existing non-specified fields.

3. **`SongDTO` Enhancements (`tag_list`)**:
   - `Song.tags` stored in DB is a comma-separated string (e.g. `"telugu, romance, hit"`).
   - Frontend and API clients require a structured list of strings (`["telugu", "romance", "hit"]`).
   - Adding `tag_list: List[str] = Field(default_factory=list)` with a Pydantic v2 `model_post_init` hook computes `tag_list` automatically whenever `tags` string is present and `tag_list` is unpopulated.
   - This ensures zero breaking changes to existing `SongDTO` callers while exposing `tag_list`.

4. **Database & ORM Alignment**:
   - `SongCreateDTO.artist_name` resolves to `Artist` ORM entity via `IngestionService.get_or_create_artist(db, artist_name, genre)`.
   - `SongCreateDTO.album_title` resolves to `Album` ORM entity via `IngestionService.get_or_create_album(db, artist_id, album_title)`.
   - All primitive columns on `Song` match Pydantic field types and constraints.

---

## 3. Caveats

- **Read-Only Scope**: Per Explorer role guidelines, no application source code inside `backend/app/schemas/song.py` was directly modified during this task. The full proposed schema code is provided as a drop-in reference file at `d:\PROJECT\Music Mirror\.agents\teamwork_preview_explorer_m1_2\proposed_song_schemas.py`.
- **Database Column vs Derived Schema Attribute**: `tag_list` is a computed Pydantic schema field and is not stored as a separate column in SQLite DB (`Song.tags` remains `Column(Text)`).
- **Artist Name Resolution**: When constructing `SongDTO` directly from a `Song` ORM object, `artist_name` relies on `song.artist.name` being populated (or provided via `build_song_dto`).

---

## 4. Conclusion

The exact DTO additions and enhancements for `backend/app/schemas/song.py` have been designed and validated:
- `SongCreateDTO` for ingestion validation.
- `SongUpdateDTO` for optional field updates.
- Enhanced `SongDTO` with auto-derived `tag_list` from comma-separated `tags`.
- Full compatibility with `Song`, `Artist`, and `Album` database models and `IngestionService`.

Proposed complete code file located at: `d:\PROJECT\Music Mirror\.agents\teamwork_preview_explorer_m1_2\proposed_song_schemas.py`

---

## 5. Verification Method

1. **Pytest Verification**:
   ```powershell
   $env:PYTHONPATH="backend"; python -m pytest backend/tests/test_database_and_ingestion.py
   ```
2. **Schema & Post-Init Validation Test**:
   ```powershell
   python -c "
   from app.schemas.song import SongDTO, SongCreateDTO, SongUpdateDTO
   dto = SongDTO(id='1', title='Test', normalized_title='test', artist_id='a1', artist_name='Artist', tags='pop, rock')
   assert dto.tag_list == ['pop', 'rock']
   create = SongCreateDTO(title='Song', artist_name='Artist', duration=200, genre='Pop')
   assert create.duration == 200
   print('All schema verifications passed!')
   "
   ```
