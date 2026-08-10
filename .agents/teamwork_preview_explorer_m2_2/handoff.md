# Handoff Report — Explorer M2_2: Music Catalog Endpoints & Filtering Design

## 1. Observation

Direct code analysis of `backend/app/api/routes/songs.py`, `backend/app/ingestion/ingestion_service.py`, `backend/app/schemas/taxonomy.py`, `backend/app/schemas/song.py`, `backend/app/schemas/__init__.py`, `backend/app/db/models.py`, and `backend/app/main.py` revealed the following findings:

1. **Router Mounting (`backend/app/main.py:38`)**:
   `app.include_router(songs.router, prefix="/api/v2/songs", tags=["Songs Catalog & Metadata"])`
   All endpoints in `songs.py` are mounted under the URL prefix `/api/v2/songs`.

2. **Ingestion Service & Payload Schema Compatibility (`backend/app/ingestion/ingestion_service.py:49-128`)**:
   - `IngestionService.ingest_song_record(db, song_data, source_type="curated_seed")` currently expects `song_data.get("artist")` and `song_data.get("album")`.
   - `SongCreateDTO` (`backend/app/schemas/song.py:76-104`) defines input fields `artist_name` and `album_title`.
   - `SongCreateDTO` also contains additional optional metadata & AI audio feature fields (`sub_genre`, `explicit`, `tags`, `description`, `danceability`, `acousticness`, `instrumentalness`).
   - If `payload.model_dump()` is passed directly to `ingest_song_record` without bridging `artist_name` → `artist` and `album_title` → `album`, `ingest_song_record` defaults `artist_name` to `"Unknown Artist"` and `album_name` to `"{title} - Single"`.

3. **Current Song Source Endpoint Flaw (`backend/app/api/routes/songs.py:149-208`)**:
   - Lines 198-200 in `songs.py` attempt to access `best.provider`. However, in `SongSource` ORM model (`backend/app/db/models.py:124`), the attribute is named `source_type`. Accessing `best.provider` causes an `AttributeError` at runtime.
   - The current implementation returns a custom dictionary structure instead of the contract schema `SongSourceDTO` defined in `backend/app/schemas/taxonomy.py:48`.
   - The current endpoint returns HTTP 200 with `status: "unavailable"` dictionary when no qualified source is found, whereas the requirement dictates returning an `HTTPException(status_code=404)` with `SongSourceDTO` response model.

4. **Taxonomy Endpoints State (`backend/app/api/routes/songs.py:137-147`)**:
   - `/meta/genres` and `/meta/moods` currently exist but return simple `List[str]`.
   - `/meta/tags` endpoint is completely missing from `songs.py`.
   - `/meta/taxonomy` endpoint returning `TaxonomySummaryDTO` (`genres`, `moods`, `tags`, `total_genres`, `total_moods`, `total_tags`) is completely missing from `songs.py`.

5. **Test Suite Baseline**:
   Running `$env:PYTHONPATH="backend"; python -m pytest backend/tests` executes 94 tests, all passing (100% pass rate).

---

## 2. Logic Chain

1. **Ingestion Endpoint Design (`POST /api/v2/songs`)**:
   - Route path `@router.post("", response_model=SongDTO, status_code=status.HTTP_201_CREATED)` will handle `POST /api/v2/songs`.
   - Input payload is validated by FastAPI via `payload: SongCreateDTO`.
   - Updating `IngestionService.ingest_song_record` to check `artist_name = (song_data.get("artist") or song_data.get("artist_name") or "Unknown Artist").strip()` and `album_name = song_data.get("album") or song_data.get("album_title") or f"{title} - Single"` ensures seamless ingestion when passed `payload.model_dump()`.
   - Updating `ingest_song_record` to assign `sub_genre`, `explicit`, `tags`, `description`, `danceability`, `acousticness`, `instrumentalness` during `Song` instantiation guarantees complete data preservation.
   - Any `ValueError` from ingestion is caught and re-raised as `HTTPException(status_code=400, detail=str(e))`. The created/retrieved `Song` model is converted to `SongDTO` via `build_song_dto(song)`.

2. **Taxonomy Summary Endpoint Design (`GET /api/v2/songs/meta/taxonomy`)**:
   - Route path `@router.get("/meta/taxonomy", response_model=TaxonomySummaryDTO)` will handle `GET /api/v2/songs/meta/taxonomy`.
   - To build `GenreDTO` list:
     Query `db.query(Song.genre, func.count(Song.id)).filter(Song.genre.isnot(None), Song.genre != "").group_by(Song.genre).all()`. Map each `(genre_name, count)` to `GenreDTO(name=genre_name, normalized_name=normalize_string(genre_name), song_count=count)`.
   - To build `MoodDTO` list:
     Query `db.query(Song.mood, func.count(Song.id)).filter(Song.mood.isnot(None), Song.mood != "").group_by(Song.mood).all()`. Map each `(mood_name, count)` to `MoodDTO(name=mood_name, normalized_name=normalize_string(mood_name), song_count=count)`.
   - To build `TagDTO` list:
     Query `db.query(Song.tags).filter(Song.tags.isnot(None), Song.tags != "").all()`. Parse comma-separated strings into individual tags, aggregate frequencies in a dictionary, and map to `TagDTO(name=tag_name, usage_count=count)`.
   - Construct and return `TaxonomySummaryDTO(genres=genres_list, moods=moods_list, tags=tags_list, total_genres=len(genres_list), total_moods=len(moods_list), total_tags=len(tags_list))`.

3. **Taxonomy List Endpoints Design (`GET /meta/genres`, `GET /meta/moods`, `GET /meta/tags`)**:
   - `@router.get("/meta/genres", response_model=List[str])`: Returns sorted list of distinct non-empty `Song.genre` strings.
   - `@router.get("/meta/moods", response_model=List[str])`: Returns sorted list of distinct non-empty `Song.mood` strings.
   - `@router.get("/meta/tags", response_model=List[str])`: Extracts tags from `Song.tags` comma-separated strings across all catalog entries, deduplicates via set, and returns sorted list of strings.

4. **Song Source Endpoint Design (`GET /{song_id}/source`)**:
   - Route path `@router.get("/{song_id}/source", response_model=SongSourceDTO)` replacing current broken implementation.
   - Step 1: Query `song = db.query(Song).filter(Song.id == song_id).first()`. If `None`, raise `HTTPException(status_code=404, detail=f"Song with id '{song_id}' not found")`.
   - Step 2: Query best active `SongSource`:
     ```python
     source = (
         db.query(SongSource)
         .filter(
             SongSource.song_id == song_id,
             func.upper(SongSource.status) == "ACTIVE",
         )
         .order_by(SongSource.priority.asc(), SongSource.reliability_score.desc(), SongSource.health_score.desc())
         .first()
     )
     ```
   - Step 3: Fallback query if no "ACTIVE" source found: check any source associated with `song_id`.
   - Step 4: If still `None`, raise `HTTPException(status_code=404, detail=f"No playable source found for song '{song_id}'")`.
   - Step 5: Return `SongSourceDTO.model_validate(source)` (or raw ORM instance which FastAPI validates against `SongSourceDTO`).

---

## 3. Caveats

- **No Caveats**: The database models (`Song`, `Artist`, `Album`, `SongSource`) and contract schemas (`SongDTO`, `SongCreateDTO`, `TaxonomySummaryDTO`, `SongSourceDTO`, `GenreDTO`, `MoodDTO`, `TagDTO`) are fully defined, exported in `app.schemas`, and verified by existing tests.

---

## 4. Conclusion & Exact Proposed Implementation Code

The required implementation consists of updating `backend/app/ingestion/ingestion_service.py` and `backend/app/api/routes/songs.py`.

### Proposed Code for `backend/app/ingestion/ingestion_service.py` (lines 48-128)

```python
    @classmethod
    def ingest_song_record(cls, db: Session, song_data: Dict[str, Any], source_type: str = "curated_seed") -> Tuple[Song, bool]:
        """
        Upserts a canonical Song entity, Artist, Album, and SongSource with full deduplication.
        Returns tuple of (Song, created_boolean).
        """
        title = song_data.get("title", "").strip()
        artist_name = (song_data.get("artist") or song_data.get("artist_name") or "Unknown Artist").strip()
        album_name = song_data.get("album") or song_data.get("album_title") or f"{title} - Single"
        youtube_id = song_data.get("youtube_id") or song_data.get("source_id")

        if not title:
            raise ValueError("Song title is required")

        artist = cls.get_or_create_artist(db, artist_name, genre=song_data.get("genre", "Pop"))
        album = cls.get_or_create_album(
            db,
            artist.id,
            album_name,
            cover_url=song_data.get("cover_image_url"),
            release_date=str(song_data.get("release_date", "2024")),
        )

        norm_title = normalize_string(title)

        # Check for existing song by artist + normalized title (Deduplication Level 2)
        existing_song = (
            db.query(Song)
            .filter(Song.artist_id == artist.id, Song.normalized_title == norm_title)
            .first()
        )

        created = False
        if not existing_song:
            existing_song = Song(
                title=title,
                normalized_title=norm_title,
                artist_id=artist.id,
                album_id=album.id,
                album_title=album.title,
                duration=song_data.get("duration", 180),
                release_date=str(song_data.get("release_date", "2024")),
                genre=song_data.get("genre", "Pop"),
                sub_genre=song_data.get("sub_genre"),
                language=song_data.get("language", "English"),
                explicit=song_data.get("explicit", False),
                cover_image_url=song_data.get("cover_image_url") or (f"https://img.youtube.com/vi/{youtube_id}/hqdefault.jpg" if youtube_id else None),
                audio_url=song_data.get("audio_url") or song_data.get("preview_url"),
                preview_url=song_data.get("preview_url") or song_data.get("audio_url"),
                popularity=song_data.get("popularity", 85),
                energy=float(song_data.get("energy", 0.7)),
                danceability=float(song_data.get("danceability", 0.5)),
                valence=float(song_data.get("valence", 0.7)),
                acousticness=float(song_data.get("acousticness", 0.5)),
                instrumentalness=float(song_data.get("instrumentalness", 0.0)),
                tempo=float(song_data.get("tempo", 120.0)),
                mood=str(song_data.get("mood", "neutral")).lower(),
                tags=song_data.get("tags"),
                description=song_data.get("description"),
                youtube_id=youtube_id,
                is_estimated_ai_metrics=song_data.get("is_estimated_ai_metrics", True),
            )
            db.add(existing_song)
            db.flush()
            created = True
        else:
            # Update missing attributes if higher quality data provided
            if youtube_id and not existing_song.youtube_id:
                existing_song.youtube_id = youtube_id
            if song_data.get("tags") and not existing_song.tags:
                existing_song.tags = song_data.get("tags")

        # Upsert SongSource (Deduplication Level 1)
        if youtube_id:
            existing_source = DeduplicationEngine.find_existing_source(db, source_type, youtube_id)
            if not existing_source:
                source = SongSource(
                    song_id=existing_song.id,
                    source_type=source_type,
                    source_id=youtube_id,
                    source_url=f"https://www.youtube.com/watch?v={youtube_id}",
                    title_at_source=title,
                    channel_name=artist_name,
                    thumbnail_url=f"https://img.youtube.com/vi/{youtube_id}/hqdefault.jpg",
                )
                db.add(source)

        db.commit()
        db.refresh(existing_song)
        return existing_song, created
```

### Proposed Code for `backend/app/api/routes/songs.py`

```python
import math
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.db.database import get_db
from app.db.models import Song, Artist, Album, SongSource
from app.schemas.song import SongDTO, SongCreateDTO, PaginatedSongsResponse, ArtistDTO, AlbumDTO
from app.schemas.taxonomy import GenreDTO, MoodDTO, TagDTO, TaxonomySummaryDTO, SongSourceDTO
from app.ingestion.normalizer import normalize_string
from app.ingestion.ingestion_service import IngestionService

router = APIRouter()


def format_duration(seconds: int) -> str:
    """Formats duration in seconds to M:SS for audio player synchronization."""
    sec = max(0, seconds or 180)
    mins = sec // 60
    secs = sec % 60
    return f"{mins}:{secs:02d}"


def build_song_dto(song: Song) -> SongDTO:
    artist_dto = ArtistDTO.model_validate(song.artist) if song.artist else None
    album_dto = AlbumDTO.model_validate(song.album) if song.album else None

    return SongDTO(
        id=song.id,
        title=song.title,
        normalized_title=song.normalized_title,
        artist_id=song.artist_id,
        artist_name=song.artist.name if song.artist else "Unknown Artist",
        album_id=song.album_id,
        album_title=song.album_title,
        duration=song.duration,
        duration_str=format_duration(song.duration),
        release_date=song.release_date,
        genre=song.genre,
        sub_genre=song.sub_genre,
        language=song.language,
        explicit=song.explicit,
        track_number=song.track_number,
        cover_image_url=song.cover_image_url or (f"https://img.youtube.com/vi/{song.youtube_id}/hqdefault.jpg" if song.youtube_id else None),
        audio_url=song.audio_url or song.preview_url,
        preview_url=song.preview_url or song.audio_url,
        popularity=song.popularity,
        energy=song.energy,
        danceability=song.danceability,
        valence=song.valence,
        acousticness=song.acousticness,
        instrumentalness=song.instrumentalness,
        tempo=song.tempo,
        mood=song.mood,
        tags=song.tags,
        description=song.description,
        youtube_id=song.youtube_id,
        artist=artist_dto,
        album=album_dto,
    )


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
    query = db.query(Song).join(Artist)

    if genre:
        query = query.filter(func.lower(Song.genre).contains(genre.lower()))
    if mood:
        query = query.filter(func.lower(Song.mood) == mood.lower())
    if language:
        query = query.filter(func.lower(Song.language) == language.lower())
    if search:
        norm_search = normalize_string(search)
        query = query.filter(
            or_(
                Song.normalized_title.contains(norm_search),
                Artist.normalized_name.contains(norm_search),
                Song.genre.contains(search),
            )
        )

    total = query.count()
    total_pages = math.ceil(total / limit) if total > 0 else 1

    songs = query.order_by(Song.popularity.desc()).offset((page - 1) * limit).limit(limit).all()
    items = [build_song_dto(s) for s in songs]

    return PaginatedSongsResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.post("", response_model=SongDTO, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SongDTO, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_song(payload: SongCreateDTO, db: Session = Depends(get_db)):
    """
    Metadata ingestion endpoint. Accepts SongCreateDTO payload, ingests via IngestionService,
    and returns HTTP 201 Created with SongDTO.
    """
    try:
        song_dict = payload.model_dump()
        song, _ = IngestionService.ingest_song_record(db, song_dict, source_type="api")
        return build_song_dto(song)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/search", response_model=List[SongDTO])
def search_songs(
    q: str = Query(..., min_length=1),
    limit: int = Query(15, ge=1, le=50),
    db: Session = Depends(get_db),
):
    norm_q = normalize_string(q)
    songs = (
        db.query(Song)
        .join(Artist)
        .filter(
            or_(
                Song.normalized_title.contains(norm_q),
                Artist.normalized_name.contains(norm_q),
                Song.genre.contains(q),
            )
        )
        .order_by(Song.popularity.desc())
        .limit(limit)
        .all()
    )
    return [build_song_dto(s) for s in songs]


@router.get("/meta/taxonomy", response_model=TaxonomySummaryDTO)
def get_taxonomy_summary(db: Session = Depends(get_db)):
    """
    Taxonomy summary endpoint. Returns TaxonomySummaryDTO populating genres, moods, tags, and counts.
    """
    genre_rows = (
        db.query(Song.genre, func.count(Song.id))
        .filter(Song.genre.isnot(None), Song.genre != "")
        .group_by(Song.genre)
        .all()
    )
    genres_list = [
        GenreDTO(
            name=genre,
            normalized_name=normalize_string(genre),
            song_count=count,
        )
        for genre, count in genre_rows
    ]

    mood_rows = (
        db.query(Song.mood, func.count(Song.id))
        .filter(Song.mood.isnot(None), Song.mood != "")
        .group_by(Song.mood)
        .all()
    )
    moods_list = [
        MoodDTO(
            name=mood,
            normalized_name=normalize_string(mood),
            song_count=count,
        )
        for mood, count in mood_rows
    ]

    tag_rows = db.query(Song.tags).filter(Song.tags.isnot(None), Song.tags != "").all()
    tag_counts = {}
    for (t_str,) in tag_rows:
        if t_str:
            for tag in t_str.split(","):
                t_clean = tag.strip()
                if t_clean:
                    tag_counts[t_clean] = tag_counts.get(t_clean, 0) + 1
    tags_list = [
        TagDTO(name=t_name, usage_count=cnt)
        for t_name, cnt in sorted(tag_counts.items(), key=lambda x: x[0].lower())
    ]

    return TaxonomySummaryDTO(
        genres=genres_list,
        moods=moods_list,
        tags=tags_list,
        total_genres=len(genres_list),
        total_moods=len(moods_list),
        total_tags=len(tags_list),
    )


@router.get("/meta/genres", response_model=List[str])
def get_genres(db: Session = Depends(get_db)):
    genres = db.query(Song.genre).filter(Song.genre.isnot(None), Song.genre != "").distinct().all()
    return sorted([g[0] for g in genres if g[0]])


@router.get("/meta/moods", response_model=List[str])
def get_moods(db: Session = Depends(get_db)):
    moods = db.query(Song.mood).filter(Song.mood.isnot(None), Song.mood != "").distinct().all()
    return sorted([m[0] for m in moods if m[0]])


@router.get("/meta/tags", response_model=List[str])
def get_tags(db: Session = Depends(get_db)):
    tag_rows = db.query(Song.tags).filter(Song.tags.isnot(None), Song.tags != "").all()
    unique_tags = set()
    for (t_str,) in tag_rows:
        if t_str:
            for tag in t_str.split(","):
                t_clean = tag.strip()
                if t_clean:
                    unique_tags.add(t_clean)
    return sorted(list(unique_tags))


@router.get("/{song_id}", response_model=SongDTO)
def get_song_by_id(song_id: str, db: Session = Depends(get_db)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    return build_song_dto(song)


@router.get("/{song_id}/source", response_model=SongSourceDTO, summary="Resolve playable source for a song")
def get_song_source(song_id: str, db: Session = Depends(get_db)):
    """
    Returns the best available SongSourceDTO for a given song.
    Raises 404 HTTPException if song or source is not found.
    """
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail=f"Song with id '{song_id}' not found")

    source = (
        db.query(SongSource)
        .filter(
            SongSource.song_id == song_id,
            func.upper(SongSource.status) == "ACTIVE",
        )
        .order_by(SongSource.priority.asc(), SongSource.reliability_score.desc(), SongSource.health_score.desc())
        .first()
    )

    if not source:
        source = (
            db.query(SongSource)
            .filter(SongSource.song_id == song_id)
            .order_by(SongSource.reliability_score.desc())
            .first()
        )

    if not source:
        raise HTTPException(status_code=404, detail=f"No playable source found for song '{song_id}'")

    return SongSourceDTO.model_validate(source)
```

---

## 5. Verification Method

To verify this implementation design:

1. **Automated Pytest Command**:
   Execute the test suite with `PYTHONPATH`:
   ```powershell
   $env:PYTHONPATH="backend"; python -m pytest backend/tests
   ```
2. **Files to Inspect**:
   - `backend/app/api/routes/songs.py`
   - `backend/app/ingestion/ingestion_service.py`
   - `backend/app/schemas/taxonomy.py`
   - `backend/app/schemas/song.py`
3. **Invalidation Conditions**:
   - `POST /api/v2/songs` fails to ingest or returns status other than 201 Created.
   - `GET /api/v2/songs/meta/taxonomy` returns mismatched DTO schema or incorrect total counts.
   - `GET /api/v2/songs/{song_id}/source` raises `AttributeError` or fails to return `SongSourceDTO` or 404 on missing records.
