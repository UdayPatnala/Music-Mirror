"""
Autonomous Dynamic Song Discovery Engine
Enables MusicMirror to automatically discover, fetch, extract metadata/audio features,
and persist new songs into the database dynamically on-the-fly without manual dataset updates.
"""

from typing import List, Dict, Any, Optional
import urllib.request
import urllib.parse
import json
import logging
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import Song, Artist, Album, SongSource
from app.ingestion.ingestion_service import IngestionService
from app.ingestion.normalizer import normalize_string

logger = logging.getLogger(__name__)

MOOD_FEATURE_MAP = {
    "happy": {"valence": 0.90, "energy": 0.85, "tempo": 124.0},
    "energetic": {"valence": 0.85, "energy": 0.95, "tempo": 138.0},
    "romantic": {"valence": 0.88, "energy": 0.70, "tempo": 105.0},
    "calm": {"valence": 0.65, "energy": 0.35, "tempo": 80.0},
    "sad": {"valence": 0.25, "energy": 0.30, "tempo": 75.0},
    "focused": {"valence": 0.50, "energy": 0.40, "tempo": 90.0},
    "neutral": {"valence": 0.50, "energy": 0.50, "tempo": 120.0},
}


class AutoDiscoveryService:
    @classmethod
    def search_and_ingest(
        cls,
        query: str,
        mood: Optional[str] = None,
        language: Optional[str] = None,
        db: Optional[Session] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Dynamically searches external music APIs (iTunes, Jamendo), extracts metadata,
        auto-persists new tracks into SQLite database, and returns the song records.
        """
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        discovered_tracks: List[Dict[str, Any]] = []

        try:
            # 1. Search iTunes Public Music API
            itunes_tracks = cls._fetch_itunes_tracks(query, limit=limit)
            discovered_tracks.extend(itunes_tracks)

            # 2. Search Jamendo Royalty-Free API if needed
            if len(discovered_tracks) < limit:
                jamendo_tracks = cls._fetch_jamendo_tracks(query, limit=limit - len(discovered_tracks))
                discovered_tracks.extend(jamendo_tracks)

            # 3. Auto-Persist Discovered Tracks to SQLite Database
            saved_songs = []
            for track_data in discovered_tracks:
                song_record = cls._persist_track(db, track_data, mood_override=mood, language_override=language)
                if song_record:
                    saved_songs.append(song_record)

            db.commit()
            return saved_songs

        except Exception as e:
            logger.error(f"Error in AutoDiscoveryService search_and_ingest: {e}")
            if db:
                db.rollback()
            return []
        finally:
            if close_db and db:
                db.close()

    @classmethod
    def _fetch_itunes_tracks(cls, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Fetches live music track metadata from iTunes Search API."""
        try:
            encoded_query = urllib.parse.quote(query)
            url = f"https://itunes.apple.com/search?term={encoded_query}&media=music&entity=song&limit={limit}"
            req = urllib.request.Request(url, headers={"User-Agent": "MusicMirror/2.0"})
            
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    results = data.get("results", [])
                    
                    parsed = []
                    for item in results:
                        title = item.get("trackName")
                        artist = item.get("artistName")
                        if not title or not artist:
                            continue
                            
                        genre = item.get("primaryGenreName", "Pop")
                        duration_sec = item.get("trackTimeMillis", 180000) // 1000
                        artwork = item.get("artworkUrl100", "").replace("100x100bb", "600x600bb")
                        preview_url = item.get("previewUrl", "")
                        album = item.get("collectionName", "Single")
                        release_date = (item.get("releaseDate") or "")[:4]

                        parsed.append({
                            "title": title,
                            "artist": artist,
                            "album": album,
                            "genre": genre,
                            "language": "English",
                            "duration": duration_sec,
                            "cover_image_url": artwork,
                            "preview_url": preview_url,
                            "audio_url": preview_url,
                            "release_date": release_date,
                            "source_provider": "iTunes",
                            "external_id": str(item.get("trackId")),
                        })
                    return parsed
        except Exception as e:
            logger.warning(f"iTunes API search failed: {e}")
        return []

    @classmethod
    def _fetch_jamendo_tracks(cls, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Fetches live music tracks from Jamendo API."""
        try:
            encoded_query = urllib.parse.quote(query)
            url = f"https://api.jamendo.com/v3.0/tracks/?client_id=744f4342&format=json&limit={limit}&search={encoded_query}"
            req = urllib.request.Request(url, headers={"User-Agent": "MusicMirror/2.0"})
            
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    results = data.get("results", [])
                    
                    parsed = []
                    for item in results:
                        title = item.get("name")
                        artist = item.get("artist_name")
                        if not title or not artist:
                            continue
                            
                        parsed.append({
                            "title": title,
                            "artist": artist,
                            "album": item.get("album_name", "Single"),
                            "genre": "Indie Pop",
                            "language": "English",
                            "duration": item.get("duration", 180),
                            "cover_image_url": item.get("image", ""),
                            "preview_url": item.get("audio", ""),
                            "audio_url": item.get("audio", ""),
                            "release_date": (item.get("releasedate") or "2024")[:4],
                            "source_provider": "Jamendo",
                            "external_id": str(item.get("id")),
                        })
                    return parsed
        except Exception as e:
            logger.warning(f"Jamendo API search failed: {e}")
        return []

    @classmethod
    def _persist_track(
        cls,
        db: Session,
        track: Dict[str, Any],
        mood_override: Optional[str] = None,
        language_override: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Checks for track existence in DB, creates Artist/Album/Song if missing, and returns formatted dict."""
        try:
            title = track["title"].strip()
            artist_name = track["artist"].strip()
            
            # Check existing artist
            norm_artist = normalize_string(artist_name)
            artist = db.query(Artist).filter(Artist.normalized_name == norm_artist).first()
            if not artist:
                artist = Artist(name=artist_name, normalized_name=norm_artist)
                db.add(artist)
                db.flush()

            # Check existing song
            norm_title = normalize_string(title)
            existing_song = db.query(Song).filter(
                Song.normalized_title == norm_title,
                Song.artist_id == artist.id
            ).first()

            if existing_song:
                return {
                    "id": existing_song.id,
                    "title": existing_song.title,
                    "artist": artist.name,
                    "album": existing_song.album_title or "Single",
                    "genre": existing_song.genre,
                    "language": existing_song.language,
                    "mood": existing_song.mood,
                    "duration": existing_song.duration,
                    "cover_image_url": existing_song.cover_image_url,
                    "audio_url": existing_song.audio_url or existing_song.preview_url,
                    "preview_url": existing_song.preview_url or existing_song.audio_url,
                }

            # Map audio features based on mood / genre
            target_mood = mood_override or "happy"
            features = MOOD_FEATURE_MAP.get(target_mood.lower(), MOOD_FEATURE_MAP["happy"])

            new_song = Song(
                title=title,
                normalized_title=norm_title,
                artist_id=artist.id,
                album_title=track.get("album", "Single"),
                genre=track.get("genre", "Pop"),
                language=language_override or track.get("language", "English"),
                duration=track.get("duration", 180),
                cover_image_url=track.get("cover_image_url"),
                audio_url=track.get("audio_url"),
                preview_url=track.get("preview_url"),
                release_date=track.get("release_date", "2024"),
                mood=target_mood,
                valence=features["valence"],
                energy=features["energy"],
                tempo=features["tempo"],
                popularity=85,
            )
            db.add(new_song)
            db.flush()

            # Add source link
            if track.get("external_id"):
                source = SongSource(
                    song_id=new_song.id,
                    source_type=track.get("source_provider", "iTunes"),
                    source_id=track.get("external_id"),
                    source_url=track.get("preview_url", ""),
                    status="active",
                    health_score=1.0,
                    priority=1,
                )
                db.add(source)

            return {
                "id": new_song.id,
                "title": new_song.title,
                "artist": artist.name,
                "album": new_song.album_title or "Single",
                "genre": new_song.genre,
                "language": new_song.language,
                "mood": new_song.mood,
                "duration": new_song.duration,
                "cover_image_url": new_song.cover_image_url,
                "audio_url": new_song.audio_url or new_song.preview_url,
                "preview_url": new_song.preview_url or new_song.audio_url,
            }

        except Exception as e:
            logger.error(f"Error persisting track {track.get('title')}: {e}")
            return None
