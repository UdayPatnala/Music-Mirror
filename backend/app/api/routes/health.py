import os
import time
from pathlib import Path
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.database import get_db, DB_PATH
from app.db.models import Song, Artist, Album, SongSource, UserMusicPreference

router = APIRouter()


@router.get("")
@router.get("/health")
def get_simple_health():
    return {"status": "ok", "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}


@router.get("/database")
def get_database_health(db: Session = Depends(get_db)):
    from app.db.database import Base
    Base.metadata.create_all(bind=db.get_bind())
    start_time = time.perf_counter()

    # Query latency check
    db.execute(text("SELECT 1")).fetchone()
    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

    # Database file size check
    db_file = Path(DB_PATH)
    file_size_bytes = db_file.stat().st_size if db_file.exists() else 0
    file_size_mb = round(file_size_bytes / (1024 * 1024), 2)

    # Record counts across tables
    song_count = db.query(Song).count()
    artist_count = db.query(Artist).count()
    album_count = db.query(Album).count()
    source_count = db.query(SongSource).count()
    preference_count = db.query(UserMusicPreference).count()

    return {
        "status": "healthy",
        "database": {
            "type": "SQLite WAL",
            "file_size_bytes": file_size_bytes,
            "file_size_mb": file_size_mb,
            "query_latency_ms": latency_ms,
            "capacity_threshold_mb": 500.0,
            "capacity_usage_pct": round((file_size_mb / 500.0) * 100, 2),
        },
        "table_counts": {
            "songs": song_count,
            "artists": artist_count,
            "albums": album_count,
            "song_sources": source_count,
            "user_music_preferences": preference_count,
        },
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
