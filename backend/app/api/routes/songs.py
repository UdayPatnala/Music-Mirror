import asyncio
import math
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel

from app.db.database import get_db
from app.db.models import Song, Artist, Album, SongSource
from app.schemas.song import SongDTO, SongCreateDTO, PaginatedSongsResponse, ArtistDTO, AlbumDTO
from app.schemas.songs import (
    ScoreBreakdownDTO,
    YouTubeCandidateDTO,
    YouTubeSearchResponseDTO,
    YouTubeSearchResultDTO,
)
from app.schemas.taxonomy import GenreDTO, MoodDTO, TagDTO, TaxonomySummaryDTO, SongSourceDTO
from app.ingestion.normalizer import normalize_string
from app.ingestion.ingestion_service import IngestionService
from app.ingestion.youtube_provider import YouTubeMetadataProvider
from app.services.ranking_service import RankingService
from app.services.cache_service import discovery_cache

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


@router.get(
    "/youtube-search",
    response_model=YouTubeSearchResponseDTO,
    summary="Multi-Candidate YouTube Discovery & Relevance Scoring",
)
async def search_youtube_videos(
    query: Optional[str] = Query(None, description="Search query string"),
    q: Optional[str] = Query(None, description="Search query alias"),
    limit: int = Query(10, ge=1, le=25, description="Number of candidates to retrieve (1-25)"),
    expected_duration_ms: Optional[int] = Query(None, description="Expected duration in milliseconds for duration scoring"),
    target_artist: Optional[str] = Query(None, description="Target artist name for authority scoring"),
):
    """
    Retrieves a multi-candidate pool (K=10..25) from YouTube, scores and ranks them using multi-criteria
    weighted scoring (similarity, channel authority, duration, popularity, recency, and penalties),
    and caches responses using L1 Query Cache with SingleFlight concurrency deduplication.
    """
    raw_query = (query if query is not None else q) or ""
    raw_query = raw_query.strip()
    if not raw_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query parameter 'query' or 'q' is required and must not be empty",
        )

    norm_query = normalize_string(raw_query)
    expected_duration_sec = (expected_duration_ms // 1000) if expected_duration_ms else None
    target_art_norm = normalize_string(target_artist or "")

    # L1 Query Cache Check
    cache_key = f"{norm_query}:{limit}:{expected_duration_sec}:{target_art_norm}"
    cached_response = await discovery_cache.get_query_cache(cache_key)
    if cached_response is not None:
        return YouTubeSearchResponseDTO(
            query=cached_response.query,
            normalized_query=cached_response.normalized_query,
            cached=True,
            candidates=cached_response.candidates,
            total_candidates=cached_response.total_candidates,
        )

    # In-Flight SingleFlight deduplication
    async def fetch_and_score() -> YouTubeSearchResponseDTO:
        # Check cache once more inside lock
        cached_inner = await discovery_cache.get_query_cache(cache_key)
        if cached_inner is not None:
            return cached_inner

        provider = YouTubeMetadataProvider()
        raw_candidates = await asyncio.to_thread(provider.search_metadata, raw_query, limit)

        # Store candidate metadata in L2 cache
        for c in raw_candidates:
            v_id = c.get("video_id") or c.get("source_id")
            if v_id:
                await discovery_cache.set_video_metadata(v_id, c)

        ranked = RankingService.rank_candidates(
            query=raw_query,
            candidates=raw_candidates,
            expected_duration_seconds=expected_duration_sec,
            target_artist=target_artist,
        )

        response_dto = YouTubeSearchResponseDTO(
            query=raw_query,
            normalized_query=norm_query,
            cached=False,
            candidates=ranked,
            total_candidates=len(ranked),
        )

        await discovery_cache.set_query_cache(cache_key, response_dto)
        return response_dto

    result = await discovery_cache.single_flight.execute(cache_key, fetch_and_score)
    return result



@router.get("/auto-discover", response_model=List[SongDTO], summary="Autonomous Dynamic Song Discovery & Auto-Ingestion")
def auto_discover_songs(
    q: str = Query(..., min_length=2, description="Search query or title/artist/mood keyword"),
    mood: Optional[str] = Query(None, description="Optional target emotion"),
    language: Optional[str] = Query(None, description="Optional target language"),
    limit: int = Query(10, ge=1, le=25),
    db: Session = Depends(get_db)
):
    """
    Dynamically searches global music APIs in real time, auto-extracts acoustic features,
    auto-saves newly discovered songs into SQLite database, and returns the newly ingested tracks!
    """
    from app.services.auto_discovery_service import AutoDiscoveryService
    discovered = AutoDiscoveryService.search_and_ingest(query=q, mood=mood, language=language, db=db, limit=limit)
    
    song_ids = [d["id"] for d in discovered if "id" in d]
    if not song_ids:
        return []
    
    songs = db.query(Song).filter(Song.id.in_(song_ids)).all()
    return [build_song_dto(s) for s in songs]


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
