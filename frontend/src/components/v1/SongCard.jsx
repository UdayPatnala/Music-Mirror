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
  const youtubeId = song.youtubeId || song.youtube_id || "";
  const title = song.title || song.name || "Untitled Track";
  const artist = song.artist || "Unknown Artist";
  const genre = song.genre || "Pop";
  const energy = typeof song.energy === "number" ? (song.energy > 0.7 ? "High" : song.energy > 0.4 ? "Medium" : "Low") : (song.energy || "Steady");
  const duration = song.duration_str || (typeof song.duration === "number" ? `${Math.floor(song.duration / 60)}:${String(Math.floor(song.duration % 60)).padStart(2, '0')}` : (song.duration || "3:30"));
  const note = song.note || song.recommendation_reason || `Curated emotion track for your listening session.`;
  const spotifyUrl = song.spotify || song.spotify_url || `https://open.spotify.com/search/${encodeURIComponent(`${title} ${artist}`)}`;
  const youtubeUrl = song.youtube || (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${artist}`)}`);

  return (
    <article className={`song-card ${isActive ? "active" : ""}`}>
      <div
        className="song-thumb"
        style={{ backgroundImage: youtubeId ? `url(${thumbnailUrl(youtubeId)})` : undefined }}
      />

      <div className="song-copy">
        <div className="song-topline">
          <div>
            <p className="song-kicker">
              {genre} | {energy} energy
            </p>
            <h4>{title}</h4>
            <p className="song-artist">{artist}</p>
          </div>
          {isActive && <span className="live-badge">Now playing</span>}
        </div>

        <p className="song-note">{note}</p>

        <div className="song-meta">
          <span>{duration}</span>
          <span>{genre}</span>
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
            href={spotifyUrl}
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            Spotify
          </a>
          <a
            href={youtubeUrl}
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

export default memo(SongCard);
