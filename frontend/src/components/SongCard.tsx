// @ts-nocheck
import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Heart, ExternalLink } from "lucide-react";

export default function SongCard({
  isActive,
  isFavorite,
  onPlay,
  onToggleFavorite,
  song,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (isActive && isPlaying && audioRef.current) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [isActive, isPlaying]);

  const handlePlayToggle = () => {
    if (!isActive) {
      onPlay(song);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleFavorite(song);
  };

  const albumArt =
    song.album_art ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      song.title || "Track"
    )}&background=random&color=fff&size=128`;

  return (
    <article className={`song-card ${isActive ? "active" : ""}`}>
      <div className="song-card-art">
        <img src={albumArt} alt="Album Art" />
        {song.preview_url ? (
          <button
            className={`play-overlay ${isPlaying && isActive ? "playing" : ""}`}
            onClick={handlePlayToggle}
            type="button"
            aria-label={isPlaying && isActive ? "Pause preview" : "Play preview"}
          >
            {isPlaying && isActive ? <Pause size={24} /> : <Play size={24} />}
          </button>
        ) : (
          <div className="no-preview-overlay">No Preview</div>
        )}
      </div>

      <div className="song-card-body">
        <div className="song-card-meta">
          <h4>{song.title || song.name}</h4>
          <p>{song.artist}</p>
        </div>

        <div className="song-card-actions">
          <button
            className={`favorite-btn ${isFavorite ? "active" : ""}`}
            onClick={handleFavoriteClick}
            type="button"
            aria-label="Toggle favorite"
          >
            <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
          </button>
          
          {song.spotify_url && (
            <a
              href={song.spotify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="spotify-link"
              title="Open in Spotify"
            >
              <ExternalLink size={20} />
            </a>
          )}
        </div>
      </div>
      
      {/* EXPLAINABLE AI TRANSPARENCY UI */}
      {song.recommendation_reason && (
        <div className="recommendation-reason" style={{ fontSize: '0.75rem', marginTop: '8px', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', padding: '0 8px 8px 8px' }}>
          ✨ {song.recommendation_reason}
        </div>
      )}

      {song.preview_url && (
        <audio
          ref={audioRef}
          src={song.preview_url}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          style={{ display: "none" }}
        />
      )}
    </article>
  );
}
