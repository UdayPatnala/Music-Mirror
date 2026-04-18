import { memo } from "react";

function thumbnailUrl(youtubeId) {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

function SongCard({
  song,
  isActive,
  isFavorite,
  onPlay,
  onToggleFavorite,
}) {
  return (
    <article className={`song-card ${isActive ? "active" : ""}`}>
      <div
        className="song-thumb"
        style={{ backgroundImage: `url(${thumbnailUrl(song.youtubeId)})` }}
      />

      <div className="song-copy">
        <div className="song-topline">
          <div>
            <p className="song-kicker">
              {song.genre} | {song.energy} energy
            </p>
            <h4>{song.title}</h4>
            <p className="song-artist">{song.artist}</p>
          </div>
          {isActive && <span className="live-badge">Now playing</span>}
        </div>

        <p className="song-note">{song.note}</p>

        <div className="song-meta">
          <span>{song.duration}</span>
          <span>{song.genre}</span>
        </div>

        <div className="song-actions">
          <button className="primary-btn" onClick={() => onPlay(song)} type="button">
            Play in app
          </button>
          <button
            className="ghost-btn"
            onClick={() => onToggleFavorite(song)}
            type="button"
          >
            {isFavorite ? "Saved" : "Save"}
          </button>
          <a
            href={song.spotify}
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            Spotify
          </a>
          <a
            href={song.youtube}
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            YouTube
          </a>
        </div>
      </div>
    </article>
  );
}

// React.memo prevents re-rendering when parent state changes but props remain exactly the same
// In this case, active state changes or new favorite is added, but only cards whose props actually change will re-render
export default memo(SongCard);
