import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import AuthScreen from "./components/AuthScreen";
import BrandLockup from "./components/BrandLockup";
import Camera from "./components/Camera";
import EmotionCard, { emotionLabels } from "./components/EmotionCard";
import HistoryPanel from "./components/HistoryPanel";
import NowPlaying from "./components/NowPlaying";
import SongCard from "./components/SongCard";

const DEFAULT_API_URL =
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:8000"
    : "https://emotion-music-recommender-wruw.onrender.com";

const API_URL = process.env.REACT_APP_API_URL || DEFAULT_API_URL;
const CAMERA_BATCH_SIZE = 3;

const STORAGE_KEYS = {
  profile: "emotion-music-profile-v2",
  favorites: "emotion-music-favorites-v2",
  history: "emotion-music-history-v2",
};

const manualMoodOptions = [
  "happy",
  "neutral",
  "sad",
  "angry",
  "surprise",
];

function readStorage(key, fallbackValue) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallbackValue;
  } catch (error) {
    console.error(`Could not read ${key} from local storage`, error);
    return fallbackValue;
  }
}

function songKey(song) {
  return `${song.title}::${song.artist}`;
}

function formatTimestamp(isoValue) {
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

  if (!section) {
    return;
  }

  section.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export default function App() {
  const [profile, setProfile] = useState(() =>
    readStorage(STORAGE_KEYS.profile, null)
  );
  const [favorites, setFavorites] = useState(() =>
    readStorage(STORAGE_KEYS.favorites, [])
  );
  const [history, setHistory] = useState(() =>
    readStorage(STORAGE_KEYS.history, [])
  );
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
    if (profile) {
      window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.profile);
    }
  }, [profile]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.favorites,
      JSON.stringify(favorites)
    );
  }, [favorites]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (!profile || !requestedEmotion) return;

    let ignore = false;

    const fetchSongs = async () => {
      setRequestState("loading");
      setErrorMessage("");

      try {
        const response = await axios.post(`${API_URL}/recommend`, {
          emotion: requestedEmotion,
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
              title: nextSongs[0].title,
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
        }
      } catch (error) {
        if (ignore) return;

        console.error("Error fetching songs:", error);
        setSongs([]);
        setSelectedSong(null);
        setRequestState("error");
        setErrorMessage(
          `Could not load songs from ${API_URL}. Start the backend or set REACT_APP_API_URL in frontend/.env.`
        );
      }
    };

    fetchSongs();

    return () => {
      ignore = true;
    };
  }, [detection.source, profile, requestedEmotion]);

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

  const handleProfileStart = (nextProfile) => {
    setProfile(nextProfile);
  };

  const handleLogout = () => {
    setProfile(null);
    setRequestedEmotion("");
    setPlaylistEmotion("");
    setSongs([]);
    setSelectedSong(null);
    setPlayerMode("youtube");
    setPendingMoodChange(null);
    resetCameraBatch();
    setDetection({
      emotion: "",
      confidence: 0,
      scores: [],
      source: "camera",
    });
  };

  const handleDetection = (nextDetection) => {
    setDetection(nextDetection);

    if (nextDetection.confidence < 0.5) {
      return;
    }

    const nextBatch = [...cameraBatchRef.current, nextDetection].slice(
      0,
      CAMERA_BATCH_SIZE
    );

    cameraBatchRef.current = nextBatch;
    setCameraBatch(nextBatch);

    if (nextBatch.length < CAMERA_BATCH_SIZE) {
      return;
    }

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
        new Set(nextBatch.map((item) => item.emotion)).size === CAMERA_BATCH_SIZE
          ? "last-read"
          : "majority",
    });
  };

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

  const handleToggleFavorite = (song) => {
    const key = songKey(song);

    setFavorites((currentFavorites) => {
      if (currentFavorites.some((item) => songKey(item) === key)) {
        return currentFavorites.filter((item) => songKey(item) !== key);
      }

      return [song, ...currentFavorites].slice(0, 12);
    });
  };

  const handleAcceptSuggestedMood = () => {
    if (!pendingMoodChange) return;

    setRequestedEmotion(pendingMoodChange.emotion);
    setPendingMoodChange(null);
  };

  const handleKeepCurrentSong = () => {
    setPendingMoodChange(null);
  };

  const cameraBatchLabel =
    cameraBatch.length > 0
      ? describeBatch(cameraBatch)
      : "Waiting for the next 3 confident reads.";

  if (!profile) {
    return <AuthScreen onStart={handleProfileStart} />;
  }

  return (
    <div className="app-shell">
      <div className="app-noise" />

      <header className="topbar">
        <BrandLockup
          label="Emotion-aware music room"
          labelClassName="topbar-label"
        />

        <div className="topbar-actions">
          <div className="profile-chip">
            <span>{greetingName}</span>
            <small>{profile.genre} focus</small>
          </div>
          <button className="ghost-btn" onClick={handleLogout} type="button">
            Log out
          </button>
        </div>
      </header>

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
              <strong>{emotionLabels[insightSummary.topMood]}</strong>
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
        
        <NowPlaying
          activeMood={activeMood}
          activeMoodLabel={activeMoodLabel}
          onPlayerModeChange={setPlayerMode}
          playerMode={playerMode}
          requestState={requestState}
          song={selectedSong}
        />
      </section>

      <main className="workspace">
        <section className="workspace-main">
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

            <p className="buffer-note">
              Music updates after {CAMERA_BATCH_SIZE} confident camera reads.
              Current batch: {cameraBatchLabel}
            </p>

            <div className="manual-moods">
              {manualMoodOptions.map((emotion) => (
                <button
                  key={emotion}
                  className={`mood-pill ${
                    requestedEmotion === emotion ? "active" : ""
                  }`}
                  onClick={() => handleManualMood(emotion)}
                  type="button"
                >
                  {emotionLabels[emotion]}
                </button>
              ))}
            </div>
          </section>

          <EmotionCard detection={detection} playlistEmotion={playlistEmotion} />

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

            {pendingMoodChange && (
              <div className="mood-suggestion">
                <div>
                  <p className="section-kicker">Suggested switch</p>
                  <h4>
                    Camera now leans {emotionLabels[pendingMoodChange.emotion]}.
                  </h4>
                  <p className="compact-copy">
                    {pendingMoodChange.mode === "majority"
                      ? `That mood repeated most often across the last ${CAMERA_BATCH_SIZE} reads.`
                      : `The last ${CAMERA_BATCH_SIZE} reads were all different, so this suggestion uses the latest read.`}{" "}
                    Batch: {describeBatch(pendingMoodChange.samples)}.
                  </p>
                </div>
                <div className="mood-suggestion-actions">
                  <button
                    className="primary-btn"
                    onClick={handleAcceptSuggestedMood}
                    type="button"
                  >
                    Switch song
                  </button>
                  <button
                    className="ghost-btn"
                    onClick={handleKeepCurrentSong}
                    type="button"
                  >
                    Keep current
                  </button>
                </div>
              </div>
            )}

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

        <aside className="workspace-side">
          <section className="panel profile-panel">
            <p className="section-kicker">Profile</p>
            <h3>{greetingName}'s listening profile</h3>

            <div className="profile-grid">
              <div>
                <span className="meta-label">Email</span>
                <strong>{profile.email}</strong>
              </div>
              <div>
                <span className="meta-label">Preferred genre</span>
                <strong>{profile.genre}</strong>
              </div>
              <div>
                <span className="meta-label">Mood goal</span>
                <strong>{profile.goal}</strong>
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
                <strong>{emotionLabels[insightSummary.topMood]}</strong>
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
