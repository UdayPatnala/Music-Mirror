import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../v1-styles.css";
import AuthScreen from "../components/v1/AuthScreen";
import BrandLockup from "../components/v1/BrandLockup";
import Camera from "../components/v1/Camera";
import EmotionCard from "../components/v1/EmotionCard";
import { emotionLabels } from "../components/v1/emotionConstants";
import HistoryPanel from "../components/v1/HistoryPanel";
import NowPlaying from "../components/v1/NowPlaying";
import SongCard from "../components/v1/SongCard";
import ModeSelector from "../components/ModeSelector";
import { setApplicationMode } from "../config/appVersionInfo";

const DEFAULT_API_URL =
  typeof window !== "undefined" &&
  window.location &&
  !["localhost", "127.0.0.1", "::1", "[::1]"].includes(window.location.hostname)
    ? "https://emotion-music-recommender-wruw.onrender.com"
    : "http://127.0.0.1:8000";

const API_URL = (import.meta.env?.VITE_API_BASE_URL as string | undefined) || DEFAULT_API_URL;
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

// Fallback catalog for resilience during backend cold starts
const FALLBACK_SONGS_BY_EMOTION: Record<string, any[]> = {
  happy: [
    { title: "Viva La Vida", name: "Viva La Vida", artist: "Coldplay", genre: "Orchestral Pop Rock", language: "English", youtubeId: "dvgZkm1xWPE" },
    { title: "Cruel Summer", name: "Cruel Summer", artist: "Taylor Swift", genre: "Synth Pop", language: "English", youtubeId: "ic8j13gR964" },
    { title: "Ticket Eh Konakunda", name: "Ticket Eh Konakunda", artist: "Ram Miriyala", genre: "Telugu Fun Beats", language: "Telugu", youtubeId: "tG03R9uRj-A" },
    { title: "Senorita", name: "Senorita", artist: "Farhan Akhtar & Hrithik Roshan", genre: "Flamenco Bollywood", language: "Hindi", youtubeId: "m89mJ0y8J-0" },
    { title: "Buttabomma", name: "Buttabomma", artist: "Armaan Malik", genre: "Telugu Pop", language: "Telugu", youtubeId: "A6BJ-PgNWXA" },
  ],
  sad: [
    { title: "Someone Like You", name: "Someone Like You", artist: "Adele", genre: "Soul Pop", language: "English", youtubeId: "hLQl3WQQoQ0" },
    { title: "Fix You", name: "Fix You", artist: "Coldplay", genre: "Alternative Rock", language: "English", youtubeId: "k4V3Mo61fJM" },
    { title: "Channa Mereya", name: "Channa Mereya", artist: "Arijit Singh", genre: "Sufi Bollywood", language: "Hindi", youtubeId: "284Ov7ysmfA" },
    { title: "Urike Urike", name: "Urike Urike", artist: "Sid Sriram", genre: "Telugu Melody", language: "Telugu", youtubeId: "U4i4wH-4Zfg" },
  ],
  neutral: [
    { title: "Sunflower", name: "Sunflower", artist: "Post Malone & Swae Lee", genre: "Melodic Hip-Hop", language: "English", youtubeId: "ApXoWvfEYVU" },
    { title: "Inamellina", name: "Inamellina", artist: "Anirudh", genre: "Telugu Ambient", language: "Telugu", youtubeId: "RACf1mY9bJI" },
    { title: "Midnight City", name: "Midnight City", artist: "M83", genre: "Synthwave", language: "English", youtubeId: "dX3k_QDnzHE" },
  ],
  angry: [
    { title: "Believer", name: "Believer", artist: "Imagine Dragons", genre: "Arena Rock", language: "English", youtubeId: "7wtfhZwyrcc" },
    { title: "Bones", name: "Bones", artist: "Imagine Dragons", genre: "Indie Pop Rock", language: "English", youtubeId: "TO-_3tck2tg" },
    { title: "Aarambh Hai Prachand", name: "Aarambh Hai Prachand", artist: "Piyush Mishra", genre: "Rock Fusion", language: "Hindi", youtubeId: "r6S5qF6BqP4" },
  ],
  surprise: [
    { title: "Blinding Lights", name: "Blinding Lights", artist: "The Weeknd", genre: "Synthwave Pop", language: "English", youtubeId: "4NRXx6U8ABQ" },
    { title: "Starboy", name: "Starboy", artist: "The Weeknd ft. Daft Punk", genre: "R&B Pop", language: "English", youtubeId: "34Na4j8AVgA" },
    { title: "Illuminati", name: "Illuminati", artist: "Sushin Shyam", genre: "Malayalam Dance", language: "Malayalam", youtubeId: "tOM-nWPcR4U" },
  ],
};

function readStorage(key: string, fallbackValue: any) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallbackValue;
  } catch (error) {
    console.error(`Could not read ${key} from local storage`, error);
    return fallbackValue;
  }
}

function songKey(song: any) {
  return `${song.title || song.name}::${song.artist}`;
}

function formatTimestamp(isoValue: string) {
  return new Date(isoValue).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function resolveStableEmotion(batch: any[]) {
  const counts: Record<string, number> = {};

  batch.forEach(({ emotion }) => {
    counts[emotion] = (counts[emotion] || 0) + 1;
  });

  const topEntry = Object.entries(counts).sort((left, right) => right[1] - left[1])[0];

  if (!topEntry || topEntry[1] === 1) {
    return batch[batch.length - 1].emotion;
  }

  return topEntry[0];
}

function describeBatch(batch: any[]) {
  return batch
    .map(({ emotion }) => (emotionLabels as any)[emotion] || emotion)
    .join(", ");
}

function scrollToSection(sectionId: string) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  section.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export default function BaselineV1Page() {
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
    scores: [] as any[],
    source: "camera",
  });
  const [requestedEmotion, setRequestedEmotion] = useState("happy");
  const [playlistEmotion, setPlaylistEmotion] = useState("");
  const [songs, setSongs] = useState<any[]>(FALLBACK_SONGS_BY_EMOTION.happy);
  const [selectedSong, setSelectedSong] = useState<any>(FALLBACK_SONGS_BY_EMOTION.happy[0]);
  const [playerMode, setPlayerMode] = useState("youtube");
  const [requestState, setRequestState] = useState("success");
  const [errorMessage, setErrorMessage] = useState("");
  const [cameraBatch, setCameraBatch] = useState<any[]>([]);
  const [pendingMoodChange, setPendingMoodChange] = useState<any>(null);
  const cameraBatchRef = useRef<any[]>([]);

  useEffect(() => {
    document.title = "Music Mirror — Baseline";
  }, []);

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
        const response = await fetch(`${API_URL}/recommend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emotion: requestedEmotion }),
        });

        if (ignore) return;

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        const nextSongs = Array.isArray(data.songs) && data.songs.length > 0
          ? data.songs
          : (FALLBACK_SONGS_BY_EMOTION[requestedEmotion] || FALLBACK_SONGS_BY_EMOTION.happy);
        const nextPlaylistEmotion = data.normalized_emotion || requestedEmotion;

        setSongs(nextSongs);
        setPlaylistEmotion(nextPlaylistEmotion);
        setRequestState("success");
        setPendingMoodChange(null);

        setSelectedSong((currentSong: any) => {
          if (
            currentSong &&
            nextSongs.some((song: any) => songKey(song) === songKey(currentSong))
          ) {
            return currentSong;
          }
          return nextSongs[0] || null;
        });

        if (nextSongs.length > 0) {
          setHistory((currentHistory: any[]) => {
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
        }
      } catch (error) {
        if (ignore) return;
        console.warn("Could not reach backend, activating resilient baseline catalog:", error);
        const fallback = FALLBACK_SONGS_BY_EMOTION[requestedEmotion] || FALLBACK_SONGS_BY_EMOTION.happy;
        setSongs(fallback);
        setSelectedSong(fallback[0]);
        setRequestState("success");
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
    () => new Set(favorites.map((song: any) => songKey(song))),
    [favorites]
  );

  const insightSummary = useMemo(() => {
    const counts = history.reduce((result: Record<string, number>, item: any) => {
      result[item.playlistEmotion] = (result[item.playlistEmotion] || 0) + 1;
      return result;
    }, {});

    const topMoodEntry =
      (Object.entries(counts) as [string, number][]).sort((left, right) => right[1] - left[1])[0] || [];

    return {
      topMood: topMoodEntry[0] || "happy",
      totalScans: history.length,
      favorites: favorites.length,
    };
  }, [favorites.length, history]);

  const activeMood = playlistEmotion || requestedEmotion;
  const activeMoodLabel = activeMood
    ? (emotionLabels as any)[activeMood] || activeMood
    : "Waiting for a mood";
  const greetingName = profile?.name || "Listener";

  const resetCameraBatch = () => {
    cameraBatchRef.current = [];
    setCameraBatch([]);
  };

  const handleProfileStart = (nextProfile: any) => {
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

  const handleDetection = useCallback((nextDetection: any) => {
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
  }, [requestedEmotion, selectedSong, requestState]);

  const handleManualMood = (emotion: string) => {
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

  const handleToggleFavorite = useCallback((song: any) => {
    const key = songKey(song);

    setFavorites((currentFavorites: any[]) => {
      if (currentFavorites.some((item) => songKey(item) === key)) {
        return currentFavorites.filter((item) => songKey(item) !== key);
      }

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

  if (!profile) {
    return (
      <div className="app-shell">
        <header className="topbar" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <BrandLockup
            label="Emotion-aware music room — Baseline V1"
            labelClassName="topbar-label"
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>April 10, 2026 Baseline</span>
            <ModeSelector />
          </div>
        </header>
        <AuthScreen onStart={handleProfileStart} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-noise" />

      <header className="topbar">
        <BrandLockup
          label="Emotion-aware music room — Baseline V1"
          labelClassName="topbar-label"
        />

        <div className="topbar-actions">
          <ModeSelector />

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
          <p className="eyebrow">Original Academic Baseline</p>
          <h2>Music that adapts to your face, your mood, and your session.</h2>
          <p className="poster-text">
            Original April 10, 2026 stable reference. Scan the room, nudge the mood
            manually, and keep your own listening trail with favorites and emotional reads.
          </p>

          <div className="poster-meta">
            <div>
              <span className="meta-label">Current lane</span>
              <strong>{activeMoodLabel}</strong>
            </div>
            <div>
              <span className="meta-label">Top pattern</span>
              <strong>{(emotionLabels as any)[insightSummary.topMood] || insightSummary.topMood}</strong>
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

        {pendingMoodChange && (
          <div className="mood-floating premium">
            <div className="mood-floating-text">
              Switch to {(emotionLabels as any)[pendingMoodChange.emotion]}
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
                  {(emotionLabels as any)[emotion] || emotion}
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

            {/* Profile Page Version Switch Button per user specification */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
              <span className="meta-label">Version Switcher</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600 }}>V1 · Baseline</span>
                <button
                  className="quick-link"
                  type="button"
                  style={{ margin: 0, padding: '8px 16px', fontSize: '0.8rem', cursor: 'pointer' }}
                  onClick={() => setApplicationMode('DEVELOPER')}
                >
                  Switch to Developer V2 &rarr;
                </button>
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
                <strong>{(emotionLabels as any)[insightSummary.topMood] || insightSummary.topMood}</strong>
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
