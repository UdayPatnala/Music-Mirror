import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import AuthScreen from "./components/AuthScreen";
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
  const [requestState, setRequestState] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

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

  const handleProfileStart = (nextProfile) => {
    setProfile(nextProfile);
  };

  const handleLogout = () => {
    setProfile(null);
    setRequestedEmotion("");
    setPlaylistEmotion("");
    setSongs([]);
    setSelectedSong(null);
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

    setRequestedEmotion((currentEmotion) =>
      currentEmotion === nextDetection.emotion
        ? currentEmotion
        : nextDetection.emotion
    );
  };

  const handleManualMood = (emotion) => {
    setDetection({
      emotion,
      confidence: 1,
      scores: [[emotion, 1]],
      source: "manual",
    });
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

  if (!profile) {
    return <AuthScreen onStart={handleProfileStart} />;
  }

  return (
    <div className="app-shell">
      <div className="app-noise" />

      <header className="topbar">
        <div>
          <p className="topbar-label">Emotion-aware music room</p>
          <h1>Muse Mirror</h1>
        </div>

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
        </div>

        <NowPlaying
          activeMoodLabel={activeMoodLabel}
          requestState={requestState}
          song={selectedSong}
        />
      </section>

      <main className="workspace">
        <section className="workspace-main">
          <section className="panel capture-panel">
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

          <section className="panel recommendations-panel">
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

          <HistoryPanel
            favorites={favorites}
            history={history}
            onPlaySong={setSelectedSong}
            onToggleFavorite={handleToggleFavorite}
          />
        </aside>
      </main>
    </div>
  );
}
