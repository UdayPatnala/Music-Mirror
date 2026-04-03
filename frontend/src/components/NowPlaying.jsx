function embedUrl(youtubeId) {
  return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
}

function thumbnailUrl(youtubeId) {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

export default function NowPlaying({ activeMoodLabel, requestState, song }) {
  if (!song) {
    return (
      <section className="player-panel empty">
        <p className="section-kicker">Now playing</p>
        <h3>No track selected yet</h3>
        <p className="player-copy">
          {requestState === "loading"
            ? "Your next track is loading."
            : "Start the camera or pick a mood to load a playable recommendation."}
        </p>
      </section>
    );
  }

  return (
    <section className="player-panel">
      <div className="player-header">
        <div>
          <p className="section-kicker">Now playing</p>
          <h3>{song.title}</h3>
        </div>
        <span className="live-badge">{activeMoodLabel}</span>
      </div>

      <div className="player-frame" key={song.youtubeId}>
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          src={embedUrl(song.youtubeId)}
          title={`${song.title} by ${song.artist}`}
        />
      </div>

      <div className="player-footer">
        <div
          className="player-art"
          style={{ backgroundImage: `url(${thumbnailUrl(song.youtubeId)})` }}
        />
        <div>
          <p className="player-copy">{song.artist}</p>
          <p className="player-copy muted">{song.note}</p>
        </div>
      </div>
    </section>
  );
}
