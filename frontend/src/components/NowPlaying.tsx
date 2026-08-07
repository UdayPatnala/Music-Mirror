// @ts-nocheck
import React, { useRef, useState } from 'react';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';

/* ── YouTube ID lookup ──────────────────────────────────────── */
const TRACK_IDS: Record<string, string> = {
  // Telugu
  "buttabomma":             "A6BJ-PgNWXA",
  "samajavaragamana":       "E3BnMDc9ATE",
  "ennenno janmala":        "_dXwkfq5YG8",
  "rowdy baby":             "0vGcBCBBGGQ",
  "kannazhaga":             "9oNvxVFsm5U",
  "inkem inkem inkem kaavale": "HA-Sjb5BCMA",
  "ramuloo ramulaa":        "K9aQFnq1xv0",
  "nee neeli kannullona":   "q_OzfDwVV88",
  "manasantha nuvve":       "8mB7Mf-OYBA",
  "oo solriya":             "sJhsZLs7tPk",
  "aa ante amalapuram":     "4IIB5L4oCMk",
  "naatu naatu":            "qfSRDoxzKGA",
  "srivalli":               "RACf1mY9bJI",
  "oo antava":              "FHe9nf1azts",
  "jaragandi":              "HUJfPpESSWg",
  "josh josh":              "VRbSiUuSqBA",
  "vachinde":               "2XjJxVLqSgE",
  "kalyana vaibhogame":     "cxZe-Jxm5WY",
  "aa jaa re aa":           "k7HHWqPBHLM",
  // Hindi / Bollywood
  "tum hi ho":              "Umqb9KENgmk",
  "kesariya":               "BddP6PYo2gs",
  "raataan lambiyan":       "hVV2T_H2vHc",
  "dil diyan gallan":       "Uu45KY9cT3A",
  "agar tum saath ho":      "UPq3OyJAanY",
  "chaiyya chaiyya":        "E_xhyGtFWCA",
  "kal ho naa ho":          "K7yJoM_XUTQ",
  // Tamil
  "venmathi":               "Roa1lJiZZD4",
  "rowdy baby tamil":       "0vGcBCBBGGQ",
  "bigil theme":            "VK2L7FyXN2Q",
  // English
  "blinding lights":        "4NRXx6U8ABQ",
  "levitating":             "TUVcZfQe-Kw",
  "as it was":              "H5v3kku4y6Q",
  "happy":                  "ZbZSe6N_BXs",
  "uptown funk":            "OPf0YbXqDm0",
  "shake it off":           "nfWlot6h_JM",
  "don't start now":        "oygrmJFKYZY",
  "someone like you":       "hLQl3WQQoQ0",
  "fix you":                "k4V3Mo61hJM",
  "all of me":              "450p7goxZqg",
  "believer":               "7wtfhZwyrYY",
  "radioactive":            "ktvTqWscGsw",
  "drivers license":        "ZmDBbnmKpqQ",
  "sunflower":              "ApXoWvfEYVU",
  "weightless":             "UfcAVejslrU",
  "resonance":              "8GW6sLrK40k",
};

/**
 * Build the best embed URL for a song.
 * 1. If we have a hardcoded ID → direct embed with autoplay
 * 2. Otherwise → YouTube search embed (plays first result automatically)
 */
function getEmbedUrl(song: any): string {
  if (!song) return '';
  const titleKey = (song.title || song.name || '').toLowerCase().trim();
  const knownId  = TRACK_IDS[titleKey];

  if (knownId) {
    return `https://www.youtube-nocookie.com/embed/${knownId}?autoplay=1&rel=0&modestbranding=1`;
  }

  // Search fallback — plays whichever result YouTube surfaces first
  const query = encodeURIComponent(
    `${song.title || song.name || ''} ${song.artist || ''} official audio`
  );
  return `https://www.youtube-nocookie.com/embed?listType=search&list=${query}&autoplay=1&rel=0&modestbranding=1`;
}

function getThumbnail(song: any): string {
  if (!song) return '';
  const titleKey = (song.title || song.name || '').toLowerCase().trim();
  const id = TRACK_IDS[titleKey];
  if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  if (song.album_art) return song.album_art;
  return '';
}

const SPOTIFY: Record<string, { label: string; url: string; open: string }> = {
  happy:   { label: 'Happy mix',      url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DZ06evO1E9Idi?utm_source=generator', open: 'https://open.spotify.com/playlist/37i9dQZF1DZ06evO1E9Idi' },
  sad:     { label: 'Reflective mix', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWZUozJiHy44Y?utm_source=generator', open: 'https://open.spotify.com/playlist/37i9dQZF1DWZUozJiHy44Y' },
  angry:   { label: 'Power mix',      url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DZ06evO2YqUuI?utm_source=generator', open: 'https://open.spotify.com/playlist/37i9dQZF1DZ06evO2YqUuI' },
  neutral: { label: 'Steady mix',     url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWWxPM4nWdhyI?utm_source=generator', open: 'https://open.spotify.com/playlist/37i9dQZF1DWWxPM4nWdhyI' },
  surprise:{ label: 'Discovery mix',  url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DZ06evO2YqUuI?utm_source=generator', open: 'https://open.spotify.com/playlist/37i9dQZF1DZ06evO2YqUuI' },
};

export default function NowPlaying({ activeMood = 'neutral', activeMoodLabel, onPlayerModeChange, playerMode, requestState, song }) {
  const spotify = SPOTIFY[activeMood] || SPOTIFY.neutral;
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted,   setIsMuted]   = useState(false);
  const [volume,    setVolume]    = useState(1);

  const isDirectAudio = Boolean(song?.preview_url || song?.source);
  const embedUrl      = getEmbedUrl(song);
  const thumbnail     = getThumbnail(song);

  const togglePlay = () => {
    if (audioRef.current) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(v => !v);
    }
  };
  const toggleMute = () => {
    if (audioRef.current) { audioRef.current.muted = !isMuted; setIsMuted(v => !v); }
  };
  const handleVol = e => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) { audioRef.current.volume = v; setIsMuted(v === 0); }
  };

  /* ── Empty state ── */
  if (!song) {
    return (
      <section className="player-panel empty">
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(212,175,55,0.5)' }}>
            <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
          </svg>
        </div>
        <h3>No track selected</h3>
        <p className="player-copy">
          {requestState === 'loading'
            ? 'Finding the right music for your mood...'
            : 'Allow camera access or choose a mood below to begin.'}
        </p>
      </section>
    );
  }

  return (
    <section className="player-panel">
      {/* Header */}
      <div className="player-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="section-kicker">{song.source ? `Source — ${song.source}` : 'Now Playing'}</p>
          <h3 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {song.title || song.name}
          </h3>
        </div>
        <span className="live-badge">{activeMoodLabel || 'Playing'}</span>
      </div>

      {/* Mode switch */}
      {!isDirectAudio && (
        <div className="player-mode-switch">
          <button className={`player-mode-btn ${playerMode === 'youtube' ? 'active' : ''}`} onClick={() => onPlayerModeChange('youtube')} type="button">
            Track
          </button>
          <button className={`player-mode-btn ${playerMode === 'spotify' ? 'active' : ''}`} onClick={() => onPlayerModeChange('spotify')} type="button">
            Spotify Mood Mix
          </button>
        </div>
      )}

      {/* Player frame */}
      <div
        className="player-frame"
        key={isDirectAudio ? song.preview_url : playerMode === 'spotify' ? spotify.url : embedUrl}
      >
        {isDirectAudio ? (
          <div className="direct-audio-player-wrapper">
            <audio ref={audioRef} controls autoPlay src={song.preview_url}
              onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}
              className="native-audio-element" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <button className="pill-button primary small" onClick={togglePlay}>
                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button className="pill-button secondary small" onClick={toggleMute}>
                {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
              <input type="range" min="0" max="1" step="0.05" value={volume} onChange={handleVol}
                style={{ flex: 1, accentColor: 'var(--gold)' }} />
            </div>
          </div>
        ) : playerMode === 'spotify' ? (
          <iframe
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy" src={spotify.url}
            title={`${spotify.label} on Spotify`}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen src={embedUrl}
            title={`${song.title || song.name} by ${song.artist}`}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="player-footer">
        {thumbnail && (
          <div className="player-art" style={{ backgroundImage: `url(${thumbnail})` }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="player-copy" style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {isDirectAudio ? (song.artist || 'Direct Audio') : playerMode === 'spotify' ? spotify.label : song.artist}
          </p>
          <p className="player-copy muted">
            {isDirectAudio ? `From ${song.source || 'local explorer'}`
              : playerMode === 'spotify' ? (
                <a className="text-link" href={spotify.open} rel="noreferrer" target="_blank">Open in Spotify</a>
              )
              : song.language && `${song.language} · ${song.genre || ''}`}
          </p>
        </div>
      </div>
    </section>
  );
}
