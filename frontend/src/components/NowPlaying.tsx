// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play, Pause, Music, Sliders } from 'lucide-react';

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

const MOOD_COLORS = {
  happy: ['#f59e0b', '#ec4899', '#8b5cf6'],
  sad: ['#3b82f6', '#1d4ed8', '#6366f1'],
  angry: ['#ef4444', '#b91c1c', '#dc2626'],
  surprise: ['#06b6d4', '#10b981', '#3b82f6'],
  neutral: ['#8b5cf6', '#6366f1', '#a78bfa']
};

const TRACK_YOUTUBE_IDS = {
  "blinding lights": "4NRXx6U8ABQ",
  "levitating": "TUVcZfQe-Kw",
  "can't stop the feeling!": "ru0K8uYEZWw",
  "uptown funk": "OPf0YbXqDm0",
  "happy": "ZbZSe6N_BXs",
  "good as hell": "smDa04GcnzA",
  "walking on sunshine": "iPUmE-tne5U",
  "sugar": "09R8_2nJtjg",
  "sunflower": "ApXoWvfEYVU",
  "don't start now": "oygrmJFKYZY",
  "shake it off": "nfWlot6h_JM",
  "someone like you": "hLQl3WQQoQ0",
  "sunset lover": "1G4isv_Fylg",
  "resonance": "8GW6sLrK40k",
  "fix you": "k4V3Mo61hJM",
  "drivers license": "ZmDBbnmKpqQ",
  "all of me": "450p7goxZqg",
  "believer": "7wtfhZwyrYY",
  "radioactive": "ktvTqWscGsw",
  "eye of the tiger": "btPJPFnesV4",
  "stronger": "PsO6ZnUZI0g",
  "numb": "kXYiU_JCYtU",
  "weightless": "UfcAVejslrU",
  "clair de lune": "WNcsUNKlAKw"
};

function getYouTubeId(song) {
  if (!song) return '4NRXx6U8ABQ';
  if (song.youtubeId && song.youtubeId !== 'undefined') return song.youtubeId;
  const key = (song.title || song.name || '').toLowerCase().trim();
  return TRACK_YOUTUBE_IDS[key] || '4NRXx6U8ABQ';
}

function embedUrl(youtubeId) {
  const safeId = youtubeId && youtubeId !== 'undefined' ? youtubeId : '4NRXx6U8ABQ';
  return `https://www.youtube.com/embed/${safeId}?autoplay=1&rel=0`;
}

function getSpotifyEmbedUrl(song, activeMood) {
  if (song?.spotify_url && song.spotify_url.includes('/track/')) {
    const trackId = song.spotify_url.split('/track/')[1]?.split('?')[0];
    if (trackId) {
      return `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`;
    }
  }
  return (SPOTIFY_PLAYLISTS[activeMood] || SPOTIFY_PLAYLISTS.neutral).url;
}

function thumbnailUrl(youtubeId) {
  const safeId = youtubeId && youtubeId !== 'undefined' ? youtubeId : '4NRXx6U8ABQ';
  return `https://img.youtube.com/vi/${safeId}/hqdefault.jpg`;
}

export default function NowPlaying({
  activeMood = 'neutral',
  activeMoodLabel,
  onPlayerModeChange,
  playerMode,
  requestState,
  song,
}) {
  const spotifyPlaylist = SPOTIFY_PLAYLISTS[activeMood] || SPOTIFY_PLAYLISTS.neutral;
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Web Audio Canvas Visualizer Animation
  useEffect(() => {
    if (!song?.preview_url || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const colors = MOOD_COLORS[activeMood] || MOOD_COLORS.neutral;

    const renderVisualizer = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barCount = 32;
      const barWidth = canvas.width / barCount;
      const time = Date.now() * 0.005;

      for (let i = 0; i < barCount; i++) {
        const heightMultiplier = Math.sin(time + i * 0.3) * 0.4 + 0.6;
        const barHeight = (canvas.height * 0.8) * heightMultiplier * (isPlaying ? 1 : 0.2);

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(0.5, colors[1]);
        gradient.addColorStop(1, colors[2]);

        ctx.fillStyle = gradient;
        ctx.shadowBlur = 10;
        ctx.shadowColor = colors[0];

        const x = i * barWidth;
        const y = canvas.height - barHeight;
        
        ctx.beginPath();
        ctx.roundRect(x + 2, y, barWidth - 4, barHeight, [4, 4, 0, 0]);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(renderVisualizer);
    };

    renderVisualizer();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [song?.preview_url, activeMood, isPlaying]);

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

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      setIsMuted(newVol === 0);
    }
  };

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
        key={isDirectAudio ? song.preview_url : playerMode === "spotify" ? spotifyPlaylist.url : getYouTubeId(song)}
      >
        {isDirectAudio ? (
          <div className="direct-audio-player-wrapper glass-card" style={{ padding: '1.25rem', borderRadius: '16px', background: 'rgba(15,15,25,0.75)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="visualizer-container" style={{ position: 'relative', width: '100%', height: '100px', marginBottom: '1rem', overflow: 'hidden', borderRadius: '12px', background: 'rgba(0,0,0,0.3)' }}>
              <canvas 
                ref={canvasRef} 
                width={500} 
                height={100} 
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            </div>

            <audio 
              ref={audioRef}
              controls 
              autoPlay 
              src={song.preview_url} 
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="native-audio-element" 
              style={{ width: '100%', marginTop: '0.5rem', borderRadius: '8px' }}
            />

            <div className="custom-audio-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button className="pill-button primary small" onClick={togglePlay}>
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button className="pill-button secondary small" onClick={toggleMute}>
                  {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: '160px' }}>
                <Sliders size={12} style={{ color: 'rgba(255,255,255,0.6)' }} />
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={volume}
                  onChange={handleVolumeChange}
                  style={{ flex: 1, accentColor: 'var(--color-primary-light, #a78bfa)' }}
                />
              </div>
            </div>
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
            src={embedUrl(getYouTubeId(song))}
            title={`${song.title || song.name} by ${song.artist}`}
          />
        )}
      </div>

      <div className="player-footer">
        <div
          className="player-art"
          style={{ backgroundImage: `url(${thumbnailUrl(getYouTubeId(song))})` }}
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
