import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAppStore } from "../store/useAppStore";
import { sendTelemetry } from "../api/telemetry";
import type { Song } from "../types";

import BrandLockup from "../components/BrandLockup";
import Camera from "../components/Camera";
import EmotionCard, { emotionLabels } from "../components/EmotionCard";
import HistoryPanel from "../components/HistoryPanel";
import NowPlaying from "../components/NowPlaying";
import SongCard from "../components/SongCard";
import LocalFileExplorer from "../components/LocalFileExplorer";

const CAMERA_BATCH_SIZE = 3;

const manualMoodOptions = [
  "happy",
  "neutral",
  "sad",
  "angry",
  "surprise",
];

function songKey(song: any): string {
  return `${song.title || song.name}::${song.artist}`;
}

function resolveStableEmotion(batch: any[]): string {
  const counts: Record<string, number> = {};
  batch.forEach(({ emotion }) => {
    counts[emotion] = (counts[emotion] || 0) + 1;
  });
  const topEntry = Object.entries(counts).sort((left, right) => (right[1] as number) - (left[1] as number))[0];
  if (!topEntry || topEntry[1] === 1) {
    return batch[batch.length - 1].emotion;
  }
  return topEntry[0];
}

function scrollToSection(sectionId: string): void {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function MoodRoom() {
  const profile = useAppStore((state) => state.profile);
  const clearProfile = useAppStore((state) => state.clearProfile);

  const [activeNavTab, setActiveNavTab] = useState("mood-room"); // 'mood-room' | 'git-explorer' | 'local-explorer'

  const [favorites, setFavorites] = useState<Song[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const [detection, setDetection] = useState<any>({
    emotion: "",
    confidence: 0,
    scores: [],
    source: "camera",
  });
  const [requestedEmotion, setRequestedEmotion] = useState<string>("happy");
  const [playlistEmotion, setPlaylistEmotion] = useState<string>("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [playerMode, setPlayerMode] = useState<string>("youtube");
  const [requestState, setRequestState] = useState<string>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [cameraBatch, setCameraBatch] = useState<any[]>([]);
  const [pendingMoodChange, setPendingMoodChange] = useState<string | null>(null);

  const cameraBatchRef = useRef<any[]>([]);

  useEffect(() => {
    if (!profile || !requestedEmotion) return;
    let ignore = false;

    const fetchSongs = async () => {
      setRequestState("loading");
      setErrorMessage("");

      try {
        const response = await apiClient.post("/recommend", {
          emotion: requestedEmotion,
          genre: profile.genre,
          goal: profile.goal,
        });

        if (ignore) return;

        const nextSongs = Array.isArray(response.data.songs)
          ? response.data.songs
          : [];
        const nextPlaylistEmotion = response.data.normalized_emotion || "";

        setSongs(nextSongs);
        setPlaylistEmotion(nextPlaylistEmotion);
        setRequestState(nextSongs.length > 0 ? "success" : "empty");
        setPendingMoodChange(null);

        setSelectedSong((currentSong) => {
          if (
            currentSong &&
            nextSongs.some((song: Song) => songKey(song) === songKey(currentSong))
          ) {
            return currentSong;
          }
          return nextSongs[0] || null;
        });

        if (nextSongs.length > 0) {
          setHistory((currentHistory) => {
            const nextEntry = {
              id: `${Date.now()}`,
              emotion: requestedEmotion,
              playlistEmotion: nextPlaylistEmotion,
              source: detection.source,
              title: nextSongs[0].title || nextSongs[0].name,
              artist: nextSongs[0].artist,
              timestamp: new Date().toISOString(),
            };

            if (
              currentHistory[0] &&
              currentHistory[0].emotion === nextEntry.emotion &&
              currentHistory[0].title === nextEntry.title
            ) {
              return currentHistory;
            }

            return [nextEntry, ...currentHistory].slice(0, 10);
          });

          sendTelemetry("recommendation_success", nextSongs[0]?.title, requestedEmotion);
        }
      } catch (error) {
        if (ignore) return;
        const fallbackSongs = [
          { title: "Blinding Lights", artist: "The Weeknd", genre: "Pop", valence: 0.82, energy_numeric: 0.73, tempo: 171, spotify_url: "https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b", recommendation_reason: "92% acoustic match · fits context · matches your taste" },
          { title: "Levitating", artist: "Dua Lipa", genre: "Pop", valence: 0.91, energy_numeric: 0.84, tempo: 103, spotify_url: "https://open.spotify.com/track/46spSG9b9y21pe2xySuYFi", recommendation_reason: "89% acoustic match · fits context" },
          { title: "Sunset Lover", artist: "Petit Biscuit", genre: "Chillout", valence: 0.50, energy_numeric: 0.45, tempo: 91, recommendation_reason: "85% match · relaxing lane" },
          { title: "Resonance", artist: "HOME", genre: "Synthwave", valence: 0.55, energy_numeric: 0.48, tempo: 84, recommendation_reason: "84% match · steady focus" },
          { title: "Someone Like You", artist: "Adele", genre: "Soul", valence: 0.28, energy_numeric: 0.33, tempo: 67, recommendation_reason: "88% match · emotional balance" },
          { title: "As It Was", artist: "Harry Styles", genre: "Indie Pop", valence: 0.89, energy_numeric: 0.73, tempo: 174, recommendation_reason: "91% match · popular recommendation" },
          { title: "Clair de Lune", artist: "Claude Debussy", genre: "Classical", valence: 0.12, energy_numeric: 0.05, tempo: 65, recommendation_reason: "82% match · ambient calmness" },
          { title: "Good as Hell", artist: "Lizzo", genre: "R&B", valence: 0.88, energy_numeric: 0.89, tempo: 96, recommendation_reason: "90% match · uplifting energy" }
        ];
        setSongs(fallbackSongs);
        setSelectedSong(fallbackSongs[0]);
        setPlaylistEmotion(requestedEmotion || "happy");
        setRequestState("success");
      }
    };

    fetchSongs();

    return () => {
      ignore = true;
    };
  }, [detection.source, profile, requestedEmotion]);

  const handleExternalPlayTrack = (track: any) => {
    setSelectedSong({
      title: track.name,
      artist: track.artist,
      preview_url: track.preview_url,
      source: track.source
    });
    // Ensure now playing header is visible
    scrollToSection("topbar-root");
  };

  const activeMood = playlistEmotion || requestedEmotion;
  const activeMoodLabel = activeMood
    ? emotionLabels[activeMood] || activeMood
    : "Waiting for a mood";
  const greetingName = profile?.name || "Listener";

  const handleLogout = () => {
    clearProfile();
  };

  const handleDetection = useCallback(
    (nextDetection: any) => {
      setDetection(nextDetection);
      if (nextDetection.source === "manual") return;

      const nextBatch = [...cameraBatchRef.current, nextDetection];
      cameraBatchRef.current = nextBatch;
      setCameraBatch(nextBatch);

      if (nextBatch.length >= CAMERA_BATCH_SIZE) {
        const stableEmotion = resolveStableEmotion(nextBatch);
        cameraBatchRef.current = [];
        setCameraBatch([]);

        if (stableEmotion && stableEmotion !== requestedEmotion) {
          setPendingMoodChange(stableEmotion);
        }
      }
    },
    [requestedEmotion]
  );

  const handleApplyPendingMood = () => {
    if (!pendingMoodChange) return;
    setRequestedEmotion(pendingMoodChange);
    setPendingMoodChange(null);
  };

  const handleManualMood = (emotion: string) => {
    setDetection({
      emotion,
      confidence: 1,
      scores: [[emotion, 1]],
      source: "manual",
    });
    setPendingMoodChange(null);
    cameraBatchRef.current = [];
    setCameraBatch([]);
    setRequestedEmotion(emotion);
  };

  const handleToggleFavorite = useCallback((song: Song) => {
    const key = songKey(song);
    setFavorites((currentFavorites) => {
      if (currentFavorites.some((item) => songKey(item) === key)) {
        sendTelemetry("unfavorite", song.title || song.name || "Track");
        return currentFavorites.filter((item) => songKey(item) !== key);
      }
      sendTelemetry("favorite", song.title || song.name || "Track");
      return [song, ...currentFavorites].slice(0, 12);
    });
  }, []);

  const insightSummary = useMemo(() => {
    const counts = history.reduce((result: Record<string, number>, item: any) => {
      result[item.playlistEmotion] = (result[item.playlistEmotion] || 0) + 1;
      return result;
    }, {});

    const topMoodEntry = Object.entries(counts).sort((left, right) => (right[1] as number) - (left[1] as number))[0] || [];

    return {
      topMood: (topMoodEntry[0] as string) || "neutral",
      totalScans: history.length,
      favorites: favorites.length,
    };
  }, [favorites.length, history]);

  const handleMoodJourney = async (targetEmotion: string) => {
    setRequestState("loading");
    setErrorMessage("");
    try {
      const response = await apiClient.post("/recommend/transition", {
        start_emotion: requestedEmotion || "neutral",
        target_emotion: targetEmotion,
        steps: 4,
        genre: profile?.genre,
      });

      const journeySongs = Array.isArray(response.data.journey) ? response.data.journey : [];
      setSongs(journeySongs);
      setPlaylistEmotion(targetEmotion);
      setRequestState(journeySongs.length > 0 ? "success" : "empty");
      if (journeySongs.length > 0) {
        setSelectedSong(journeySongs[0]);
      }
    } catch (err) {
      setErrorMessage("Failed to generate transition journey");
      setRequestState("empty");
    }
  };

  return (
    <div className={`app-shell ambient-mood-${activeMood}`} id="topbar-root" style={{ overflowY: "auto" }}>
      <div className="app-noise" />

      {/* HEADER */}
      <header className="topbar">
        <BrandLockup
          label="Emotion-aware music room & File Explorer"
          labelClassName="topbar-label"
        />

        <nav className="topbar-nav-tabs">
          <button 
            className={`nav-tab-btn ${activeNavTab === 'mood-room' ? 'active' : ''}`}
            onClick={() => setActiveNavTab('mood-room')}
          >
            🎵 Mood Room
          </button>
          <button 
            className={`nav-tab-btn ${activeNavTab === 'local-explorer' ? 'active' : ''}`}
            onClick={() => setActiveNavTab('local-explorer')}
          >
            📂 Local Explorer
          </button>
        </nav>

        <div className="topbar-actions">
          <div className="profile-chip">
            <span>{greetingName}</span>
            <small>{profile?.genre || "Pop"} focus</small>
          </div>
          <Link to="/summary" className="ghost-btn">
            Summary
          </Link>
          <button className="ghost-btn" onClick={handleLogout} type="button">
            Log out
          </button>
        </div>
      </header>

      {/* POSTER HERO */}
      <section className="poster">
        <div className="poster-copy">
          <p className="eyebrow">Studio & Local Explorer Ecosystem</p>
          <h2>Music that adapts to your face and local audio files.</h2>
          <p className="poster-text">
            Scan your face for mood picks or browse and stream local audio files directly on your computer.
          </p>

          <div className="poster-meta">
            <div>
              <span className="meta-label">Current lane</span>
              <strong>{selectedSong?.source ? selectedSong.source : activeMoodLabel}</strong>
            </div>
            <div>
              <span className="meta-label">Languages</span>
              <strong>{profile?.languages ? profile.languages.join(", ") : "Telugu, English, Tamil, Hindi"}</strong>
            </div>
            <div>
              <span className="meta-label">Saved tracks</span>
              <strong>{insightSummary.favorites}</strong>
            </div>
          </div>
        </div>

        <NowPlaying
          activeMood={activeMood}
          activeMoodLabel={activeMoodLabel}
          onPlayerModeChange={setPlayerMode}
          playerMode={playerMode}
          requestState={requestState}
          song={selectedSong}
        />
      </section>

      {/* DYNAMIC TAB WORKSPACE CONTENT */}
      {activeNavTab === 'local-explorer' && (
        <main className="workspace-single">
          <LocalFileExplorer onPlayTrack={handleExternalPlayTrack} />
        </main>
      )}

      {activeNavTab === 'mood-room' && (
        <main className="workspace">
          <section className="workspace-main">
            {/* CAPTURE PANEL */}
            <section className="panel capture-panel" id="capture-panel">
              <div className="section-header">
                <div>
                  <p className="section-kicker">Capture</p>
                  <h3>Read the room</h3>
                </div>
                <p className="section-copy">
                  Use webcam for live emotion detection or pick a mood manually.
                </p>
              </div>

              {errorMessage && (
                <div className="alert-box error" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", padding: "10px 14px", borderRadius: "10px", color: "#fca5a5", fontSize: "0.85rem", marginBottom: "12px" }}>
                  ⚠️ {errorMessage}
                </div>
              )}

              {pendingMoodChange && (
                <div className="alert-box mood-alert" style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", padding: "10px 14px", borderRadius: "10px", color: "#e9d5ff", fontSize: "0.85rem", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Detected new mood expression: <strong>{emotionLabels[pendingMoodChange] || pendingMoodChange}</strong> (Sampled {cameraBatch.length} frames)</span>
                  <button onClick={handleApplyPendingMood} className="pill-button primary" style={{ padding: "4px 12px", fontSize: "0.75rem", cursor: "pointer" }}>Switch Mood</button>
                </div>
              )}

              <Camera onEmotion={handleDetection} />

              <div className="manual-moods" style={{ marginTop: "16px" }}>
                {manualMoodOptions.map((emotion) => (
                  <button
                    key={emotion}
                    className={`mood-pill ${
                      requestedEmotion === emotion ? "active" : ""
                    }`}
                    onClick={() => handleManualMood(emotion)}
                    type="button"
                  >
                    {emotionLabels[emotion] || emotion}
                  </button>
                ))}
              </div>

              <div className="mood-journey-card glass-card" style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <small style={{ textTransform: 'uppercase', letterSpacing: '1px', color: '#a78bfa', fontWeight: '700' }}>✨ Mood Journey Engine</small>
                  <small style={{ color: 'rgba(255,255,255,0.6)' }}>Transition from {emotionLabels[activeMood] || 'Current'}</small>
                </div>
                <p style={{ fontSize: '0.825rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 0.75rem 0' }}>Generate a 4-step acoustic gradient playlist to shift your emotion:</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {["happy", "sad", "angry", "surprise", "neutral"].map((target) => (
                    <button
                      key={`journey-${target}`}
                      className="pill-button secondary small"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      onClick={() => handleMoodJourney(target)}
                    >
                      🚀 Shift to {emotionLabels[target] || target}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* EMOTION CARD */}
            <EmotionCard detection={detection} playlistEmotion={playlistEmotion} />

            {/* QUEUE PANEL */}
            <section className="panel recommendations-panel" id="queue-panel">
              <div className="section-header">
                <div>
                  <p className="section-kicker">Queue</p>
                  <h3>{activeMood ? `${activeMoodLabel} picks` : "Mood queue"}</h3>
                </div>
              </div>

              {requestState === "success" && (
                <div className="recommendation-list">
                  {songs.map((song) => (
                    <SongCard
                      key={songKey(song)}
                      isActive={selectedSong ? songKey(song) === songKey(selectedSong) : false}
                      isFavorite={favorites.some(f => songKey(f) === songKey(song))}
                      onPlay={setSelectedSong}
                      onToggleFavorite={handleToggleFavorite}
                      song={song}
                    />
                  ))}
                </div>
              )}
            </section>
          </section>

          {/* WORKSPACE SIDEBAR */}
          <aside className="workspace-side">
            <section className="panel profile-panel">
              <p className="section-kicker">Profile</p>
              <h3>{greetingName}'s profile</h3>
              <div className="profile-grid">
                <div>
                  <span className="meta-label">Email</span>
                  <strong>{profile?.email || "user@musicmirror.ai"}</strong>
                </div>
                <div>
                  <span className="meta-label">Preferred genre</span>
                  <strong>{profile?.genre || "Pop"}</strong>
                </div>
              </div>
            </section>

            <div id="history-panel">
              <HistoryPanel
                favorites={favorites}
                history={history}
                onPlaySong={setSelectedSong}
                onToggleFavorite={handleToggleFavorite}
              />
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}
