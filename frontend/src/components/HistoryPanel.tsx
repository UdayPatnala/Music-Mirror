// @ts-nocheck
import { emotionLabels } from "./EmotionCard";

function songKey(song) {
  return `${song.title || song.name}::${song.artist}`;
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
  favorites = [],
  history = [],
  onPlaySong = () => {},
  onToggleFavorite = () => {},
}) {
  const safeHistory = history || [];
  const safeFavorites = favorites || [];

  return (
    <section className="panel history-panel">
      <p className="section-kicker">Memory</p>
      <h3>History and favorites</h3>

      <div className="history-columns" style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "16px" }}>
        <div>
          <h4>Recent mood reads</h4>
          {safeHistory.length === 0 ? (
            <p className="compact-copy">
              No saved scans yet. Your first detected mood will appear here.
            </p>
          ) : (
            <div className="mini-list">
              {safeHistory.map((item) => (
                <div className="mini-row" key={item.id}>
                  <div>
                    <strong>{emotionLabels[item.playlistEmotion] || item.playlistEmotion}</strong>
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
          <h4>Saved tracks ({safeFavorites.length})</h4>
          {safeFavorites.length === 0 ? (
            <p className="compact-copy">
              Save tracks from the queue to keep a personal shortlist.
            </p>
          ) : (
            <div className="mini-list">
              {safeFavorites.map((song) => (
                <div className="mini-row action" key={songKey(song)}>
                  <div>
                    <strong>{song.title || song.name}</strong>
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
