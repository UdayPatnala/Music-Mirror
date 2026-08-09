from typing import Any, Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.models import Song, Artist, SongSource, UserPlaybackReport


class CatalogReconciler:
    """
    Autonomous Catalog Reconciliation & Database Drift Engine.
    Scans canonical data structures to identify orphan records, duplicates, and missing sources.
    """

    @staticmethod
    def run_reconciliation(db: Session) -> Dict[str, Any]:
        report = {
            "duplicate_songs_found": 0,
            "orphaned_sources_removed": 0,
            "songs_without_healthy_sources": 0,
            "quarantined_sources_count": 0,
            "status": "HEALTHY",
        }

        # 1. Detect duplicate songs (same normalized_title and artist_id)
        duplicates = (
            db.query(Song.normalized_title, Song.artist_id, func.count(Song.id).label("cnt"))
            .group_by(Song.normalized_title, Song.artist_id)
            .having(func.count(Song.id) > 1)
            .all()
        )
        report["duplicate_songs_found"] = len(duplicates)

        # 2. Detect orphaned SongSources (referencing missing songs)
        valid_song_ids = [s.id for s in db.query(Song.id).all()]
        orphans = db.query(SongSource).filter(SongSource.song_id.notin_(valid_song_ids)).all() if valid_song_ids else []
        for orphan in orphans:
            db.delete(orphan)
        report["orphaned_sources_removed"] = len(orphans)

        # 3. Detect songs without healthy sources
        songs = db.query(Song).all()
        for song in songs:
            active_sources = [s for s in song.sources if s.status in ["ACTIVE", "VERIFYING"]]
            if not active_sources:
                report["songs_without_healthy_sources"] += 1

        # 4. Count quarantined sources
        quarantined = db.query(SongSource).filter(SongSource.status == "QUARANTINED").count()
        report["quarantined_sources_count"] = quarantined

        if len(orphans) > 0:
            db.commit()

        return report
