/**
 * BackgroundMusicPlayer
 * ──────────────────────
 * A floating ambient background music toggle for the landing page.
 * Uses royalty-free CC-licensed tracks from Jamendo.
 * Respects browser autoplay policy — only starts on user gesture.
 * Volume is intentionally low (15%) to stay ambient.
 */
import { useEffect, useRef, useState, useCallback } from "react";


const AMBIENT_TRACKS = [
  // Royalty-free CC-licensed ambient/lo-fi tracks via Jamendo
  "https://prod-1.storage.jamendo.com/download/track/1473953/mp32/",
  "https://prod-1.storage.jamendo.com/download/track/1254924/mp32/",
  "https://prod-1.storage.jamendo.com/download/track/1880003/mp32/",
];

const VOLUME = 0.13;

export function BackgroundMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  // Show the button after a short delay so it doesn't overwhelm on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1800);
    return () => clearTimeout(t);
  }, []);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.volume = VOLUME;
    audio.loop = false;
    audio.preload = "none";
    audioRef.current = audio;

    audio.addEventListener("ended", () => {
      // Auto-advance to next track
      setTrackIdx((i) => (i + 1) % AMBIENT_TRACKS.length);
    });
    audio.addEventListener("canplay", () => setLoading(false));

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Load new track when index changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = AMBIENT_TRACKS[trackIdx];
    if (playing) {
      setLoading(true);
      audio.play().catch(() => setPlaying(false));
    }
  }, [trackIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      if (!audio.src) {
        audio.src = AMBIENT_TRACKS[trackIdx];
      }
      setLoading(true);
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      } finally {
        setLoading(false);
      }
    }
  }, [playing, trackIdx]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      {/* Label */}
      <div
        style={{
          fontSize: "0.68rem",
          fontWeight: 600,
          letterSpacing: "0.08em",
          color: playing ? "rgba(212,175,55,0.8)" : "rgba(255,255,255,0.25)",
          textTransform: "uppercase",
          transition: "color 0.4s ease",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {playing ? "Ambient" : "Music Off"}
      </div>

      {/* Button */}
      <button
        onClick={toggle}
        aria-label={playing ? "Mute background music" : "Play ambient background music"}
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: `1px solid ${playing ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.1)"}`,
          background: playing
            ? "rgba(212,175,55,0.1)"
            : "rgba(255,255,255,0.04)",
          backdropFilter: "blur(12px)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s cubic-bezier(0.25,0.8,0.25,1)",
          boxShadow: playing
            ? "0 0 24px rgba(212,175,55,0.2), 0 4px 16px rgba(0,0,0,0.4)"
            : "0 4px 16px rgba(0,0,0,0.3)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Pulse ring when playing */}
        {playing && (
          <span
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              border: "1px solid rgba(212,175,55,0.25)",
              animation: "bg-music-ping 2s ease-out infinite",
              pointerEvents: "none",
            }}
          />
        )}

        {loading ? (
          /* Spinner */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(212,175,55,0.8)" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        ) : playing ? (
          /* Equalizer bars (playing) */
          <svg width="20" height="18" viewBox="0 0 20 18" fill="none">
            <rect x="0" y="6"  width="3" height="12" rx="1.5" fill="#D4AF37" style={{animation:"bg-bar 0.7s ease-in-out infinite alternate"}} />
            <rect x="5" y="2"  width="3" height="16" rx="1.5" fill="#D4AF37" style={{animation:"bg-bar 0.7s ease-in-out infinite alternate",animationDelay:"0.15s"}} />
            <rect x="10" y="4" width="3" height="14" rx="1.5" fill="#D4AF37" style={{animation:"bg-bar 0.7s ease-in-out infinite alternate",animationDelay:"0.3s"}} />
            <rect x="15" y="7" width="3" height="11" rx="1.5" fill="#D4AF37" style={{animation:"bg-bar 0.7s ease-in-out infinite alternate",animationDelay:"0.45s"}} />
          </svg>
        ) : (
          /* Music note (paused) */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
        )}
      </button>

      <style>{`
        @keyframes bg-music-ping {
          0%   { transform: scale(1);    opacity: 0.6; }
          100% { transform: scale(1.5);  opacity: 0; }
        }
        @keyframes bg-bar {
          from { transform: scaleY(0.35); }
          to   { transform: scaleY(1);    }
        }
      `}</style>
    </div>
  );
}
