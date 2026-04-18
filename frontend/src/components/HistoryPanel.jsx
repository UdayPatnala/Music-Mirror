import { emotionLabels } from "./EmotionCard";

function songKey(song) {
  return `${song.title}::${song.artist}`;
}

function formatTime(isoValue) {
  return new Date(isoValue).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryPanel({
  favorites,
  history,
  onPlaySong,
  onToggleFavorite,
}) {
  return (
    <section className="panel history-panel">
      <p className="section-kicker">Memory</p>
      <h3>History and favorites</h3>

      <div className="history-columns">
        <div>
          <h4>Recent mood reads</h4>
          {history.length === 0 ? (
            <p className="compact-copy">
              No saved scans yet. Your first detected mood will appear here.
            </p>
          ) : (
            <div className="mini-list">
              {history.map((item) => (
                <div className="mini-row" key={item.id}>
                  <div>
                    <strong>{emotionLabels[item.playlistEmotion]}</strong>
                    <p className="compact-copy">
                      {item.title} by {item.artist}
                    </p>
                  </div>
                  <span>{formatTime(item.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4>Saved tracks</h4>
          {favorites.length === 0 ? (
            <p className="compact-copy">
              Save tracks from the queue to keep a personal shortlist.
            </p>
          ) : (
            <div className="mini-list">
              {favorites.map((song) => (
                <div className="mini-row action" key={songKey(song)}>
                  <div>
                    <strong>{song.title}</strong>
                    <p className="compact-copy">{song.artist}</p>
                  </div>
                  <div className="mini-actions">
                    <button onClick={() => onPlaySong(song)} type="button">
                      Play
                    </button>
                    <button onClick={() => onToggleFavorite(song)} type="button">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
