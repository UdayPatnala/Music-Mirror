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

// Authentic April 10 Baseline catalog for resilience during backend cold starts
const FALLBACK_SONGS_BY_EMOTION: Record<string, any[]> = {
  happy: [
    {
      title: "Happy",
      artist: "Pharrell Williams",
      genre: "Soul Pop",
      energy: "High",
      duration: "3:53",
      note: "A quick mood lift with instant sing-along energy.",
      spotify: "https://open.spotify.com/search/Happy%20Pharrell%20Williams",
      youtube: "https://www.youtube.com/watch?v=ZbZSe6N_BXs",
      youtubeId: "ZbZSe6N_BXs",
    },
    {
      title: "Can't Stop the Feeling!",
      artist: "Justin Timberlake",
      genre: "Dance Pop",
      energy: "Upbeat",
      duration: "3:56",
      note: "Keeps the room moving when the mood is already light.",
      spotify: "https://open.spotify.com/search/Can't%20Stop%20the%20Feeling%20Justin%20Timberlake",
      youtube: "https://www.youtube.com/watch?v=ru0K8uYEZWw",
      youtubeId: "ru0K8uYEZWw",
    },
    {
      title: "Uptown Funk",
      artist: "Mark Ronson ft. Bruno Mars",
      genre: "Funk Pop",
      energy: "High",
      duration: "4:30",
      note: "A glossy, celebratory track when the camera catches a genuinely upbeat moment.",
      spotify: "https://open.spotify.com/search/Uptown%20Funk%20Mark%20Ronson%20Bruno%20Mars",
      youtube: "https://www.youtube.com/watch?v=OPf0YbXqDm0",
      youtubeId: "OPf0YbXqDm0",
    },
    {
      title: "Best Day Of My Life",
      artist: "American Authors",
      genre: "Indie Pop",
      energy: "High",
      duration: "3:14",
      note: "A bright momentum pick that keeps cheerful sessions from flattening out.",
      spotify: "https://open.spotify.com/search/Best%20Day%20Of%20My%20Life%20American%20Authors",
      youtube: "https://www.youtube.com/watch?v=Y66j_BUCBMY",
      youtubeId: "Y66j_BUCBMY",
    },
  ],
  sad: [
    {
      title: "Let Her Go",
      artist: "Passenger",
      genre: "Acoustic",
      energy: "Low",
      duration: "4:12",
      note: "Gentle and reflective when the detected mood leans heavy.",
      spotify: "https://open.spotify.com/search/Let%20Her%20Go%20Passenger",
      youtube: "https://www.youtube.com/watch?v=RBumgq5yVrA",
      youtubeId: "RBumgq5yVrA",
    },
    {
      title: "Someone You Loved",
      artist: "Lewis Capaldi",
      genre: "Soul Pop",
      energy: "Low",
      duration: "3:02",
      note: "A slow emotional reset for quieter moments.",
      spotify: "https://open.spotify.com/search/Someone%20You%20Loved%20Lewis%20Capaldi",
      youtube: "https://www.youtube.com/watch?v=zABLecsR5UE",
      youtubeId: "zABLecsR5UE",
    },
    {
      title: "Someone Like You",
      artist: "Adele",
      genre: "Ballad",
      energy: "Low",
      duration: "4:45",
      note: "A slower, fuller recommendation when the expression stays deeply reflective.",
      spotify: "https://open.spotify.com/search/Someone%20Like%20You%20Adele",
      youtube: "https://www.youtube.com/watch?v=hLQl3WQQoQ0",
      youtubeId: "hLQl3WQQoQ0",
    },
    {
      title: "When I Was Your Man",
      artist: "Bruno Mars",
      genre: "Piano Pop",
      energy: "Low",
      duration: "3:34",
      note: "Soft and honest, better for low-energy moods than forcing a quick uplift.",
      spotify: "https://open.spotify.com/search/When%20I%20Was%20Your%20Man%20Bruno%20Mars",
      youtube: "https://www.youtube.com/watch?v=ekzHIouo8Q4",
      youtubeId: "ekzHIouo8Q4",
    },
  ],
  angry: [
    {
      title: "Believer",
      artist: "Imagine Dragons",
      genre: "Alternative Rock",
      energy: "High",
      duration: "3:24",
      note: "Turns tense energy into momentum instead of noise.",
      spotify: "https://open.spotify.com/search/Believer%20Imagine%20Dragons",
      youtube: "https://www.youtube.com/watch?v=7wtfhZwyrcc",
      youtubeId: "7wtfhZwyrcc",
    },
    {
      title: "Numb",
      artist: "Linkin Park",
      genre: "Rock",
      energy: "High",
      duration: "3:08",
      note: "A more intense outlet when the reading skews frustrated.",
      spotify: "https://open.spotify.com/search/Numb%20Linkin%20Park",
      youtube: "https://www.youtube.com/watch?v=kXYiU_JCYtU",
      youtubeId: "kXYiU_JCYtU",
    },
    {
      title: "Stronger",
      artist: "Kanye West",
      genre: "Hip-Hop",
      energy: "High",
      duration: "5:12",
      note: "Pushes heated energy forward without dropping the pace of the session.",
      spotify: "https://open.spotify.com/search/Stronger%20Kanye%20West",
      youtube: "https://www.youtube.com/watch?v=PsO6ZnUZI0g",
      youtubeId: "PsO6ZnUZI0g",
    },
    {
      title: "Titanium",
      artist: "David Guetta ft. Sia",
      genre: "Dance Pop",
      energy: "High",
      duration: "4:05",
      note: "A big, resilient chorus that redirects anger into confidence.",
      spotify: "https://open.spotify.com/search/Titanium%20David%20Guetta%20Sia",
      youtube: "https://www.youtube.com/watch?v=JRfuAukYTKg",
      youtubeId: "JRfuAukYTKg",
    },
  ],
  neutral: [
    {
      title: "Perfect",
      artist: "Ed Sheeran",
      genre: "Pop",
      energy: "Steady",
      duration: "4:23",
      note: "A calm baseline track when the expression stays centered.",
      spotify: "https://open.spotify.com/search/Perfect%20Ed%20Sheeran",
      youtube: "https://www.youtube.com/watch?v=2Vv-BfVoq4g",
      youtubeId: "2Vv-BfVoq4g",
    },
    {
      title: "Photograph",
      artist: "Ed Sheeran",
      genre: "Acoustic Pop",
      energy: "Steady",
      duration: "4:19",
      note: "Warm and unobtrusive when the room feels balanced.",
      spotify: "https://open.spotify.com/search/Photograph%20Ed%20Sheeran",
      youtube: "https://www.youtube.com/watch?v=nSDgHBxUbVQ",
      youtubeId: "nSDgHBxUbVQ",
    },
    {
      title: "Counting Stars",
      artist: "OneRepublic",
      genre: "Pop Rock",
      energy: "Medium",
      duration: "4:18",
      note: "Keeps a neutral reading engaged without pushing too bright or too heavy.",
      spotify: "https://open.spotify.com/search/Counting%20Stars%20OneRepublic",
      youtube: "https://www.youtube.com/watch?v=hT_nvWreIhg",
      youtubeId: "hT_nvWreIhg",
    },
    {
      title: "Yellow",
      artist: "Coldplay",
      genre: "Alternative",
      energy: "Steady",
      duration: "4:29",
      note: "Softly atmospheric and easy to live with during calm stretches.",
      spotify: "https://open.spotify.com/search/Yellow%20Coldplay",
      youtube: "https://www.youtube.com/watch?v=yKNxeF4KMsY",
      youtubeId: "yKNxeF4KMsY",
    },
  ],
  surprise: [
    {
      title: "On Top of the World",
      artist: "Imagine Dragons",
      genre: "Indie Pop",
      energy: "Elevated",
      duration: "3:12",
      note: "Celebratory energy for wide-eyed, high-lift reactions.",
      spotify: "https://open.spotify.com/search/On%20Top%20of%20the%20World%20Imagine%20Dragons",
      youtube: "https://www.youtube.com/watch?v=w5tWYmIOWGk",
      youtubeId: "w5tWYmIOWGk",
    },
    {
      title: "Thunder",
      artist: "Imagine Dragons",
      genre: "Electro Pop",
      energy: "Elevated",
      duration: "3:07",
      note: "Keeps the unexpected feeling playful and cinematic.",
      spotify: "https://open.spotify.com/search/Thunder%20Imagine%20Dragons",
      youtube: "https://www.youtube.com/watch?v=fKopy74weus",
      youtubeId: "fKopy74weus",
    },
    {
      title: "Firework",
      artist: "Katy Perry",
      genre: "Pop",
      energy: "Elevated",
      duration: "3:48",
      note: "A bigger, flashier pick for delighted or stunned reactions.",
      spotify: "https://open.spotify.com/search/Firework%20Katy%20Perry",
      youtube: "https://www.youtube.com/watch?v=QGJuMBdaqIw",
      youtubeId: "QGJuMBdaqIw",
    },
    {
      title: "Roar",
      artist: "Katy Perry",
      genre: "Pop",
      energy: "High",
      duration: "3:43",
      note: "A confident surprise lane when the room suddenly wakes up.",
      spotify: "https://open.spotify.com/search/Roar%20Katy%20Perry",
      youtube: "https://www.youtube.com/watch?v=CevxZvSJLk8",
      youtubeId: "CevxZvSJLk8",
    },
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

    if (nextDetection.confidence < 0.25) {
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
            label="Facial Emotion-Based Music Recommendation System"
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
          label="Facial Emotion-Based Music Recommendation System"
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
                <span style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600 }}>Emotune (V1 Baseline)</span>
                <button
                  className="quick-link"
                  type="button"
                  style={{ margin: 0, padding: '8px 16px', fontSize: '0.8rem', cursor: 'pointer' }}
                  onClick={() => setApplicationMode('DEVELOPER')}
                >
                  Switch to Emoflow (V2) &rarr;
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
