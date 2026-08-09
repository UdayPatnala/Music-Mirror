from typing import Optional
from sqlalchemy.orm import Session
from app.db.models import Song, SongSource, Artist
from app.ingestion.normalizer import normalize_string


class DeduplicationEngine:
    @staticmethod
    def find_existing_source(db: Session, source_type: str, source_id: str) -> Optional[SongSource]:
        """Level 1: Exact source_type and source_id match."""
        return (
            db.query(SongSource)
            .filter(SongSource.source_type == source_type, SongSource.source_id == source_id)
            .first()
        )

    @staticmethod
    def find_existing_song_by_artist_and_title(
        db: Session, artist_name: str, song_title: str
    ) -> Optional[Song]:
        """Level 2: Match normalized artist and normalized title."""
        norm_artist = normalize_string(artist_name)
        norm_title = normalize_string(song_title)

        artist = db.query(Artist).filter(Artist.normalized_name == norm_artist).first()
        if not artist:
            return None

        return (
            db.query(Song)
            .filter(Song.artist_id == artist.id, Song.normalized_title == norm_title)
            .first()
        )

    @staticmethod
    def is_duplicate_duration(existing_song: Song, target_duration: int, tolerance_sec: int = 5) -> bool:
        """Level 3: Match duration similarity within tolerance."""
        if not existing_song or not existing_song.duration or not target_duration:
            return False
        return abs(existing_song.duration - target_duration) <= tolerance_sec
