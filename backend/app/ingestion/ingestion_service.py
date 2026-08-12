import logging
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.db.models import Artist, Album, Song, SongSource
from app.ingestion.normalizer import normalize_string, extract_artist_and_title
from app.ingestion.deduplication import DeduplicationEngine
from app.ingestion.seed_data import SEED_SONGS

logger = logging.getLogger("IngestionService")


class IngestionService:
    @staticmethod
    def get_or_create_artist(db: Session, artist_name: str, genre: str = "Pop") -> Artist:
        norm_name = normalize_string(artist_name)
        artist = db.query(Artist).filter(Artist.normalized_name == norm_name).first()
        if not artist:
            artist = Artist(
                name=artist_name.strip(),
                normalized_name=norm_name,
                genres=genre,
                country="Global",
            )
            db.add(artist)
            db.flush()
        return artist

    @staticmethod
    def get_or_create_album(db: Session, artist_id: str, album_title: str, cover_url: str = None, release_date: str = None) -> Album:
        norm_title = normalize_string(album_title)
        album = (
            db.query(Album)
            .filter(Album.artist_id == artist_id, Album.normalized_title == norm_title)
            .first()
        )
        if not album:
            album = Album(
                title=album_title.strip(),
                normalized_title=norm_title,
                artist_id=artist_id,
                cover_image_url=cover_url,
                release_date=release_date,
            )
            db.add(album)
            db.flush()
        return album

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

        artist = cls.get_or_create_artist(db, artist_name, genre=song_data.get("genre", "Unknown"))
        album = cls.get_or_create_album(
            db,
            artist.id,
            album_name,
            cover_url=song_data.get("cover_image_url"),
            release_date=song_data.get("release_date") if song_data.get("release_date") else None,
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
                duration=song_data.get("duration") or 180,
                release_date=song_data.get("release_date"),
                genre=song_data.get("genre", "Unknown"),
                sub_genre=song_data.get("sub_genre"),
                language=song_data.get("language", "Unknown"),
                explicit=song_data.get("explicit", False),
                cover_image_url=song_data.get("cover_image_url") or (f"https://img.youtube.com/vi/{youtube_id}/hqdefault.jpg" if youtube_id else None),
                audio_url=song_data.get("audio_url") or song_data.get("preview_url"),
                preview_url=song_data.get("preview_url") or song_data.get("audio_url"),
                popularity=song_data.get("popularity") or 80,
                energy=float(song_data.get("energy")) if song_data.get("energy") is not None else 0.5,
                danceability=float(song_data.get("danceability")) if song_data.get("danceability") is not None else 0.5,
                valence=float(song_data.get("valence")) if song_data.get("valence") is not None else 0.5,
                acousticness=float(song_data.get("acousticness")) if song_data.get("acousticness") is not None else 0.5,
                instrumentalness=float(song_data.get("instrumentalness")) if song_data.get("instrumentalness") is not None else 0.0,
                tempo=float(song_data.get("tempo")) if song_data.get("tempo") is not None else 120.0,
                mood=str(song_data.get("mood", "unknown")).lower(),
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
            if song_data.get("valence") is not None and (existing_song.valence == 0.0 or existing_song.valence is None):
                existing_song.valence = float(song_data.get("valence"))
            if song_data.get("energy") is not None and (existing_song.energy == 0.0 or existing_song.energy is None):
                existing_song.energy = float(song_data.get("energy"))
            if song_data.get("tempo") is not None and (existing_song.tempo == 0.0 or existing_song.tempo is None):
                existing_song.tempo = float(song_data.get("tempo"))
            if song_data.get("duration") and (existing_song.duration == 0 or existing_song.duration is None):
                existing_song.duration = int(song_data.get("duration"))

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

    @classmethod
    def seed_database(cls, db: Session) -> Dict[str, int]:
        """
        Seeds the database with human-curated song catalog idempotently.
        """
        added_count = 0
        existing_count = 0

        for song_dict in SEED_SONGS:
            _, created = cls.ingest_song_record(db, song_dict, source_type="curated_seed")
            if created:
                added_count += 1
            else:
                existing_count += 1

        return {"added": added_count, "existing": existing_count, "total_processed": len(SEED_SONGS)}
