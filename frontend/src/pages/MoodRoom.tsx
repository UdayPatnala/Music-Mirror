// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAppStore } from "../store/useAppStore";
import type { Song } from "../types";
import Camera from "../components/Camera";
import { Disc } from "lucide-react";

const MOODS = ["happy", "neutral", "sad", "angry", "surprise"] as const;

const MOOD_LABEL: Record<string, string> = {
  happy: "Happy",
  sad: "Reflective",
  angry: "Intense",
  neutral: "Calm",
  surprise: "Surprised",
};

const MOOD_COLOR: Record<string, string> = {
  happy: "#D4AF37",
  sad: "#2563EB",
  angry: "#B91C1C",
  neutral: "#7E22CE",
  surprise: "#16A34A",
};

const FALLBACK: Song[] = [
  { title: "Buttabomma",       artist: "Armaan Malik",    genre: "Telugu Pop",  language: "Telugu",  source_provider: "YouTube", youtubeId: "A6BJ-PgNWXA" },
  { title: "Samajavaragamana", artist: "Sid Sriram",      genre: "Telugu Soul", language: "Telugu",  source_provider: "Spotify", youtubeId: "E3BnMDc9ATE" },
  { title: "Ennenno Janmala",  artist: "Sid Sriram",      genre: "Telugu Soul", language: "Telugu",  source_provider: "JioSaavn", youtubeId: "_dXwkfq5YG8" },
  { title: "Blinding Lights",  artist: "The Weeknd",      genre: "Synthpop",    language: "English", source_provider: "YouTube", youtubeId: "4NRXx6U8ABQ" },
  { title: "Kannazhaga",       artist: "Mohit Chauhan",   genre: "Tamil Soul",  language: "Tamil",   source_provider: "YouTube", youtubeId: "9oNvxVFsm5U" },
  { title: "Levitating",       artist: "Dua Lipa",        genre: "Pop",         language: "English", source_provider: "Spotify", youtubeId: "TUVcZfQe-Kw" },
];

function key(s: Song): string { return `${s.title || s.name}::${s.artist}`; }

export default function MoodRoom() {
  const profile = useAppStore(s => s.profile);
  const currentSong = useAppStore(s => s.currentSong);
  const setCurrentSong = useAppStore(s => s.setCurrentSong);
  const activeMood = useAppStore(s => s.activeMood);
  const setActiveMood = useAppStore(s => s.setActiveMood);
  const songsQueue = useAppStore(s => s.songsQueue);
  const setSongsQueue = useAppStore(s => s.setSongsQueue);
  const playerMode = useAppStore(s => s.playerMode);
  const setPlayerMode = useAppStore(s => s.setPlayerMode);

  const [camOpen, setCamOpen] = useState(true);

  const activeProfile = useMemo(() => profile ?? {
    name: "Guest Listener",
    email: "guest@musicmirror.ai",
    genre: "Pop",
    goal: "Match my mood",
    languages: ["Telugu", "English", "Tamil", "Hindi"],
  }, [profile]);

  useEffect(() => {
    let dead = false;
    const load = async () => {
      try {
        const res = await apiClient.post("/recommend", {
          emotion: activeMood,
          genre: activeProfile.genre,
          goal: activeProfile.goal,
          languages: activeProfile.languages,
        });
        if (dead) return;
        const list: Song[] = Array.isArray(res.data.songs) ? res.data.songs : [];
        const resolved = list.length ? list : FALLBACK;
        setSongsQueue(resolved);
        if (!currentSong) setCurrentSong(resolved[0]);
      } catch {
        if (dead) return;
        setSongsQueue(FALLBACK);
        if (!currentSong) setCurrentSong(FALLBACK[0]);
      }
    };
    load();
    return () => { dead = true; };
  }, [activeMood, activeProfile, setSongsQueue, setCurrentSong, currentSong]);

  const handleDetect = useCallback((d: any) => {
    if (d.source === "manual") return;
    if (d.emotion && d.emotion !== activeMood) {
      setActiveMood(d.emotion);
    }
  }, [activeMood, setActiveMood]);

  const moodColor = MOOD_COLOR[activeMood] || MOOD_COLOR.neutral;

  return (
    <div
      className="pr-root"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        position: "relative",
      }}
    >
      {/* Dynamic ambient mood glow */}
      <div
        style={{
          position: "fixed", inset: 0, pointerEvents: "none",
          background: `radial-gradient(circle 800px at 50% 30%, ${moodColor}12, transparent 80%)`,
          transition: "background 1.5s ease",
        }}
      />

      {/* ── Top Navbar ── */}
      <header className="room-nav" style={{ borderBottom: "1px solid var(--glass-border)", background: "rgba(9,9,9,0.92)", backdropFilter: "blur(24px)", position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", padding: "0 40px", height: 64 }}>
        <div className="room-brand">
          <Disc size={18} style={{ color: "var(--gold)" }} />
          <span className="room-brand-name">Music Mirror</span>
          <span className="room-brand-v2" style={{ marginLeft: 6, fontSize: "0.7rem", fontWeight: 600, color: "var(--text-3)", background: "rgba(212,175,55,0.08)", padding: "2px 8px", borderRadius: "999px", border: "1px solid rgba(212,175,55,0.15)" }}>Studio</span>
        </div>
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

      {/* ── 3-Column Studio Layout ── */}
      <div className="studio-layout">

        {/* LEFT: Emotion Panel */}
        <aside className="studio-acoustic-panel studio-wood-trim studio-speaker-glow">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <span className="lp-pulse-dot" />
            <h3 style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-2)", margin: 0 }}>
              Biometric Input
            </h3>
          </div>

          {/* Camera */}
          <div style={{ borderRadius: "var(--r-16)", overflow: "hidden", background: "#000", border: "1px solid var(--glass-border)", position: "relative", marginBottom: 20 }}>
            {camOpen ? (
              <Camera onEmotion={handleDetect} />
            ) : (
              <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "var(--text-3)" }}>
                Camera suspended
              </div>
            )}
            <button
              onClick={() => setCamOpen(!camOpen)}
              style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "1px solid var(--glass-border)", borderRadius: "999px", padding: "4px 10px", fontSize: "0.68rem", color: "#fff", cursor: "pointer" }}
            >
              {camOpen ? "Suspend" : "Enable"}
            </button>
          </div>

          {/* Detected emotion label */}
          <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--r-16)", padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 4 }}>Detected Emotion</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: moodColor }}>{MOOD_LABEL[activeMood] || activeMood}</div>
          </div>

          {/* Manual override buttons */}
          <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: 16 }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 10 }}>
              Manual Override
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {MOODS.map(m => (
                <button
                  key={m}
                  onClick={() => setActiveMood(m)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "9px 12px", borderRadius: "var(--r-12)",
                    border: "1px solid transparent",
                    background: activeMood === m ? "rgba(255,255,255,0.03)" : "transparent",
                    color: activeMood === m ? "var(--gold)" : "var(--text-2)",
                    fontSize: "0.82rem", fontWeight: activeMood === m ? 700 : 500,
                    cursor: "pointer", textAlign: "left", transition: "var(--spring-transition)",
                  }}
                >
                  <span>{MOOD_LABEL[m]}</span>
                  {activeMood === m && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)" }} />}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTER: Placeholder for GlobalPlayerHost docked card */}
        <section style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start" }}>
          {/* GlobalPlayerHost.state-room mounts here absolutely via fixed positioning */}
          <div style={{ width: 560, height: 560 }} />
        </section>

        {/* RIGHT: Queue Panel */}
        <aside className="studio-acoustic-panel studio-speaker-glow">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-2)", margin: 0 }}>
              Up Next
            </h3>
            <span style={{ fontSize: "0.72rem", color: "var(--gold)", fontWeight: 700 }}>
              {songsQueue.length} Tracks
            </span>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", maxHeight: "calc(100vh - 260px)" }}
            className="studio-queue-scroll"
          >
            {songsQueue.map((song, i) => {
              const isActive = currentSong ? key(song) === key(currentSong) : false;
              const title = song.title || song.name || "Unknown";
              return (
                <div
                  key={i}
                  onClick={() => setCurrentSong(song)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: "var(--r-16)",
                    background: isActive ? "var(--glass-bg)" : "rgba(255,255,255,0.01)",
                    border: "1px solid",
                    borderColor: isActive ? "var(--gold)" : "var(--glass-border)",
                    cursor: "pointer", transition: "var(--spring-transition)",
                  }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: "var(--r-12)", background: isActive ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", fontWeight: 800, color: isActive ? "var(--gold)" : "var(--text-2)", flexShrink: 0 }}>
                    {title[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.84rem", fontWeight: 700, color: isActive ? "var(--gold)" : "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.artist}</div>
                  </div>
                  <span style={{ fontSize: "0.66rem", color: "var(--text-3)", background: "rgba(255,255,255,0.03)", padding: "2px 7px", borderRadius: "999px", flexShrink: 0 }}>
                    {song.language || "Pop"}
                  </span>
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
        .studio-queue-scroll::-webkit-scrollbar { width: 3px; }
        .studio-queue-scroll::-webkit-scrollbar-track { background: transparent; }
        .studio-queue-scroll::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 2px; }
        .room-brand { display: flex; align-items: center; gap: 8px; font-size: 1rem; font-weight: 800; color: var(--text-1); }
        .room-brand-name { letter-spacing: -0.02em; }
      `}</style>
    </div>
  );
}
