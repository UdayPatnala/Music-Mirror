# Handoff Report — Explorer M2_1

**Milestone**: Milestone 2 (Music Catalog Endpoints & Filtering)  
**Target File**: `backend/app/api/routes/songs.py`  
**Working Directory**: `d:\PROJECT\Music Mirror\.agents\teamwork_preview_explorer_m2_1`  

---

## 1. Observation

### Existing Endpoint & Schema Implementation
1. **`backend/app/api/routes/songs.py` (lines 62-102)**:
   The existing `get_songs` endpoint currently only accepts 4 parameters (`page`, `limit`, `genre`, `mood`, `language`, `search`) and lacks support for `tag`, `sub_genre`, `artist_id`, `explicit`, `energy_min`, `energy_max`, `valence_min`, `valence_max`.
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
   ```

2. **`backend/app/db/models.py` (lines 62-116)**:
   The `Song` model defines all required attributes for filtering:
   - Categorical string columns: `genre` (String 100), `sub_genre` (String 100), `language` (String 50), `mood` (String 50).
   - Tag column: `tags` (Text, comma-separated string e.g., `"chill, acoustic, evening"`).
   - Foreign key: `artist_id` (String 36).
   - Boolean flag: `explicit` (Boolean).
   - Numeric float attributes (0.0 - 1.0): `energy` (Float), `valence` (Float).
   - Database indexes exist for `idx_song_genre_mood` (`genre`, `mood`) and `idx_song_valence_energy` (`valence`, `energy`).

3. **`backend/app/schemas/song.py` (lines 134-139)**:
   The `PaginatedSongsResponse` schema is structured as:
   ```python
   class PaginatedSongsResponse(BaseModel):
       items: List[SongDTO]
       total: int
       page: int
       limit: int
       total_pages: int
   ```

4. **Cover Image URL Precedence in `build_song_dto` (`songs.py:43`)**:
   Observation of line 43 in `build_song_dto`:
   ```python
   cover_image_url=song.cover_image_url or f"https://img.youtube.com/vi/{song.youtube_id}/hqdefault.jpg" if song.youtube_id else None
   ```
   Due to Python ternary operator precedence (`or` vs `if-else`), if `song.cover_image_url` is set but `song.youtube_id` is `None`, this expression evaluates to `None`. The correct expression requires parentheses:
   ```python
   cover_image_url=song.cover_image_url or (f"https://img.youtube.com/vi/{song.youtube_id}/hqdefault.jpg" if song.youtube_id else None)
   ```

---

## 2. Logic Chain

1. **Parameter Expansion**:
   To fulfill Milestone 2 Acceptance Criteria & R2 requirements, `GET /api/v2/songs` must accept all 14 query parameters: `page`, `limit`, `genre`, `mood`, `language`, `tag`, `sub_genre`, `artist_id`, `explicit`, `search`, `energy_min`, `energy_max`, `valence_min`, `valence_max`.

2. **Filtering Specifications**:
   - **Case-Insensitive Category Match** (`genre`, `mood`, `language`, `sub_genre`):
     Use `func.lower(Song.<col>) == <param>.strip().lower()`. This ensures exact categorical match regardless of letter casing (e.g. `"pop"`, `"POP"`, `"Pop"` all match `"Pop"`).
   - **Substring Tag Match** (`tag`):
     `tags` in `Song` model is stored as a comma-separated string (e.g. `"happy, upbeat, pop"`). Filtering using `func.lower(Song.tags).contains(tag.strip().lower())` ensures substring matches work against `Song.tags`.
   - **Artist ID Match** (`artist_id`):
     Exact equality check `Song.artist_id == artist_id.strip()`.
   - **Explicit Content Match** (`explicit`):
     Exact boolean check `Song.explicit == explicit` when `explicit is not None`.
   - **Audio Feature Ranges** (`energy_min`, `energy_max`, `valence_min`, `valence_max`):
     Range queries using `>=` and `<=` on `Song.energy` and `Song.valence`.
   - **Search Query** (`search`):
     Search across `Song.normalized_title`, `Artist.normalized_name`, case-insensitive `Song.genre`, and case-insensitive `Song.tags`.

3. **Non-500 Handling for Empty Catalog or Zero Results**:
   When no records match the filter criteria (or the catalog table is empty):
   - `total = query.count()` returns `0`.
   - Explicitly construct and return:
     `PaginatedSongsResponse(items=[], total=0, page=page, limit=limit, total_pages=1)`
   - This guarantees HTTP 200 status code with valid JSON conforming to `PaginatedSongsResponse` schema without raising unhandled exceptions or 500 internal server errors.

---

## 3. Caveats

- **Null Tags Handling**: SQLite handles `contains` on NULL columns safely by evaluating the condition to false (no crash).
- **Outer Join vs Inner Join**: Using `db.query(Song).outerjoin(Artist)` is safer than `.join(Artist)` to handle edge cases where a test record may temporarily lack an associated `Artist` record.
- **Search Whitespace**: Trimming leading/trailing whitespace on query parameters prevents unnecessary empty matches.

---

## 4. Conclusion & Proposed Implementation

Below is the complete, proposed replacement implementation for `GET /api/v2/songs` in `backend/app/api/routes/songs.py`:

```python
@router.get("", response_model=PaginatedSongsResponse)
def get_songs(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    genre: Optional[str] = Query(None, description="Filter by primary genre (case-insensitive)"),
    mood: Optional[str] = Query(None, description="Filter by primary mood (case-insensitive)"),
    language: Optional[str] = Query(None, description="Filter by language (case-insensitive)"),
    tag: Optional[str] = Query(None, description="Filter by tag (substring match in comma-separated tags)"),
    sub_genre: Optional[str] = Query(None, description="Filter by sub-genre (case-insensitive)"),
    artist_id: Optional[str] = Query(None, description="Filter by artist ID"),
    explicit: Optional[bool] = Query(None, description="Filter by explicit content flag"),
    search: Optional[str] = Query(None, description="Search query across title, artist name, genre, and tags"),
    energy_min: Optional[float] = Query(None, ge=0.0, le=1.0, description="Minimum energy level (0.0 - 1.0)"),
    energy_max: Optional[float] = Query(None, ge=0.0, le=1.0, description="Maximum energy level (0.0 - 1.0)"),
    valence_min: Optional[float] = Query(None, ge=0.0, le=1.0, description="Minimum valence score (0.0 - 1.0)"),
    valence_max: Optional[float] = Query(None, ge=0.0, le=1.0, description="Maximum valence score (0.0 - 1.0)"),
    db: Session = Depends(get_db),
):
    """
    Query the music catalog with taxonomy filtering, audio feature ranges, search, and pagination.
    Returns HTTP 200 OK with empty items list if zero results match.
    """
    query = db.query(Song).outerjoin(Artist)

    if genre and genre.strip():
        query = query.filter(func.lower(Song.genre) == genre.strip().lower())
    if mood and mood.strip():
        query = query.filter(func.lower(Song.mood) == mood.strip().lower())
    if language and language.strip():
        query = query.filter(func.lower(Song.language) == language.strip().lower())
    if sub_genre and sub_genre.strip():
        query = query.filter(func.lower(Song.sub_genre) == sub_genre.strip().lower())
    if tag and tag.strip():
        query = query.filter(func.lower(Song.tags).contains(tag.strip().lower()))
    if artist_id and artist_id.strip():
        query = query.filter(Song.artist_id == artist_id.strip())
    if explicit is not None:
        query = query.filter(Song.explicit == explicit)
    if search and search.strip():
        norm_search = normalize_string(search.strip())
        s_lower = search.strip().lower()
        query = query.filter(
            or_(
                Song.normalized_title.contains(norm_search),
                Artist.normalized_name.contains(norm_search),
                func.lower(Song.genre).contains(s_lower),
                func.lower(Song.tags).contains(s_lower),
            )
        )
    if energy_min is not None:
        query = query.filter(Song.energy >= energy_min)
    if energy_max is not None:
        query = query.filter(Song.energy <= energy_max)
    if valence_min is not None:
        query = query.filter(Song.valence >= valence_min)
    if valence_max is not None:
        query = query.filter(Song.valence <= valence_max)

    total = query.count()
    if total == 0:
        return PaginatedSongsResponse(
            items=[],
            total=0,
            page=page,
            limit=limit,
            total_pages=1,
        )

    total_pages = math.ceil(total / limit)
    offset = (page - 1) * limit
    songs = query.order_by(Song.popularity.desc(), Song.created_at.desc()).offset(offset).limit(limit).all()
    items = [build_song_dto(s) for s in songs]

    return PaginatedSongsResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )
```

Also recommend updating `build_song_dto` line 43 in `songs.py`:
```python
cover_image_url=song.cover_image_url or (f"https://img.youtube.com/vi/{song.youtube_id}/hqdefault.jpg" if song.youtube_id else None),
```

---

## 5. Verification Method

1. **Run Pytest Suite**:
   Execute pytest on backend tests:
   ```bash
   pytest backend/tests/test_database_and_ingestion.py
   ```
2. **Verify Filter Capabilities**:
   - `GET /api/v2/songs?genre=POP` -> verify case-insensitive matching.
   - `GET /api/v2/songs?tag=upbeat` -> verify substring matching in comma-separated `tags`.
   - `GET /api/v2/songs?energy_min=0.6&energy_max=0.9` -> verify range filtering.
   - `GET /api/v2/songs?genre=nonexistent_genre` -> verify HTTP 200 with `items: []`, `total: 0`, `page: 1`, `limit: 20`, `total_pages: 1`.
