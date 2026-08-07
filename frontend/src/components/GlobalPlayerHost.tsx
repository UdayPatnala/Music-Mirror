// @ts-nocheck
import React, { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Play, Pause, Volume2, VolumeX, Sparkles, Globe, Maximize2, Minimize2 } from 'lucide-react';

const TRACK_IDS: Record<string, string> = {
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
  "tum hi ho":              "Umqb9KENgmk",
  "kesariya":               "BddP6PYo2gs",
  "raataan lambiyan":       "hVV2T_H2vHc",
  "dil diyan gallan":       "Uu45KY9cT3A",
  "agar tum saath ho":      "UPq3OyJAanY",
  "chaiyya chaiyya":        "E_xhyGtFWCA",
  "kal ho naa ho":          "K7yJoM_XUTQ",
  "venmathi":               "Roa1lJiZZD4",
  "rowdy baby tamil":       "0vGcBCBBGGQ",
  "bigil theme":            "VK2L7FyXN2Q",
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

const SPOTIFY = {
  happy:   'https://open.spotify.com/embed/playlist/37i9dQZF1DZ06evO1E9Idi?utm_source=generator',
  sad:     'https://open.spotify.com/embed/playlist/37i9dQZF1DWZUozJiHy44Y?utm_source=generator',
  angry:   'https://open.spotify.com/embed/playlist/37i9dQZF1DZ06evO2YqUuI?utm_source=generator',
  neutral: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWWxPM4nWdhyI?utm_source=generator',
  surprise:'https://open.spotify.com/embed/playlist/37i9dQZF1DZ06evO2YqUuI?utm_source=generator',
};

function getEmbedUrl(song: any): string {
  if (!song) return '';
  const titleKey = (song.title || song.name || '').toLowerCase().trim();
  const knownId  = TRACK_IDS[titleKey];
  if (knownId) return `https://www.youtube-nocookie.com/embed/${knownId}?autoplay=1&rel=0&modestbranding=1`;
  const query = encodeURIComponent(`${song.title || song.name || ''} ${song.artist || ''} official audio`);
  return `https://www.youtube-nocookie.com/embed?listType=search&list=${query}&autoplay=1&rel=0&modestbranding=1`;
}

const ART_COLORS = [
  "linear-gradient(135deg, #D4AF37, #FF9966)",
  "linear-gradient(135deg, #2563EB, #A855F7)",
  "linear-gradient(135deg, #A855F7, #FF9966)",
  "linear-gradient(135deg, #16A34A, #34D399)",
  "linear-gradient(135deg, #B91C1C, #EF4444)",
];
function getArtGradient(title: string): string {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) & 0xffffffff;
  return ART_COLORS[Math.abs(h) % ART_COLORS.length];
}

export default function GlobalPlayerHost() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentSong = useAppStore(s => s.currentSong);
  const activeMood = useAppStore(s => s.activeMood);
  const playerMode = useAppStore(s => s.playerMode);
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(30);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setProgress(p => (p >= 100 ? 0 : p + 0.5));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  if (!currentSong) return null;

  const isRoom = location.pathname === '/room';
  const embedUrl = getEmbedUrl(currentSong);
  const isDirectAudio = Boolean(currentSong.preview_url || currentSong.source);
  const title = currentSong.title || currentSong.name || "Unknown";
  const artist = currentSong.artist || "Unknown Artist";
  
  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const handleCardClick = () => {
    if (!isRoom) {
      navigate('/room');
    }
  };

  return (
    <div 
      className={`player-global-host ${isRoom ? 'state-room' : 'state-floating'}`}
      onClick={handleCardClick}
      style={{ cursor: isRoom ? 'default' : 'pointer' }}
    >
      {isRoom ? (
        /* ── LARGE DOCKED MUSIC CARD FOR ROOM ── */
        <div className="studio-large-card">
          {/* Card Glass Body */}
          <div className="studio-card-header">
            <div>
              <span className="studio-provider-tag">
                {currentSong.source_provider || 'YouTube Audio'}
              </span>
              <h2 className="studio-song-title truncate">{title}</h2>
              <p className="studio-song-artist truncate">{artist}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="studio-badge studio-badge-gold">
                <Sparkles size={11} /> {activeMood.toUpperCase()}
              </span>
              {currentSong.language && (
                <span className="studio-badge studio-badge-purple">
                  <Globe size={11} /> {currentSong.language}
                </span>
              )}
            </div>
          </div>

          {/* Album Art Frame */}
          <div className="studio-album-art-container">
            <div className="studio-album-art-glow" style={{ background: getArtGradient(title) }} />
            <div className="studio-album-art" style={{ background: getArtGradient(title) }}>
              {currentSong.album_art ? (
                <img src={currentSong.album_art} alt={title} />
              ) : (
                <div className="studio-album-art-initial">
                  {title[0]?.toUpperCase()}
                </div>
              )}
              {/* Rotating disk highlight */}
              <div className="studio-album-art-overlay" />
            </div>
          </div>

          {/* Equalizer Visualizer & Waveform */}
          <div className="studio-visualizer-container">
            <div className="studio-wave-bars">
              {Array.from({ length: 28 }).map((_, i) => {
                const heightVal = isPlaying ? Math.sin(i * 0.4 + progress * 0.1) * 35 + 45 : 10;
                return (
                  <div 
                    key={i} 
                    className="studio-wave-bar" 
                    style={{ 
                      height: `${heightVal}%`,
                      background: i % 2 === 0 ? 'var(--gold)' : 'var(--purple)',
                    }} 
                  />
                );
              })}
            </div>
          </div>

          {/* Iframe content container (keeps playing in background) */}
          <div className="studio-iframe-wrapper">
            {playerMode === 'spotify' ? (
              <iframe
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy" 
                src={SPOTIFY[activeMood] || SPOTIFY.neutral}
                title="Spotify Playlist"
              />
            ) : (
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen 
                src={embedUrl}
                title="YouTube Video"
              />
            )}
          </div>

          {/* Controls Footer */}
          <div className="studio-card-controls">
            <div className="studio-progress-container">
              <div className="studio-progress-time">
                <span>0:{(Math.floor(progress * 1.8) % 60).toString().padStart(2, '0')}</span>
                <span>3:00</span>
              </div>
              <div className="studio-progress-bar-wrap">
                <div className="studio-progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="studio-control-buttons">
              <button className="studio-ctrl-btn" onClick={handleTogglePlay}>
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── COMPACT FLOATING MINI PILL PLAYER ── */
        <div className="studio-mini-player">
          <div className="studio-mini-art" style={{ background: getArtGradient(title) }}>
            {currentSong.album_art ? (
              <img src={currentSong.album_art} alt={title} />
            ) : (
              <span>{title[0]?.toUpperCase()}</span>
            )}
          </div>
          
          <div className="studio-mini-info">
            <div className="studio-mini-title truncate">{title}</div>
            <div className="studio-mini-artist truncate">{artist}</div>
          </div>

          <div style={{ display: 'none' }}>
            {/* Kept mounted in tiny off-screen view to retain continuous playing session */}
            <iframe src={embedUrl} title="Continuous Playback background frame" width="1" height="1" />
          </div>

          <div className="studio-mini-controls">
            <button className="studio-mini-btn" onClick={handleTogglePlay}>
              {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            </button>
            <div className="studio-mini-badge">
              {activeMood}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
