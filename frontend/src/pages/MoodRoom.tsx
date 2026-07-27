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

  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);

  const [detection, setDetection] = useState({
    emotion: "",
    confidence: 0,
    scores: [],
    source: "camera",
  });
  const [requestedEmotion, setRequestedEmotion] = useState("");
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

          // Telemetry ping
          sendTelemetry("recommendation_success", nextSongs[0]?.title, requestedEmotion);
        }
      } catch (error) {
        if (ignore) return;
        setSongs([]);
        setSelectedSong(null);
        setRequestState("error");
        setErrorMessage("Could not load recommendations.");
      }
    };

    fetchSongs();

    return () => {
      ignore = true;
    };
  }, [detection.source, profile, requestedEmotion]);

  useEffect(() => {
    if (!pendingMoodChange) return;
    const timer = setTimeout(() => {
      setPendingMoodChange(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [pendingMoodChange]);

  const favoriteKeys = useMemo(
    () => new Set(favorites.map((song) => songKey(song))),
    [favorites]
  );

  const insightSummary = useMemo(() => {
    const counts = history.reduce((result, item) => {
      result[item.playlistEmotion] = (result[item.playlistEmotion] || 0) + 1;
      return result;
    }, {});

    const topMoodEntry =
      Object.entries(counts).sort((left, right) => right[1] - left[1])[0] ||
      [];

    return {
      topMood: topMoodEntry[0] || "neutral",
      totalScans: history.length,
      favorites: favorites.length,
    };
  }, [favorites.length, history]);

  const activeMood = playlistEmotion || requestedEmotion;
  const activeMoodLabel = activeMood
    ? emotionLabels[activeMood] || activeMood
    : "Waiting for a mood";
  const greetingName = profile?.name || "Listener";

  const resetCameraBatch = () => {
    cameraBatchRef.current = [];
    setCameraBatch([]);
  };

  const handleLogout = () => {
    clearProfile();
  };

  const handleDetection = useCallback(
    (nextDetection) => {
      setDetection(nextDetection);

      if (nextDetection.confidence < 0.5) return;

      const nextBatch = [...cameraBatchRef.current, nextDetection].slice(
        0,
        CAMERA_BATCH_SIZE
      );

      cameraBatchRef.current = nextBatch;
      setCameraBatch(nextBatch);

      if (nextBatch.length < CAMERA_BATCH_SIZE) return;

      const stableEmotion = resolveStableEmotion(nextBatch);
      const finalRead =
        [...nextBatch]
          .reverse()
          .find((item) => item.emotion === stableEmotion) ||
        nextBatch[nextBatch.length - 1];

      resetCameraBatch();

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
        mode:
          new Set(nextBatch.map((item) => item.emotion)).size ===
          CAMERA_BATCH_SIZE
            ? "last-read"
            : "majority",
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
    resetCameraBatch();
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

  const handleAcceptSuggestedMood = () => {
    if (!pendingMoodChange) return;
    setRequestedEmotion(pendingMoodChange.emotion);
    setTimeout(() => {
      setPendingMoodChange(null);
    }, 150);
  };

  const handleKeepCurrentSong = () => {
    setTimeout(() => {
      setPendingMoodChange(null);
    }, 150);
  };

  const cameraBatchLabel =
    cameraBatch.length > 0
      ? describeBatch(cameraBatch)
      : "Waiting for the next 3 confident reads.";

  return (
    <div className="app-shell" style={{ overflowY: "auto" }}>
      <div className="app-noise" />

      {/* HEADER */}
      <header className="topbar">
        <BrandLockup
          label="Emotion-aware music room"
          labelClassName="topbar-label"
        />

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
          <p className="eyebrow">Live recommendation studio</p>
          <h2>Music that adapts to your face, your mood, and your session.</h2>
          <p className="poster-text">
            Scan the room, nudge the mood manually if you want, and keep your
            own listening trail with favorites and recent emotional reads.
          </p>

          <div className="poster-meta">
            <div>
              <span className="meta-label">Current lane</span>
              <strong>{activeMoodLabel}</strong>
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

          <div className="action-buttons">
            <button
              className="quick-link"
              onClick={() => scrollToSection("capture-panel")}
              type="button"
            >
              Go to camera
            </button>
            <button
              className="quick-link"
              onClick={() => scrollToSection("queue-panel")}
              type="button"
            >
              Open queue
            </button>
            <button
              className="quick-link"
              onClick={() => scrollToSection("history-panel")}
              type="button"
            >
              View history
            </button>
          </div>
        </div>

        {/* FLOATING MOOD POPUP NUDGE */}
        {pendingMoodChange && (
          <div className="mood-floating premium">
            <div className="mood-floating-text">
              ⚡ Switch to {emotionLabels[pendingMoodChange.emotion] || pendingMoodChange.emotion}
            </div>

            <div className="mood-floating-actions">
              <button
                className="inline-btn primary"
                onClick={handleAcceptSuggestedMood}
                type="button"
              >
                Switch
              </button>

              <button
                className="inline-btn ghost"
                onClick={handleKeepCurrentSong}
                type="button"
              >
                Keep
              </button>
            </div>
          </div>
        )}

        <NowPlaying
          activeMood={activeMood}
          activeMoodLabel={activeMoodLabel}
          onPlayerModeChange={setPlayerMode}
          playerMode={playerMode}
          requestState={requestState}
          song={selectedSong}
        />
      </section>

      {/* WORKSPACE */}
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
                Use the webcam for live emotion detection or choose a mood
                manually when you want full control.
              </p>
            </div>

            <Camera onEmotion={handleDetection} />

            <p className="buffer-note" style={{ marginTop: "16px" }}>
              Music updates after {CAMERA_BATCH_SIZE} confident camera reads.
              Current batch: {cameraBatchLabel}
            </p>

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
              <p className="section-copy">
                Curated tracks with embedded playback, quick save, and direct
                fallback links when you want to continue outside the app.
              </p>
            </div>

            {requestState === "idle" && (
              <p className="state-copy">
                Start the camera or tap a mood button to generate a playlist.
              </p>
            )}

            {requestState === "loading" && (
              <p className="state-copy">Building your listening queue...</p>
            )}

            {requestState === "error" && (
              <p className="state-copy error">{errorMessage}</p>
            )}

            {requestState === "empty" && (
              <p className="state-copy">
                No songs are configured yet for the {activeMoodLabel} mood.
              </p>
            )}

            {requestState === "success" && (
              <div className="recommendation-list">
                {songs.map((song) => (
                  <SongCard
                    key={songKey(song)}
                    isActive={
                      selectedSong ? songKey(song) === songKey(selectedSong) : false
                    }
                    isFavorite={favoriteKeys.has(songKey(song))}
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
          {/* PROFILE PANEL */}
          <section className="panel profile-panel">
            <p className="section-kicker">Profile</p>
            <h3>{greetingName}'s listening profile</h3>

            <div className="profile-grid">
              <div>
                <span className="meta-label">Email</span>
                <strong>{profile?.email || "user@musicmirror.ai"}</strong>
              </div>
              <div>
                <span className="meta-label">Preferred genre</span>
                <strong>{profile?.genre || "Pop"}</strong>
              </div>
              <div>
                <span className="meta-label">Mood goal</span>
                <strong>{profile?.goal || "Match my mood"}</strong>
              </div>
              <div>
                <span className="meta-label">Last scan</span>
                <strong>
                  {history[0]?.timestamp
                    ? formatTimestamp(history[0].timestamp)
                    : "No scans yet"}
                </strong>
              </div>
            </div>
          </section>

          {/* INSIGHTS PANEL */}
          <section className="panel stats-panel">
            <p className="section-kicker">Insights</p>
            <h3>Session pulse</h3>

            <div className="stats-grid">
              <div>
                <span className="meta-label">Scans saved</span>
                <strong>{insightSummary.totalScans}</strong>
              </div>
              <div>
                <span className="meta-label">Top mood</span>
                <strong>{emotionLabels[insightSummary.topMood] || "Neutral"}</strong>
              </div>
              <div>
                <span className="meta-label">Favorite songs</span>
                <strong>{insightSummary.favorites}</strong>
              </div>
              <div>
                <span className="meta-label">Detection source</span>
                <strong>
                  {detection.source === "manual"
                    ? "Manual control"
                    : "Camera live"}
                </strong>
              </div>
            </div>
          </section>

          {/* HISTORY & FAVORITES */}
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
    </div>
  );
}
