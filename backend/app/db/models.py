import uuid
from datetime import datetime, timezone
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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

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

    version_label = Column(String(100), nullable=True) # e.g. "Remastered", "Live", "Acoustic"

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    artist = relationship("Artist", back_populates="songs")
    album = relationship("Album", back_populates="songs")
    sources = relationship("SongSource", back_populates="song", cascade="all, delete-orphan")
    artworks = relationship("Artwork", back_populates="song", cascade="all, delete-orphan")
    lyrics = relationship("Lyrics", back_populates="song", cascade="all, delete-orphan", uselist=False)

    @property
    def artist_name(self) -> str:
        if hasattr(self, "_artist_name") and self._artist_name:
            return self._artist_name
        if hasattr(self, "artist") and self.artist:
            return self.artist.name
        return "Unknown Artist"

    @artist_name.setter
    def artist_name(self, value: str) -> None:
        self._artist_name = value

    @property
    def duration_str(self) -> str:
        if hasattr(self, "_duration_str") and self._duration_str:
            return self._duration_str
        dur = self.duration or 0
        return f"{dur // 60}:{dur % 60:02d}"

    @duration_str.setter
    def duration_str(self, value: str) -> None:
        self._duration_str = value

    __table_args__ = (
        UniqueConstraint("artist_id", "normalized_title", name="uix_song_artist_title"),
        Index("idx_song_genre_mood", "genre", "mood"),
        Index("idx_song_valence_energy", "valence", "energy"),
    )


class SongSource(Base):
    __tablename__ = "song_sources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    song_id = Column(String(36), ForeignKey("songs.id", ondelete="CASCADE"), nullable=False, index=True)

    source_type = Column(String(50), nullable=False) # 'youtube', 'jamendo', 'spotify', 'soundcloud'
    source_id = Column(String(255), nullable=False, index=True)
    source_url = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="ACTIVE") # 'ACTIVE', 'DEGRADED', 'UNAVAILABLE', 'BLOCKED', 'REMOVED', 'VERIFYING'

    health_score = Column(Float, nullable=False, default=1.0)
    priority = Column(Integer, nullable=False, default=1) # 1 = PRIMARY, 2 = SECONDARY, 3 = FALLBACK
    success_count = Column(Integer, nullable=False, default=0)
    failure_count = Column(Integer, nullable=False, default=0)
    consecutive_failures = Column(Integer, nullable=False, default=0)
    reliability_score = Column(Float, nullable=False, default=1.0)

    title_at_source = Column(String(255), nullable=True)
    duration_at_source = Column(Integer, nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    channel_name = Column(String(255), nullable=True)

    last_checked_at = Column(DateTime, nullable=True)
    last_verified_at = Column(DateTime, nullable=True)

    # Freshness tracking (Block 04)
    last_fetched_at = Column(DateTime, nullable=True)
    stale_after_hours = Column(Integer, default=168, nullable=False)  # default 1 week

    # Lifecycle tracking (Block 10)
    temporary_url = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    song = relationship("Song", back_populates="sources")

    __table_args__ = (
        UniqueConstraint("source_type", "source_id", name="uix_source_type_id"),
    )


class Artwork(Base):
    __tablename__ = "artworks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    song_id = Column(String(36), ForeignKey("songs.id", ondelete="CASCADE"), nullable=True, index=True)
    album_id = Column(String(36), ForeignKey("albums.id", ondelete="CASCADE"), nullable=True, index=True)
    artist_id = Column(String(36), ForeignKey("artists.id", ondelete="CASCADE"), nullable=True, index=True)

    url = Column(Text, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    quality = Column(String(50), nullable=True, default="high") # 'high', 'medium', 'low'
    provider = Column(String(50), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    song = relationship("Song", back_populates="artworks")


class Lyrics(Base):
    __tablename__ = "lyrics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    song_id = Column(String(36), ForeignKey("songs.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    text = Column(Text, nullable=False)
    is_synced = Column(Boolean, default=False) # True if contains timestamps
    provider = Column(String(50), nullable=True)
    language = Column(String(50), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    song = relationship("Song", back_populates="lyrics")


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

    blocked_artists = Column(Text, nullable=True) # JSON array of excluded artists e.g. ["Artist X"]
    blocked_songs = Column(Text, nullable=True) # JSON array of excluded song IDs

    # Privacy controls (Block 05 / Block 13)
    private_session = Column(Boolean, default=False, nullable=False) # True = do not learn from current session
    do_not_learn = Column(Boolean, default=False, nullable=False)     # True = never update learned affinity for this user

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class UserPlaybackReport(Base):
    __tablename__ = "user_playback_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), nullable=False, index=True)
    song_id = Column(String(36), ForeignKey("songs.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String(36), nullable=True, index=True)

    report_type = Column(String(50), nullable=False) # 'NOT_PLAYING', 'WRONG_SONG', 'SOURCE_UNAVAILABLE', 'AUDIO_ERROR', 'WRONG_VERSION', 'OTHER'
    issue_classification = Column(String(50), nullable=False, default="PLAYBACK_FAILURE")
    description = Column(Text, nullable=True)
    error_code = Column(String(100), nullable=True)

    status = Column(String(50), nullable=False, default="PENDING") # 'PENDING', 'DIAGNOSED', 'REPAIRED', 'UNRESOLVED'
    confidence = Column(String(20), nullable=False, default="MEDIUM") # 'LOW', 'MEDIUM', 'HIGH'

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class UserInteraction(Base):
    """
    Immutable interaction event log (Block 01 / 05 / 08).
    Records every meaningful user action: play, skip, complete, like, dislike, replay.
    Strong signal (like/complete/replay) > Medium (add_to_playlist) > Weak (skip/open).
    SKIP != DISLIKE. is_private_session=True events are never used for learning.
    """
    __tablename__ = "user_interactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), nullable=False, index=True)
    song_id = Column(String(36), ForeignKey("songs.id", ondelete="CASCADE"), nullable=False, index=True)

    # 'PLAY', 'SKIP', 'COMPLETE', 'LIKE', 'DISLIKE', 'REPLAY', 'ADD_TO_PLAYLIST'
    interaction_type = Column(String(50), nullable=False, index=True)

    play_duration_seconds = Column(Integer, nullable=True)    # how long they actually listened
    song_duration_seconds = Column(Integer, nullable=True)    # total song length at time of interaction
    completion_ratio = Column(Float, nullable=True)           # play_duration / song_duration [0.0, 1.0]

    session_id = Column(String(100), nullable=True, index=True)
    is_private_session = Column(Boolean, default=False, nullable=False)  # excluded from learning if True

    context_emotion = Column(String(50), nullable=True)   # detected emotion at time of interaction
    context_genre = Column(String(100), nullable=True)    # genre context at recommendation time

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    song = relationship("Song", foreign_keys=[song_id])

    __table_args__ = (
        Index("idx_interaction_user_type", "user_id", "interaction_type"),
        Index("idx_interaction_user_song", "user_id", "song_id"),
        Index("idx_interaction_user_created", "user_id", "created_at"),
    )


class UserAffinity(Base):
    """
    Learned affinity scores per user per entity (Block 01 / 05).
    Computed from UserInteraction history. Explicit UserMusicPreference has higher authority.
    Score range: -1.0 (strong dislike) to +1.0 (strong like). Reset-safe via profile_version.
    """
    __tablename__ = "user_affinities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), nullable=False, index=True)

    entity_type = Column(String(50), nullable=False)   # 'SONG', 'ARTIST', 'GENRE', 'MOOD', 'LANGUAGE'
    entity_id = Column(String(255), nullable=False)    # song_id / artist_name / genre_name etc.

    affinity_score = Column(Float, nullable=False, default=0.0)    # bounded [-1.0, 1.0]
    interaction_count = Column(Integer, nullable=False, default=0)
    positive_count = Column(Integer, nullable=False, default=0)    # likes + completes + replays
    negative_count = Column(Integer, nullable=False, default=0)    # dislikes + early skips
    last_interaction_at = Column(DateTime, nullable=True)

    profile_version = Column(Integer, nullable=False, default=1)   # invalidated on profile reset

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "entity_type", "entity_id", name="uix_affinity_user_entity"),
        Index("idx_affinity_user_type", "user_id", "entity_type"),
    )


class RepairIncident(Base):
    """
    Durable autonomous repair audit trail (Block 01 / 10).
    Every automated source mutation is recorded here. Supplements in-memory GovernanceAuditLog
    with persistent storage for post-incident analysis and rollback support.
    """
    __tablename__ = "repair_incidents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(100), nullable=False, unique=True, index=True)
    song_id = Column(String(36), ForeignKey("songs.id", ondelete="SET NULL"), nullable=True, index=True)

    old_source_id = Column(String(36), nullable=True)
    new_source_id = Column(String(36), nullable=True)
    classification = Column(String(50), nullable=False, default="PLAYBACK_FAILURE")
    reason = Column(Text, nullable=True)

    confidence = Column(Float, nullable=False, default=0.0)
    verification_result = Column(String(50), nullable=False, default="PENDING")  # CANARY_PASSED / FAILED
    canary_passed = Column(Boolean, default=False, nullable=False)
    rolled_back = Column(Boolean, default=False, nullable=False)
    rolled_back_at = Column(DateTime, nullable=True)

    algorithm_version = Column(String(50), nullable=False, default="v2.0.0-governed")
    trigger = Column(String(50), nullable=False, default="USER_REPORT")  # USER_REPORT / AUTO_DETECTED / ADMIN

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("idx_repair_song_created", "song_id", "created_at"),
    )
