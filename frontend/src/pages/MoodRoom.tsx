// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import Camera from "../components/Camera";
import type { DetectionResult } from "../components/Camera";
import { CDDisc } from "../components/Brand";
import { useAppStore } from "../store/useAppStore";
import type { Song } from "../store/useAppStore";
import { sessionOrchestrator } from "../architecture/orchestrator/SessionOrchestrator";
import { JamendoProviderAdapter } from "../architecture/layers/ProviderAdapterLayer/JamendoProviderAdapter";
import { Disc, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, RefreshCw, Sparkles, ChevronLeft, ChevronRight, Music } from "lucide-react";

/* ─── Emotion configuration ──────────────────────────────── */
const MOODS = ["calm", "happy", "sad", "energetic", "focused", "romantic", "neutral"];

const MOOD_COLOR: Record<string, string> = {
  calm:      "#2DD4BF",
  happy:     "#F59E0B",
  sad:       "#22D3EE",
  energetic: "#8B5CF6",
  focused:   "#6366F1",
  romantic:  "#F472B6",
  neutral:   "#A6ACB8",
};

const MOOD_LABEL: Record<string, string> = {
  calm:      "Calm & Peaceful",
  happy:     "Upbeat & Joyful",
  sad:       "Melancholy & Soft",
  energetic: "High Energy",
  focused:   "Deep Focus",
  romantic:  "Romantic & Warm",
  neutral:   "Balanced Neutral",
};

/* ─── Source-specific catalog data ────────────────────────── */
/* ─── Source-specific catalog data ────────────────────────── */
const PROVIDER_CATALOGS: Record<string, Song[]> = {
  youtube: [
    { name: "Buttabomma",       artist: "Armaan Malik",    genre: "Telugu Pop",  language: "Telugu",  source_provider: "YouTube", youtubeId: "A6BJ-PgNWXA", preview_url: "https://prod-1.storage.jamendo.com/download/track/1820491/mp32/" },
    { name: "Samajavaragamana", artist: "Sid Sriram",      genre: "Telugu Soul", language: "Telugu",  source_provider: "YouTube", youtubeId: "E3BnMDc9ATE", preview_url: "https://prod-1.storage.jamendo.com/download/track/1158428/mp32/" },
    { name: "Blinding Lights",  artist: "The Weeknd",      genre: "Synthpop",    language: "English", source_provider: "YouTube", youtubeId: "4NRXx6U8ABQ", preview_url: "https://prod-1.storage.jamendo.com/download/track/1880003/mp32/" },
    { name: "Ramuloo Ramulaa",  artist: "Anurag Kulkarni", genre: "Telugu Folk", language: "Telugu",  source_provider: "YouTube", youtubeId: "A6BJ-PgNWXA", preview_url: "https://prod-1.storage.jamendo.com/download/track/1532771/mp32/" },
    { name: "Ennenno Janmala",  artist: "Sid Sriram",      genre: "Telugu Soul", language: "Telugu",  source_provider: "YouTube", youtubeId: "_dXwkfq5YG8", preview_url: "https://prod-1.storage.jamendo.com/download/track/1849102/mp32/" },
    { name: "Kannazhaga",       artist: "Mohit Chauhan",   genre: "Tamil Soul",  language: "Tamil",   source_provider: "YouTube", youtubeId: "9oNvxVFsm5U", preview_url: "https://prod-1.storage.jamendo.com/download/track/1473953/mp32/" },
    { name: "Levitating",       artist: "Dua Lipa",        genre: "Pop",         language: "English", source_provider: "YouTube", youtubeId: "TUVcZfQe-Kw", preview_url: "https://prod-1.storage.jamendo.com/download/track/1689240/mp32/" },
  ],
  jamendo: [
    { name: "Midnight Synth Drive",  artist: "Solaris",      genre: "Synthwave",   language: "English", source_provider: "Jamendo", preview_url: "https://prod-1.storage.jamendo.com/download/track/1880003/mp32/" },
    { name: "Lofi Chill Ambient",   artist: "Acoustica",    genre: "Lo-Fi",       language: "English", source_provider: "Jamendo", preview_url: "https://prod-1.storage.jamendo.com/download/track/1473953/mp32/" },
    { name: "Acoustic Sunrise",     artist: "Elysium Duo",  genre: "Acoustic",    language: "English", source_provider: "Jamendo", preview_url: "https://prod-1.storage.jamendo.com/download/track/1158428/mp32/" },
    { name: "Neon Horizons",        artist: "Synth Explorer",genre: "Chillstep",  language: "English", source_provider: "Jamendo", preview_url: "https://prod-1.storage.jamendo.com/download/track/1789421/mp32/" },
    { name: "Deep Focus Drift",     artist: "Zenith Studio",genre: "Ambient",     language: "English", source_provider: "Jamendo", preview_url: "https://prod-1.storage.jamendo.com/download/track/18000124/mp32/" },
  ],
  local: [
    { name: "Local Disk Track 01", artist: "Local Artist", genre: "Unsorted", language: "English", source_provider: "Local", preview_url: "https://prod-1.storage.jamendo.com/download/track/1880003/mp32/" },
    { name: "Local Disk Track 02", artist: "Local Artist", genre: "Unsorted", language: "English", source_provider: "Local", preview_url: "https://prod-1.storage.jamendo.com/download/track/1473953/mp32/" },
    { name: "Local Disk Track 03", artist: "Local Artist", genre: "Unsorted", language: "English", source_provider: "Local", preview_url: "https://prod-1.storage.jamendo.com/download/track/1158428/mp32/" },
  ]
};

const key = (s: Song) => `${s.title || s.name}::${s.artist}`;

export default function MoodRoom() {
  const activeMood = useAppStore(s => s.activeMood);
  const setActiveMood = useAppStore(s => s.setActiveMood);
  const currentSong = useAppStore(s => s.currentSong);
  const setCurrentSong = useAppStore(s => s.setCurrentSong);
  const songsQueue = useAppStore(s => s.songsQueue);
  const setSongsQueue = useAppStore(s => s.setSongsQueue);
  const playerMode = useAppStore(s => s.playerMode);
  const setPlayerMode = useAppStore(s => s.setPlayerMode);

  const [camOpen, setCamOpen] = useState(true);
  const [isBioCollapsed, setIsBioCollapsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(38); // percentage
  const [currentTimeStr, setCurrentTimeStr] = useState("1:24");
  const [durationStr, setDurationStr] = useState("3:40");

  /* Subscribe to session orchestrator playback state */
  useEffect(() => {
    const unsub = sessionOrchestrator.subscribe((st) => {
      setIsPlaying(st.isPlaying);
      if (st.volume !== undefined) setVolume(st.volume);
      if (st.isMuted !== undefined) setIsMuted(st.isMuted);
    });
    return () => unsub();
  }, []);

  /* Synchronize catalog whenever playerMode or activeMood changes */
  useEffect(() => {
    let active = true;
    if (playerMode === 'jamendo') {
      const adapter = new JamendoProviderAdapter();
      adapter.searchCandidates({ moodLabel: activeMood } as any, undefined, 20).then((candidates) => {
        if (!active) return;
        if (candidates && candidates.length > 0) {
          const mapped: Song[] = candidates.map(c => ({
            id: c.id,
            name: c.title,
            title: c.title,
            artist: c.artist || c.artists[0] || 'Jamendo Artist',
            genre: c.genre || 'Jamendo CC',
            language: c.language || 'Instrumental',
            source_provider: 'Jamendo CC',
            preview_url: c.playbackRef,
            attributionText: c.attributionText,
          }));
          setSongsQueue(mapped);
          if (!currentSong || !mapped.some(s => key(s) === key(currentSong))) {
            setCurrentSong(mapped[0]);
          }
        }
      }).catch(() => {
        const catalog = PROVIDER_CATALOGS.jamendo;
        setSongsQueue(catalog);
      });
    } else {
      const catalog = PROVIDER_CATALOGS[playerMode] || PROVIDER_CATALOGS.youtube;
      setSongsQueue(catalog);
      if (!currentSong || !catalog.some(s => key(s) === key(currentSong))) {
        setCurrentSong(catalog[0]);
      }
    }
    return () => { active = false; };
  }, [playerMode, activeMood]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Continuous progress bar simulation */
  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        const next = prev + 0.5;
        const totalSec = 220; // 3:40
        const curSec = Math.floor((next / 100) * totalSec);
        const mins = Math.floor(curSec / 60);
        const secs = curSec % 60;
        setCurrentTimeStr(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isPlaying]);

  /* ── HTML5 Audio Element Integration ───────────────────────── */
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    audio.volume = isMuted ? 0 : volume / 100;
    
    const handleEnded = () => {
      handleSkipNext();
    };
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  const activeSong = currentSong || songsQueue[0] || PROVIDER_CATALOGS.jamendo[0];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeSong) return;
    const streamUrl = activeSong.preview_url || (activeSong as any).playbackRef || "https://prod-1.storage.jamendo.com/download/track/1880003/mp32/";

    if (audio.src !== streamUrl) {
      audio.src = streamUrl;
      if (isPlaying) {
        audio.play().catch(() => {
          setIsPlaying(false);
        });
      }
    }
  }, [activeSong]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDetect = (d: DetectionResult) => {
    if (!d || d.source === "manual" || !d.emotion) return;
    const norm = d.emotion.toLowerCase();
    if (MOODS.includes(norm) && norm !== activeMood) {
      setActiveMood(norm);
    }
  };

  const handleTogglePlay = () => {
    const audio = audioRef.current;
    sessionOrchestrator.togglePlayPause();
    
    if (isPlaying) {
      if (audio) audio.pause();
      setIsPlaying(false);
    } else {
      if (audio) {
        if (!audio.src) {
          const streamUrl = activeSong?.preview_url || (activeSong as any)?.playbackRef || "https://prod-1.storage.jamendo.com/download/track/1880003/mp32/";
          audio.src = streamUrl;
        }
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.warn("Audio play blocked:", err);
          setIsPlaying(false);
        });
      } else {
        setIsPlaying(true);
      }
    }
  };

  const handleSkipNext = () => {
    if (!songsQueue.length) return;
    const curIdx = songsQueue.findIndex(s => key(s) === key(currentSong || songsQueue[0]));
    const nextIdx = (curIdx + 1) % songsQueue.length;
    setCurrentSong(songsQueue[nextIdx]);
    sessionOrchestrator.skipNext();
  };

  const handleSkipPrev = () => {
    if (!songsQueue.length) return;
    const curIdx = songsQueue.findIndex(s => key(s) === key(currentSong || songsQueue[0]));
    const prevIdx = (curIdx - 1 + songsQueue.length) % songsQueue.length;
    setCurrentSong(songsQueue[prevIdx]);
  };
  const songTitle = activeSong?.title || activeSong?.name || "Music Mirror Audio";
  const songArtist = activeSong?.artist || "AI Recommended";
  const songLang = activeSong?.language || "English";
  const moodColor = MOOD_COLOR[activeMood] || "#D4AF37";

  return (
    <div className="pr-root" style={{ background: "#060606", minHeight: "100vh", position: "relative" }}>

      {/* ── Top Header Bar ── */}
      <header className="room-nav" style={{
        borderBottom: "1px solid var(--glass-border)",
        background: "rgba(9,9,9,0.92)",
        backdropFilter: "blur(24px)",
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center",
        padding: "0 40px", height: 64,
      }}>
        <div className="room-brand">
          <Disc size={18} style={{ color: "var(--gold)" }} />
          <span className="room-brand-name font-brand">Music Mirror</span>
          <span className="room-brand-v2" style={{ marginLeft: 6, fontSize: "0.7rem", fontWeight: 600, color: "var(--text-3)", background: "rgba(212,175,55,0.08)", padding: "2px 8px", borderRadius: "999px", border: "1px solid rgba(212,175,55,0.15)" }}>
            STUDIO
          </span>
        </div>

        {/* Source Provider Dropdown */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, background: "rgba(20,20,20,0.85)", border: "1px solid var(--glass-border)", borderRadius: "999px", padding: "4px 14px" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Source</span>
          <select
            value={playerMode}
            onChange={e => setPlayerMode(e.target.value as any)}
            style={{
              background: "#121212",
              border: "1px solid rgba(212,175,55,0.25)",
              color: "var(--gold)",
              fontSize: "0.78rem",
              fontWeight: 700,
              borderRadius: "999px",
              padding: "4px 26px 4px 12px",
              outline: "none",
              cursor: "pointer",
              appearance: "none",
              WebkitAppearance: "none",
              MozAppearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23D4AF37' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 9px center",
            }}
          >
            <option value="youtube" style={{ background: "#141414", color: "#FFFFFF" }}>YouTube Engine</option>
            <option value="jamendo" style={{ background: "#141414", color: "#FFFFFF" }}>Jamendo CC (Royalty-Free)</option>
            <option value="local" style={{ background: "#141414", color: "#FFFFFF" }}>Local Audio Disk</option>
          </select>
        </div>
      </header>

      {/* ── 3-Column Studio Viewport Layout ── */}
      <div className="studio-layout">

        {/* LEFT: Biometric Input Panel */}
        <aside className="studio-acoustic-panel studio-wood-trim studio-speaker-glow" style={{ width: isBioCollapsed ? 76 : "100%", transition: "all 0.35s ease" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            {!isBioCollapsed && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="lp-pulse-dot" />
                <h3 style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-2)", margin: 0 }}>
                  Biometric Input
                </h3>
              </div>
            )}
            <button
              onClick={() => setIsBioCollapsed(!isBioCollapsed)}
              title={isBioCollapsed ? "Expand Panel" : "Collapse Panel"}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)", borderRadius: "999px", padding: "4px 8px", color: "var(--text-3)", cursor: "pointer", fontSize: "0.7rem", marginLeft: "auto" }}
            >
              {isBioCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          {!isBioCollapsed ? (
            <>
              {/* Camera Frame */}
              <div style={{ borderRadius: "var(--r-16)", overflow: "hidden", background: "#000", border: "1px solid var(--glass-border)", position: "relative", marginBottom: 16 }}>
                {camOpen ? (
                  <Camera onEmotion={handleDetect} />
                ) : (
                  <div style={{ height: 130, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", color: "var(--text-3)" }}>
                    Camera suspended
                  </div>
                )}
                <button
                  onClick={() => setCamOpen(!camOpen)}
                  style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.65)", border: "1px solid var(--glass-border)", borderRadius: "999px", padding: "4px 10px", fontSize: "0.68rem", color: "#fff", cursor: "pointer", backdropFilter: "blur(6px)" }}
                >
                  {camOpen ? "Suspend" : "Enable"}
                </button>
              </div>

              {/* Detected Emotion Card */}
              <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--r-16)", padding: "12px 14px", marginBottom: 16 }}>
                <div style={{ fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 3 }}>Detected Facial State</div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: moodColor }}>{MOOD_LABEL[activeMood] || activeMood}</div>
              </div>

              {/* Manual Override List */}
              <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: 14, overflowY: "auto", flex: 1, maxHeight: "calc(100vh - 380px)", paddingRight: 4 }}>
                <div style={{ fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 8 }}>
                  Manual Mood Override
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {MOODS.map(m => (
                    <button
                      key={m}
                      onClick={() => setActiveMood(m)}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 12px", borderRadius: "var(--r-12)",
                        border: "1px solid transparent",
                        background: activeMood === m ? "rgba(255,255,255,0.04)" : "transparent",
                        color: activeMood === m ? MOOD_COLOR[m] || "var(--gold)" : "var(--text-2)",
                        fontSize: "0.8rem", fontWeight: activeMood === m ? 700 : 500,
                        cursor: "pointer", textAlign: "left", transition: "var(--spring-transition)",
                      }}
                    >
                      <span>{MOOD_LABEL[m]}</span>
                      {activeMood === m && <span style={{ width: 6, height: 6, borderRadius: "50%", background: MOOD_COLOR[m] }} />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Compact Collapsed Mode */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginTop: 20 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: moodColor, boxShadow: `0 0 10px ${moodColor}` }} />
              <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: "0.78rem", fontWeight: 800, color: moodColor, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {activeMood}
              </div>
            </div>
          )}
        </aside>

        {/* CENTER: Main Studio Music Player Stage */}
        <main style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 12px" }}>
          
          <div className="panel" style={{
            width: "100%", maxWidth: 620,
            background: "rgba(18,18,18,0.75)",
            backdropFilter: "blur(32px)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--r-32)",
            padding: "32px 36px",
            display: "flex", flexDirection: "column", alignItems: "center",
            boxShadow: `0 24px 80px rgba(0,0,0,0.8), 0 0 60px ${moodColor}18`,
            position: "relative",
            overflow: "hidden",
          }}>

            {/* Background Mood Light Leak */}
            <div style={{
              position: "absolute", top: "-20%", left: "20%", right: "20%", height: "50%",
              background: `radial-gradient(ellipse at center, ${moodColor}25 0%, transparent 70%)`,
              pointerEvents: "none", filter: "blur(40px)"
            }} />

            {/* Top Match Badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, zIndex: 2 }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.25)", padding: "4px 14px", borderRadius: "999px", display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={12} />
                98% Emotion Match · {MOOD_LABEL[activeMood]}
              </span>
            </div>

            {/* Center Spinning CD Visualizer */}
            <div style={{ position: "relative", margin: "10px 0 28px", zIndex: 2 }}>
              <CDDisc size={200} spinning={isPlaying} moodColor={moodColor} />
              
              {/* Animated Live Equalizer Overlay when playing */}
              {isPlaying && (
                <div style={{ position: "absolute", bottom: -12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4, background: "rgba(9,9,9,0.85)", padding: "6px 14px", borderRadius: "999px", border: "1px solid var(--glass-border)", backdropFilter: "blur(12px)" }}>
                  {[0.4, 0.7, 1.0, 0.6, 0.8].map((delay, idx) => (
                    <span key={idx} style={{
                      width: 3, height: 16, borderRadius: 2, background: moodColor,
                      animation: `bg-bar ${0.6 + delay * 0.3}s ease-in-out infinite alternate`,
                    }} />
                  ))}
                </div>
              )}
            </div>

            {/* Song Metadata Lockup */}
            <div style={{ textAlign: "center", marginBottom: 24, zIndex: 2, maxWidth: "100%" }}>
              <h2 className="font-brand" style={{ fontSize: "1.7rem", fontWeight: 800, color: "var(--text-1)", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {songTitle}
              </h2>
              <div style={{ fontSize: "0.95rem", color: "var(--text-2)", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <span>{songArtist}</span>
                <span style={{ color: "var(--text-4)" }}>•</span>
                <span style={{ fontSize: "0.72rem", color: "var(--gold)", border: "1px solid var(--gold-border)", padding: "1px 8px", borderRadius: "999px" }}>
                  {songLang}
                </span>
              </div>
            </div>

            {/* Progress Seek Bar */}
            <div style={{ width: "100%", marginBottom: 24, zIndex: 2 }}>
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = ((e.clientX - rect.left) / rect.width) * 100;
                  setProgress(pct);
                }}
                style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, cursor: "pointer", position: "relative", overflow: "hidden" }}
              >
                <div style={{ height: "100%", background: `linear-gradient(90deg, var(--gold), ${moodColor})`, width: `${progress}%`, borderRadius: 3, transition: "width 0.2s linear" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: "0.72rem", color: "var(--text-3)", fontFamily: "JetBrains Mono, monospace" }}>
                <span>{currentTimeStr}</span>
                <span>{durationStr}</span>
              </div>
            </div>

            {/* Primary Metallic Controls Row */}
            <div style={{ display: "flex", alignItems: "center", gap: 24, zIndex: 2 }}>
              
              {/* Prev */}
              <button
                onClick={handleSkipPrev}
                aria-label="Previous Song"
                style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)", color: "var(--text-1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "var(--spring-transition)" }}
              >
                <SkipBack size={18} />
              </button>

              {/* Play/Pause Main Button */}
              <button
                onClick={handleTogglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: `linear-gradient(135deg, var(--gold), ${moodColor})`,
                  color: "#050505", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 0 32px ${moodColor}66, 0 8px 24px rgba(0,0,0,0.5)`,
                  transition: "var(--spring-transition)",
                  transform: "scale(1)",
                }}
              >
                {isPlaying ? <Pause size={26} fill="#050505" /> : <Play size={26} fill="#050505" style={{ marginLeft: 3 }} />}
              </button>

              {/* Next */}
              <button
                onClick={handleSkipNext}
                aria-label="Next Song"
                style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)", color: "var(--text-1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "var(--spring-transition)" }}
              >
                <SkipForward size={18} />
              </button>

            </div>

            {/* Secondary Controls Bar: Volume & Re-sync */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 24, zIndex: 2, width: "100%", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => {
                    const nextMute = !isMuted;
                    setIsMuted(nextMute);
                    sessionOrchestrator.setMute(nextMute);
                  }}
                  style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer" }}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    setIsMuted(v === 0);
                    sessionOrchestrator.setVolume(v);
                  }}
                  style={{ width: 80, height: 4, accentColor: "var(--gold)", cursor: "pointer" }}
                />
              </div>

              <button
                onClick={() => handleDetect({ emotion: activeMood, confidence: 0.95, scores: [[activeMood, 0.95]], source: "manual" })}
                style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-2)", background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", padding: "6px 14px", borderRadius: "999px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                <RefreshCw size={12} /> Re-sync Mood Match
              </button>
            </div>

          </div>

        </main>

        {/* RIGHT: Up Next Queue Panel */}
        <aside className="studio-acoustic-panel studio-speaker-glow">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexShrink: 0 }}>
            <div>
              <h3 style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-2)", margin: 0 }}>
                Up Next Queue
              </h3>
              <div style={{ fontSize: "0.68rem", color: "var(--text-3)", marginTop: 2 }}>{songsQueue.length} Tracks · {playerMode.toUpperCase()}</div>
            </div>
            <span style={{ fontSize: "0.68rem", color: "var(--gold)", fontWeight: 700, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.25)", padding: "3px 10px", borderRadius: "999px" }}>
              Auto-Play
            </span>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1, paddingRight: 4 }}
            className="studio-queue-scroll"
          >
            {songsQueue.map((song, i) => {
              const isActive = currentSong ? key(song) === key(currentSong) : i === 0;
              const title = song.title || song.name || "Unknown";
              return (
                <div
                  key={i}
                  onClick={() => setCurrentSong(song)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: "var(--r-16)",
                    background: isActive ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.015)",
                    border: "1px solid",
                    borderColor: isActive ? "var(--gold)" : "var(--glass-border)",
                    cursor: "pointer", transition: "var(--spring-transition)",
                    boxShadow: isActive ? "0 4px 20px rgba(212,175,55,0.15)" : "none",
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "var(--r-12)",
                    background: isActive ? "linear-gradient(135deg, #D4AF37, #A855F7)" : "rgba(255,255,255,0.04)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.85rem", fontWeight: 800, color: isActive ? "#000" : "var(--text-2)",
                    flexShrink: 0
                  }}>
                    {isActive ? <Music size={16} /> : title[0]?.toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.84rem", fontWeight: 700, color: isActive ? "var(--gold)" : "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {title}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {song.artist}
                    </div>
                  </div>

                  {isActive ? (
                    <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "var(--gold)", background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)", padding: "2px 8px", borderRadius: "999px", flexShrink: 0, letterSpacing: "0.05em" }}>
                      PLAYING
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.66rem", color: "var(--text-3)", background: "rgba(255,255,255,0.03)", padding: "2px 7px", borderRadius: "999px", flexShrink: 0 }}>
                      {song.language || "Pop"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {/* ── Floating Bottom Navigation Pill ── */}
      <nav className="studio-nav-bar">
        <Link to="/" className="studio-nav-item">Discover</Link>
        <Link to="/room" className="studio-nav-item active">Room</Link>
        <Link to="/profile" className="studio-nav-item">Profile</Link>
        <Link to="/dashboard" className="studio-nav-item">AI Lab</Link>
      </nav>

      <style>{`
        .studio-queue-scroll::-webkit-scrollbar { width: 4px; }
        .studio-queue-scroll::-webkit-scrollbar-track { background: transparent; }
        .studio-queue-scroll::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.25); border-radius: 4px; }
        .room-brand { display: flex; align-items: center; gap: 8px; font-size: 1rem; font-weight: 800; color: var(--text-1); }
        .room-brand-name { letter-spacing: -0.02em; }
        @keyframes bg-bar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1);   }
        }
      `}</style>
    </div>
  );
}
