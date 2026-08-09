import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from app.db.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Artist(Base):
    __tablename__ = "artists"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    normalized_name = Column(String(255), nullable=False, unique=True, index=True)
    image_url = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    genres = Column(String(255), nullable=True)
    country = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    songs = relationship("Song", back_populates="artist", cascade="all, delete-orphan")
    albums = relationship("Album", back_populates="artist", cascade="all, delete-orphan")


class Album(Base):
    __tablename__ = "albums"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    normalized_title = Column(String(255), nullable=False, index=True)
    artist_id = Column(String(36), ForeignKey("artists.id", ondelete="CASCADE"), nullable=False, index=True)
    cover_image_url = Column(Text, nullable=True)
    release_date = Column(String(50), nullable=True)
    album_type = Column(String(50), default="album")
    total_tracks = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    artist = relationship("Artist", back_populates="albums")
    songs = relationship("Song", back_populates="album", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("artist_id", "normalized_title", name="uix_album_artist_title"),
    )


class Song(Base):
    __tablename__ = "songs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    normalized_title = Column(String(255), nullable=False, index=True)
    artist_id = Column(String(36), ForeignKey("artists.id", ondelete="CASCADE"), nullable=False, index=True)
    album_id = Column(String(36), ForeignKey("albums.id", ondelete="SET NULL"), nullable=True, index=True)
    album_title = Column(String(255), nullable=True)

    duration = Column(Integer, nullable=False, default=180) # duration in seconds
    release_date = Column(String(50), nullable=True)
    genre = Column(String(100), nullable=False, default="Pop", index=True)
    sub_genre = Column(String(100), nullable=True)
    language = Column(String(50), nullable=False, default="English", index=True)
    explicit = Column(Boolean, default=False)
    track_number = Column(Integer, default=1)
    disc_number = Column(Integer, default=1)
    cover_image_url = Column(Text, nullable=True)
    audio_url = Column(Text, nullable=True)
    preview_url = Column(Text, nullable=True)
    lyrics_availability = Column(Boolean, default=False)
    isrc = Column(String(50), nullable=True, index=True)
    popularity = Column(Integer, default=80, index=True)

    # Audio & AI Feature Attributes (Normalized 0.0 - 1.0)
    energy = Column(Float, default=0.5, index=True)
    danceability = Column(Float, default=0.5)
    valence = Column(Float, default=0.5, index=True)
    acousticness = Column(Float, default=0.5)
    instrumentalness = Column(Float, default=0.0)
    tempo = Column(Float, default=120.0)
    key = Column(Integer, nullable=True)
    mode = Column(Integer, nullable=True)
    loudness = Column(Float, nullable=True)

    mood = Column(String(50), nullable=False, default="neutral", index=True)
    tags = Column(Text, nullable=True) # Comma separated
    description = Column(Text, nullable=True)
    youtube_id = Column(String(100), nullable=True, index=True)
    is_estimated_ai_metrics = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    artist = relationship("Artist", back_populates="songs")
    album = relationship("Album", back_populates="songs")
    sources = relationship("SongSource", back_populates="song", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("artist_id", "normalized_title", name="uix_song_artist_title"),
        Index("idx_song_genre_mood", "genre", "mood"),
        Index("idx_song_valence_energy", "valence", "energy"),
    )


class SongSource(Base):
    __tablename__ = "song_sources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    song_id = Column(String(36), ForeignKey("songs.id", ondelete="CASCADE"), nullable=False, index=True)
    source_type = Column(String(50), nullable=False, index=True) # 'youtube', 'jamendo', 'local', 'spotify'
    source_id = Column(String(255), nullable=False, index=True) # videoId or trackId
    source_url = Column(Text, nullable=False)
    title_at_source = Column(String(255), nullable=True)
    duration_at_source = Column(Integer, nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    channel_id = Column(String(100), nullable=True)
    channel_name = Column(String(255), nullable=True)
    published_at = Column(String(50), nullable=True)
    metadata_json = Column(Text, nullable=True) # Raw provider JSON

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    song = relationship("Song", back_populates="sources")

    __table_args__ = (
        UniqueConstraint("source_type", "source_id", name="uix_source_type_id"),
    )


class UserMusicPreference(Base):
    __tablename__ = "user_music_preferences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), nullable=False, unique=True, index=True)

    profile_version = Column(Integer, nullable=False, default=1)
    discovery_mode = Column(String(50), nullable=False, default="balanced") # 'more_familiar', 'balanced', 'more_exploratory'
    energy_preference = Column(String(50), nullable=False, default="balanced") # 'low', 'balanced', 'high'
    tempo_preference = Column(String(50), nullable=False, default="moderate") # 'slow', 'moderate', 'fast'
    vocal_preference = Column(String(50), nullable=False, default="mixed") # 'vocal', 'mixed', 'instrumental'
    explicit_content_mode = Column(String(50), nullable=False, default="filter") # 'allow', 'filter', 'hide'

    preferred_genres = Column(Text, nullable=True) # JSON array e.g. ["Telugu Pop", "Indie Pop"]
    preferred_artists = Column(Text, nullable=True) # JSON array of artist names e.g. ["Sid Sriram", "Anirudh Ravichander"]
    preferred_moods = Column(Text, nullable=True) # JSON array e.g. ["happy", "romantic"]
    preferred_languages = Column(Text, nullable=True) # JSON array e.g. ["Telugu", "Tamil", "English"]

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
