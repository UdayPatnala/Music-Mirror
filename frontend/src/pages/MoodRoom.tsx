import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "../api/client";
import { useAppStore } from "../store/useAppStore";
import { sendTelemetry } from "../api/telemetry";
import type { Song } from "../types";
import { emotionLabels } from "../components/EmotionCard";
import NowPlaying from "../components/NowPlaying";
import SongCard from "../components/SongCard";
import Camera from "../components/Camera";
import LocalFileExplorer from "../components/LocalFileExplorer";

/* ─── Mood metadata ─────────────────────────────────────────── */
const MOOD: Record<string, { emoji: string; glow: string }> = {
  happy:     { emoji: "😊", glow: "rgba(245,158,11,0.25)"  },
  sad:       { emoji: "😔", glow: "rgba(59,130,246,0.25)"  },
  angry:     { emoji: "😤", glow: "rgba(239,68,68,0.25)"   },
  neutral:   { emoji: "😐", glow: "rgba(139,92,246,0.25)"  },
  surprise:  { emoji: "😲", glow: "rgba(6,182,212,0.25)"   },
  surprised: { emoji: "😲", glow: "rgba(6,182,212,0.25)"   },
  fearful:   { emoji: "😔", glow: "rgba(59,130,246,0.25)"  },
  disgusted: { emoji: "😤", glow: "rgba(239,68,68,0.25)"   },
};

const getMoodMeta = (m: string) => MOOD[m] || MOOD.neutral;

const MOODS = ["happy", "neutral", "sad", "angry", "surprise"];

const FALLBACK: Song[] = [
  { title: "Buttabomma",       artist: "Armaan Malik",      genre: "Telugu Pop",  language: "Telugu"  },
  { title: "Samajavaragamana", artist: "Sid Sriram",        genre: "Telugu Soul", language: "Telugu"  },
  { title: "Blinding Lights",  artist: "The Weeknd",        genre: "Synthpop",   language: "English" },
  { title: "Ennenno Janmala",  artist: "Sid Sriram",        genre: "Telugu Soul", language: "Telugu"  },
  { title: "As It Was",        artist: "Harry Styles",      genre: "Indie Pop",  language: "English" },
  { title: "Kannazhaga",       artist: "Mohit Chauhan",     genre: "Tamil Soul",  language: "Tamil"   },
  { title: "Levitating",       artist: "Dua Lipa",          genre: "Pop",        language: "English" },
];

function key(s: any) { return `${s.title || s.name}::${s.artist}`; }

function stable(batch: any[]): string {
  const c: Record<string, number> = {};
  batch.forEach(({ emotion }) => { c[emotion] = (c[emotion] || 0) + 1; });
  const t = Object.entries(c).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
  return (!t || t[1] === 1) ? batch[batch.length - 1].emotion : t[0];
}

/* ─── Component ─────────────────────────────────────────────── */
export default function MoodRoom() {
  const profile     = useAppStore((s) => s.profile);
  const clearProfile = useAppStore((s) => s.clearProfile);

  const [emotion,  setEmotion]  = useState<any>({ emotion: "", confidence: 0, scores: [], source: "camera" });
  const [mood,     setMood]     = useState("happy");
  const [songs,    setSongs]    = useState<Song[]>([]);
  const [current,  setCurrent]  = useState<Song | null>(null);
  const [mode,     setMode]     = useState("youtube");
  const [status,   setStatus]   = useState<"idle"|"loading"|"done">("idle");
  const [camOpen,  setCamOpen]  = useState(true);
  const [showLocal, setShowLocal] = useState(false);
  const [pending,  setPending]  = useState<string | null>(null);
  const [waking,   setWaking]   = useState(false);
  const [favs,     setFavs]     = useState<Song[]>([]);

  const batchRef = useRef<any[]>([]);
  const BATCH = 3;

  // Stable profile object — must not re-create on every render or the
  // useEffect([mood, activeProfile]) dependency fires an infinite fetch loop.
  const activeProfile = useMemo(() => profile ?? {
    name: "Guest Listener",
    email: "guest@musicmirror.ai",
    genre: "Pop",
    goal: "Match my mood",
    languages: ["Telugu", "English", "Tamil", "Hindi"],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.name, profile?.genre, profile?.goal, JSON.stringify(profile?.languages)]);

  /* fetch recommendations */
  useEffect(() => {
    let dead = false;
    let t: ReturnType<typeof setTimeout>;

    const go = async () => {
      setStatus("loading");
      t = setTimeout(() => { if (!dead) setWaking(true); }, 2500);
      try {
        const res = await apiClient.post("/recommend", {
          emotion: mood, genre: activeProfile.genre, goal: activeProfile.goal,
          languages: activeProfile.languages,
        });
        clearTimeout(t);
        if (dead) return;
        setWaking(false);
        const list: Song[] = Array.isArray(res.data.songs) ? res.data.songs : [];
        const resolved = list.length ? list : FALLBACK;
        setSongs(resolved);
        // Guard: c may be null on first load — don't call key(null)
        setCurrent(c => c && resolved.some(s => key(s) === key(c)) ? c : resolved[0]);
        setStatus("done");
        if (list[0]) sendTelemetry("recommendation_success", list[0].title, mood);
      } catch {
        clearTimeout(t);
        if (dead) return;
        setWaking(false);
        setSongs(FALLBACK);
        setCurrent(FALLBACK[0]);
        setStatus("done");
      }
    };
    go();
    return () => { dead = true; clearTimeout(t); };
  }, [mood, activeProfile]);

  const onDetect = useCallback((d: any) => {
    setEmotion(d);
    if (d.source === "manual") return;
    const b = [...batchRef.current, d];
    batchRef.current = b;
    if (b.length >= BATCH) {
      const s = stable(b);
      batchRef.current = [];
      if (s !== mood) setPending(s);
    }
  }, [mood]);

  const pickMood = (m: string) => {
    setEmotion({ emotion: m, confidence: 1, scores: [[m, 1]], source: "manual" });
    setPending(null);
    batchRef.current = [];
    setMood(m);
  };

  const toggleFav = useCallback((song: Song) => {
    const k = key(song);
    setFavs(f => f.some(x => key(x) === k)
      ? f.filter(x => key(x) !== k)
      : [song, ...f].slice(0, 20));
  }, []);

  const moodMeta = getMoodMeta(mood);
  const moodLabel = emotionLabels[mood] || mood;
  const confidence = Math.round((emotion.confidence || 0) * 100);

  return (
    <div className={`room-root ambient-mood-${mood}`}>
      {/* Ambient glow */}
      <div className="room-glow" style={{ background: moodMeta.glow }} />

      {/* ── NAV ─────────────────────────────────────────── */}
      <header className="room-nav">
        <div className="room-brand">
          <span className="room-brand-icon">🪞</span>
          <span className="room-brand-name">Music Mirror</span>
          <span className="room-brand-v2">V2</span>
        </div>

        <nav className="room-nav-tabs">
          <button
            className={`room-nav-tab ${!showLocal ? "active" : ""}`}
            onClick={() => setShowLocal(false)}
          >
            Music Room
          </button>
          <button
            className={`room-nav-tab ${showLocal ? "active" : ""}`}
            onClick={() => setShowLocal(true)}
          >
            Local Files
          </button>
        </nav>

        <div className="room-nav-end">
          <Link to="/profile" className="room-nav-link">👤 Profile</Link>
          <Link to="/summary" className="room-nav-link">📊 Summary</Link>
          <button className="room-nav-exit" onClick={clearProfile} title="Sign out">→</button>
        </div>
      </header>

      {/* ── SERVER WAKING ───────────────────────────────── */}
      <AnimatePresence>
        {waking && (
          <motion.div className="room-wake-bar"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <span className="room-wake-dot" />
            AI server waking up — takes ~30s on first load (Render free tier)
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PENDING MOOD NUDGE ──────────────────────────── */}
      <AnimatePresence>
        {pending && (
          <motion.div className="room-nudge"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <span>{getMoodMeta(pending).emoji} New mood detected: <strong>{emotionLabels[pending] || pending}</strong></span>
            <button onClick={() => { setMood(pending!); setPending(null); }}>Switch</button>
            <button className="room-nudge-dismiss" onClick={() => setPending(null)}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LOCAL EXPLORER ──────────────────────────────── */}
      {showLocal && (
        <main className="room-local">
          <LocalFileExplorer onPlayTrack={(t: any) => {
            setCurrent({ title: t.name, artist: t.artist, preview_url: t.preview_url, source: t.source });
            setShowLocal(false);
          }} />
        </main>
      )}

      {/* ── MUSIC ROOM ──────────────────────────────────── */}
      {!showLocal && (
        <main className="room-body">

          {/* ── STAGE (left, primary) ─────────────────── */}
          <section className="room-stage">
            {/* Mood status pill */}
            <div className="room-mood-status">
              <span className="room-mood-emoji">{moodMeta.emoji}</span>
              <span className="room-mood-label">{moodLabel}</span>
              {emotion.source === "camera" && confidence > 0 && (
                <span className="room-mood-conf">{confidence}% confidence</span>
              )}
              {status === "loading" && <span className="room-loading-ring" />}
            </div>

            {/* Now Playing — the hero */}
            <div className="room-player-wrap">
              <NowPlaying
                activeMood={mood}
                activeMoodLabel={moodLabel}
                onPlayerModeChange={setMode}
                playerMode={mode}
                requestState={status === "loading" ? "loading" : "success"}
                song={current}
              />
            </div>

            {/* Mood selector strip */}
            <div className="room-mood-strip">
              <span className="room-strip-label">Mood</span>
              {MOODS.map((m) => (
                <button
                  key={m}
                  className={`room-mood-btn ${mood === m ? "active" : ""}`}
                  onClick={() => pickMood(m)}
                  title={emotionLabels[m] || m}
                >
                  <span>{MOOD[m].emoji}</span>
                  <span className="room-mood-btn-label">{emotionLabels[m] || m}</span>
                </button>
              ))}
              <div className="room-strip-divider" />
              <button
                className={`room-cam-toggle ${camOpen ? "active" : ""}`}
                onClick={() => setCamOpen(v => !v)}
                title="Toggle camera"
              >
                📷
              </button>
            </div>
          </section>

          {/* ── PANEL (right) ─────────────────────────── */}
          <aside className="room-panel">

            {/* Camera (collapsible) */}
            <AnimatePresence>
              {camOpen && (
                <motion.div
                  className="room-cam-section"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="room-cam-header">
                    <span className="room-cam-live-dot" />
                    <span>Live Detection</span>
                  </div>
                  <div className="room-cam-wrap">
                    <Camera onEmotion={onDetect} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Queue */}
            <div className="room-queue">
              <div className="room-queue-header">
                <h3 className="room-queue-title">Up Next</h3>
                {status === "done" && (
                  <span className="room-queue-count">{songs.length}</span>
                )}
              </div>

              {status === "loading" ? (
                <div className="room-skeletons">
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} className="room-skeleton">
                      <div className="room-skeleton-art" />
                      <div className="room-skeleton-lines">
                        <div style={{ width: `${55 + i * 7}%` }} className="room-skeleton-line" />
                        <div style={{ width: "40%" }} className="room-skeleton-line room-skeleton-line--sm" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="room-queue-list">
                  {songs.map((song) => (
                    <SongCard
                      key={key(song)}
                      isActive={current ? key(song) === key(current) : false}
                      isFavorite={favs.some(f => key(f) === key(song))}
                      onPlay={setCurrent}
                      onToggleFavorite={toggleFav}
                      song={song}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}
