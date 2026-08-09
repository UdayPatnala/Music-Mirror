import math
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.db.database import get_db
from app.db.models import Song, Artist, Album
from app.schemas.song import SongDTO, PaginatedSongsResponse, ArtistDTO, AlbumDTO
from app.ingestion.normalizer import normalize_string

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
        cover_image_url=song.cover_image_url or f"https://img.youtube.com/vi/{song.youtube_id}/hqdefault.jpg" if song.youtube_id else None,
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


@router.get("/{song_id}", response_model=SongDTO)
def get_song_by_id(song_id: str, db: Session = Depends(get_db)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    return build_song_dto(song)


@router.get("/meta/genres", response_model=List[str])
def get_genres(db: Session = Depends(get_db)):
    genres = db.query(Song.genre).distinct().all()
    return sorted([g[0] for g in genres if g[0]])


@router.get("/meta/moods", response_model=List[str])
def get_moods(db: Session = Depends(get_db)):
    moods = db.query(Song.mood).distinct().all()
    return sorted([m[0] for m in moods if m[0]])
