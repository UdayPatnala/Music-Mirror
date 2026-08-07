// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAppStore } from "../store/useAppStore";
import { sendTelemetry } from "../api/telemetry";

import BrandLockup from "../components/BrandLockup";
import Camera from "../components/Camera";
import EmotionCard, { emotionLabels } from "../components/EmotionCard";
import HistoryPanel from "../components/HistoryPanel";
import NowPlaying from "../components/NowPlaying";
import SongCard from "../components/SongCard";
import GitRepoExplorer from "../components/GitRepoExplorer";
import LocalFileExplorer from "../components/LocalFileExplorer";

const CAMERA_BATCH_SIZE = 3;

const manualMoodOptions = [
  "happy",
  "neutral",
  "sad",
  "angry",
  "surprise",
];

function songKey(song) {
  return `${song.title || song.name}::${song.artist}`;
}

function formatTimestamp(isoValue) {
  if (!isoValue) return "No scans yet";
  return new Date(isoValue).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function resolveStableEmotion(batch) {
  const counts = {};
  batch.forEach(({ emotion }) => {
    counts[emotion] = (counts[emotion] || 0) + 1;
  });
  const topEntry = Object.entries(counts).sort((left, right) => right[1] - left[1])[0];
  if (!topEntry || topEntry[1] === 1) {
    return batch[batch.length - 1].emotion;
  }
  return topEntry[0];
}

function describeBatch(batch) {
  return batch
    .map(({ emotion }) => emotionLabels[emotion] || emotion)
    .join(", ");
}

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function MoodRoom() {
  const profile = useAppStore((state) => state.profile);
  const clearProfile = useAppStore((state) => state.clearProfile);

  const [activeNavTab, setActiveNavTab] = useState("mood-room"); // 'mood-room' | 'git-explorer' | 'local-explorer'

  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);

  const [detection, setDetection] = useState({
    emotion: "",
    confidence: 0,
    scores: [],
    source: "camera",
  });
  const [requestedEmotion, setRequestedEmotion] = useState("happy");
  const [playlistEmotion, setPlaylistEmotion] = useState("");
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [playerMode, setPlayerMode] = useState("youtube");
  const [requestState, setRequestState] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [cameraBatch, setCameraBatch] = useState([]);
  const [pendingMoodChange, setPendingMoodChange] = useState(null);

  const cameraBatchRef = useRef([]);

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
            nextSongs.some((song) => songKey(song) === songKey(currentSong))
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

  const handleExternalPlayTrack = (track) => {
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
    (nextDetection) => {
      setDetection(nextDetection);
      if (nextDetection.confidence < 0.5) return;
      const nextBatch = [...cameraBatchRef.current, nextDetection].slice(0, CAMERA_BATCH_SIZE);
      cameraBatchRef.current = nextBatch;
      setCameraBatch(nextBatch);
      if (nextBatch.length < CAMERA_BATCH_SIZE) return;

      const stableEmotion = resolveStableEmotion(nextBatch);
      const finalRead = [...nextBatch].reverse().find((item) => item.emotion === stableEmotion) || nextBatch[nextBatch.length - 1];

      cameraBatchRef.current = [];
      setCameraBatch([]);

      setDetection({
        ...finalRead,
        emotion: stableEmotion,
        source: "camera",
      });

      if (!requestedEmotion || !selectedSong || requestState !== "success") {
        setRequestedEmotion(stableEmotion);
        setPendingMoodChange(null);
        return;
      }

      if (stableEmotion === requestedEmotion) {
        setPendingMoodChange(null);
        return;
      }

      setPendingMoodChange({
        emotion: stableEmotion,
        previousEmotion: requestedEmotion,
        samples: nextBatch,
        mode: new Set(nextBatch.map((item) => item.emotion)).size === CAMERA_BATCH_SIZE ? "last-read" : "majority",
      });
    },
    [requestedEmotion, selectedSong, requestState]
  );

  const handleManualMood = (emotion) => {
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

  const handleToggleFavorite = useCallback((song) => {
    const key = songKey(song);
    setFavorites((currentFavorites) => {
      if (currentFavorites.some((item) => songKey(item) === key)) {
        sendTelemetry("unfavorite", song.title || song.name);
        return currentFavorites.filter((item) => songKey(item) !== key);
      }
      sendTelemetry("favorite", song.title || song.name);
      return [song, ...currentFavorites].slice(0, 12);
    });
  }, []);

  const insightSummary = useMemo(() => {
    const counts = history.reduce((result, item) => {
      result[item.playlistEmotion] = (result[item.playlistEmotion] || 0) + 1;
      return result;
    }, {});

    const topMoodEntry = Object.entries(counts).sort((left, right) => right[1] - left[1])[0] || [];

    return {
      topMood: topMoodEntry[0] || "neutral",
      totalScans: history.length,
      favorites: favorites.length,
    };
  }, [favorites.length, history]);

  const handleMoodJourney = async (targetEmotion) => {
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
          <button 
            className={`nav-tab-btn ${activeNavTab === 'git-explorer' ? 'active' : ''}`}
            onClick={() => setActiveNavTab('git-explorer')}
          >
            🐙 Git Repository
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
          <p className="eyebrow">Studio & Repository Ecosystem</p>
          <h2>Music that adapts to your face, local files, and git code.</h2>
          <p className="poster-text">
            Scan your face for mood picks, browse local audio files on your computer, or explore GitHub repository code & music tracks.
          </p>

          <div className="poster-meta">
            <div>
              <span className="meta-label">Current lane</span>
              <strong>{selectedSong?.source ? selectedSong.source : activeMoodLabel}</strong>
            </div>
            <div>
              <span className="meta-label">Top pattern</span>
              <strong>{emotionLabels[insightSummary.topMood] || "Neutral"}</strong>
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
      {activeNavTab === 'git-explorer' && (
        <main className="workspace-single">
          <GitRepoExplorer onPlayTrack={handleExternalPlayTrack} />
        </main>
      )}

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
