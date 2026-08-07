// @ts-nocheck
import React from 'react';

const SPOTIFY_PLAYLISTS = {
  happy: {
    label: "Happy mix",
    url: "https://open.spotify.com/embed/playlist/37i9dQZF1DZ06evO1E9Idi?utm_source=generator",
    openUrl: "https://open.spotify.com/playlist/37i9dQZF1DZ06evO1E9Idi",
  },
  sad: {
    label: "Reflective mix",
    url: "https://open.spotify.com/embed/playlist/37i9dQZF1DWZUozJiHy44Y?utm_source=generator",
    openUrl: "https://open.spotify.com/playlist/37i9dQZF1DWZUozJiHy44Y",
  },
  angry: {
    label: "Power mix",
    url: "https://open.spotify.com/embed/playlist/37i9dQZF1DZ06evO2YqUuI?utm_source=generator",
    openUrl: "https://open.spotify.com/playlist/37i9dQZF1DZ06evO2YqUuI",
  },
  neutral: {
    label: "Steady mix",
    url: "https://open.spotify.com/embed/playlist/37i9dQZF1DWWxPM4nWdhyI?utm_source=generator",
    openUrl: "https://open.spotify.com/playlist/37i9dQZF1DWWxPM4nWdhyI",
  },
  surprise: {
    label: "Surprise mix",
    url: "https://open.spotify.com/embed/playlist/37i9dQZF1DZ06evO2YqUuI?utm_source=generator",
    openUrl: "https://open.spotify.com/playlist/37i9dQZF1DZ06evO2YqUuI",
  },
};

function embedUrl(youtubeId) {
  return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
}

function thumbnailUrl(youtubeId) {
  if (!youtubeId) return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80';
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

export default function NowPlaying({
  activeMood,
  activeMoodLabel,
  onPlayerModeChange,
  playerMode,
  requestState,
  song,
}) {
  const spotifyPlaylist = SPOTIFY_PLAYLISTS[activeMood] || SPOTIFY_PLAYLISTS.neutral;

  if (!song) {
    return (
      <section className="player-panel empty">
        <p className="section-kicker">Now playing</p>
        <h3>No track selected yet</h3>
        <p className="player-copy">
          {requestState === "loading"
            ? "Your next track is loading."
            : "Start the camera, pick a mood, or select a track from Git/Local explorer."}
        </p>
      </section>
    );
  }

  const isDirectAudio = Boolean(song.preview_url || song.source);

  return (
    <section className="player-panel">
      <div className="player-header">
        <div>
          <p className="section-kicker">{song.source ? `Source: ${song.source}` : "Now playing"}</p>
          <h3>{song.title || song.name}</h3>
        </div>
        <span className="live-badge">{activeMoodLabel || song.source || 'Active'}</span>
      </div>

      {!isDirectAudio && (
        <div className="player-mode-switch" role="tablist" aria-label="Player source">
          <button
            className={`player-mode-btn ${playerMode === "youtube" ? "active" : ""}`}
            onClick={() => onPlayerModeChange("youtube")}
            aria-pressed={playerMode === "youtube"}
            type="button"
          >
            Track player
          </button>
          <button
            className={`player-mode-btn ${playerMode === "spotify" ? "active" : ""}`}
            onClick={() => onPlayerModeChange("spotify")}
            aria-pressed={playerMode === "spotify"}
            type="button"
          >
            Spotify mood mix
          </button>
        </div>
      )}

      <div
        className={`player-frame ${playerMode === "spotify" ? "spotify" : ""} ${isDirectAudio ? "direct-audio" : ""}`}
        key={isDirectAudio ? song.preview_url : playerMode === "spotify" ? spotifyPlaylist.url : song.youtubeId}
      >
        {isDirectAudio ? (
          <div className="direct-audio-player-wrapper glass-card">
            <div className="audio-visualizer-bars">
              <span className="bar bar1"></span>
              <span className="bar bar2"></span>
              <span className="bar bar3"></span>
              <span className="bar bar4"></span>
              <span className="bar bar5"></span>
            </div>
            <audio 
              controls 
              autoPlay 
              src={song.preview_url} 
              className="native-audio-element" 
              style={{ width: '100%', marginTop: '1rem' }}
            />
          </div>
        ) : playerMode === "spotify" ? (
          <iframe
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            src={spotifyPlaylist.url}
            title={`${spotifyPlaylist.label} on Spotify`}
          />
        ) : (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            src={embedUrl(song.youtubeId)}
            title={`${song.title} by ${song.artist}`}
          />
        )}
      </div>

      <div className="player-footer">
        <div
          className="player-art"
          style={{ backgroundImage: `url(${thumbnailUrl(song.youtubeId)})` }}
        />
        <div>
          <p className="player-copy">
            {isDirectAudio ? (song.artist || 'Direct Audio Stream') : playerMode === "spotify" ? spotifyPlaylist.label : song.artist}
          </p>
          <p className="player-copy muted">
            {isDirectAudio 
              ? `Playing audio file directly from ${song.source || 'Local/Git Explorer'}.`
              : playerMode === "spotify"
              ? `Open a fuller Spotify playlist tuned for the ${(activeMoodLabel || 'neutral').toLowerCase()} lane.`
              : song.note}
          </p>
          {!isDirectAudio && playerMode === "spotify" && (
            <a
              className="text-link"
              href={spotifyPlaylist.openUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open in Spotify
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
