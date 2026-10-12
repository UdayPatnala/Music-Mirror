import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AuthScreen from "./components/AuthScreen";
import BrandLockup from "./components/BrandLockup";
import Camera from "./components/Camera";
import EmotionCard, { emotionLabels } from "./components/EmotionCard";
import HistoryPanel from "./components/HistoryPanel";
import NowPlaying from "./components/NowPlaying";
import SongCard from "./components/SongCard";

const CURRENT_HOSTNAME =
  typeof window !== "undefined" && window.location
    ? window.location.hostname
    : "localhost";

const DEFAULT_API_URL = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
  CURRENT_HOSTNAME
)
  ? "http://127.0.0.1:8000"
  : "https://emotion-music-recommender-wruw.onrender.com";

const ENV_API_URL =
  typeof process !== "undefined" && process.env && process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL
    : "";

const API_URL = ENV_API_URL || DEFAULT_API_URL;
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

const EMOTION_MAP = {
  surprised: "surprise",
  fearful: "sad",
  disgusted: "angry",
};

export function normalizeEmotion(emotion) {
  const cleaned = String(emotion || "happy").trim().toLowerCase();
  return EMOTION_MAP[cleaned] || cleaned;
}

export const FALLBACK_SONGS_BY_EMOTION = {
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

const BROKEN_YOUTUBE_ID_PATTERN = /(89mJ0y8J-0|ZJkY98J-0|_R9uRj-A|^0+$)/i;

export function isValidV1Song(song) {
  if (!song || typeof song !== "object") return false;
  const title = String(song.title || song.name || "").trim();
  const artist = String(song.artist || "").trim();
  const youtubeId = String(song.youtubeId || song.youtube_id || "").trim();

  if (!title || !artist) return false;
  if (/mirror\s*(track|artist|album)/i.test(`${title} ${artist}`)) return false;
  if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) return false;
  if (BROKEN_YOUTUBE_ID_PATTERN.test(youtubeId)) return false;
  if (typeof song.note !== "string" || !song.note.trim()) return false;

  return true;
}

export function normalizeSong(song) {
  const title = String(song.title || song.name || "Untitled Track").trim();
  const artist = String(song.artist || "Unknown Artist").trim();
  const youtubeId = String(song.youtubeId || song.youtube_id || "").trim();
  const genre = String(song.genre || "Pop").trim();
  const energy =
    typeof song.energy === "number"
      ? song.energy > 0.7
        ? "High"
        : song.energy > 0.4
          ? "Medium"
          : "Low"
      : String(song.energy || "Steady").trim();
  const duration =
    song.duration_str ||
    (typeof song.duration === "number"
      ? `${Math.floor(song.duration / 60)}:${String(
          Math.floor(song.duration % 60)
        ).padStart(2, "0")}`
      : String(song.duration || "3:30").trim());
  const note = String(
    song.note ||
      song.recommendation_reason ||
      "Curated emotion track for your listening session."
  ).trim();
  const spotify =
    song.spotify ||
    song.spotify_url ||
    `https://open.spotify.com/search/${encodeURIComponent(`${title} ${artist}`)}`;
  const youtube =
    song.youtube || `https://www.youtube.com/watch?v=${youtubeId}`;

  return {
    title,
    artist,
    genre,
    energy,
    duration,
    note,
    spotify,
    youtube,
    youtubeId,
  };
}

export function resolvePlayableCatalog(rawSongs, emotion) {
  const normalized = normalizeEmotion(emotion);
  const fallback =
    FALLBACK_SONGS_BY_EMOTION[normalized] || FALLBACK_SONGS_BY_EMOTION.happy;

  if (!Array.isArray(rawSongs) || rawSongs.length === 0) {
    return fallback;
  }

  const validSongs = rawSongs.filter(isValidV1Song).map(normalizeSong);
  if (validSongs.length === 0) {
    return fallback;
  }

  return validSongs;
}

function readStorage(key, fallbackValue) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallbackValue;
  } catch (error) {
    console.error(`Could not read ${key} from local storage`, error);
    return fallbackValue;
  }
}

export function readProfileStorage() {
  const raw = readStorage(STORAGE_KEYS.profile, null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  if (!name || !email) return null;
  return {
    name,
    email,
    genre:
      typeof raw.genre === "string" && raw.genre.trim()
        ? raw.genre.trim()
        : "Pop",
    goal:
      typeof raw.goal === "string" && raw.goal.trim()
        ? raw.goal.trim()
        : "Match my mood",
  };
}

export function readFavoritesStorage() {
  const raw = readStorage(STORAGE_KEYS.favorites, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidV1Song).map(normalizeSong);
}

export function readHistoryStorage() {
  const raw = readStorage(STORAGE_KEYS.history, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => {
      if (!item || typeof item !== "object") return false;
      const title = String(item.title || item.name || "").trim();
      const artist = String(item.artist || "").trim();
      if (!title || !artist) return false;
      if (/mirror\s*(track|artist|album)/i.test(`${title} ${artist}`)) {
        return false;
      }
      return true;
    })
    .map((item, index) => {
      const emotion = String(item.emotion || item.playlistEmotion || "happy")
        .trim()
        .toLowerCase();
      const normalizedMood = normalizeEmotion(
        item.playlistEmotion || item.emotion || "happy"
      );
      const playlistEmotion = FALLBACK_SONGS_BY_EMOTION[normalizedMood]
        ? normalizedMood
        : "happy";
      return {
        id: String(item.id || `hist-${index}-${Date.now()}`),
        emotion: emotionLabels[emotion] ? emotion : playlistEmotion,
        playlistEmotion,
        source: item.source === "manual" ? "manual" : "camera",
        title: String(item.title || item.name).trim(),
        artist: String(item.artist).trim(),
        timestamp: item.timestamp || new Date().toISOString(),
      };
    });
}

function songKey(song) {
  return `${song.title || song.name}::${song.artist}`;
}

function formatTimestamp(isoValue) {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "No scans yet";
  }
  return date.toLocaleTimeString([], {
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
  const [profile, setProfile] = useState(() => readProfileStorage());
  const [favorites, setFavorites] = useState(() => readFavoritesStorage());
  const [history, setHistory] = useState(() => readHistoryStorage());
  const [detection, setDetection] = useState({
    emotion: "",
    confidence: 0,
    scores: [],
    source: "camera",
  });
  const [requestedEmotion, setRequestedEmotion] = useState("happy");
  const [playlistEmotion, setPlaylistEmotion] = useState("happy");
  const [songs, setSongs] = useState(FALLBACK_SONGS_BY_EMOTION.happy);
  const [selectedSong, setSelectedSong] = useState(
    FALLBACK_SONGS_BY_EMOTION.happy[0]
  );
  const [playerMode, setPlayerMode] = useState("youtube");
  const [requestState, setRequestState] = useState("success");
  const [errorMessage, setErrorMessage] = useState("");
  const [cameraBatch, setCameraBatch] = useState([]);
  const [pendingMoodChange, setPendingMoodChange] = useState(null);
  const [scanId, setScanId] = useState(0);
  const cameraBatchRef = useRef([]);
  const hasLockedMoodRef = useRef(false);

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
    const normalizedRequested = normalizeEmotion(requestedEmotion);
    const shouldRecordHistory = hasLockedMoodRef.current;

    const recordScanHistory = (nextSongs, nextPlaylistEmotion) => {
      if (!shouldRecordHistory || nextSongs.length === 0) return;

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
    };

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
        const nextPlaylistEmotion = normalizeEmotion(
          data.normalized_emotion || requestedEmotion
        );
        const nextSongs = resolvePlayableCatalog(
          data.songs,
          nextPlaylistEmotion
        );

        setSongs(nextSongs);
        setPlaylistEmotion(nextPlaylistEmotion);
        setRequestState("success");
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

        recordScanHistory(nextSongs, nextPlaylistEmotion);
      } catch (error) {
        if (ignore) return;

        const fallback = resolvePlayableCatalog([], normalizedRequested);
        setSongs(fallback);
        setPlaylistEmotion(normalizedRequested);
        setSelectedSong((currentSong) => {
          if (
            currentSong &&
            fallback.some((song) => songKey(song) === songKey(currentSong))
          ) {
            return currentSong;
          }

          return fallback[0] || null;
        });
        setRequestState("success");
        setPendingMoodChange(null);
        recordScanHistory(fallback, normalizedRequested);
      }
    };

    fetchSongs();

    return () => {
      ignore = true;
    };
  }, [detection.source, profile, requestedEmotion, scanId]);

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
      const mood = normalizeEmotion(
        item?.playlistEmotion || item?.emotion || "happy"
      );
      if (emotionLabels[mood]) {
        result[mood] = (result[mood] || 0) + 1;
      }
      return result;
    }, {});

    const topMoodEntry =
      Object.entries(counts).sort((left, right) => right[1] - left[1])[0] ||
      [];

    return {
      topMood: topMoodEntry[0] || "happy",
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
    hasLockedMoodRef.current = false;
    setProfile(null);
    setRequestedEmotion("happy");
    setPlaylistEmotion("happy");
    setSongs(FALLBACK_SONGS_BY_EMOTION.happy);
    setSelectedSong(FALLBACK_SONGS_BY_EMOTION.happy[0]);
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

  const handleDetection = useCallback(
    (nextDetection) => {
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

      if (
        !hasLockedMoodRef.current ||
        !requestedEmotion ||
        !selectedSong ||
        requestState !== "success"
      ) {
        hasLockedMoodRef.current = true;
        setRequestedEmotion(stableEmotion);
        setScanId((current) => current + 1);
        setPendingMoodChange(null);
        return;
      }

      if (
        stableEmotion === requestedEmotion ||
        normalizeEmotion(stableEmotion) === normalizeEmotion(requestedEmotion)
      ) {
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
    hasLockedMoodRef.current = true;
    setDetection({
      emotion,
      confidence: 1,
      scores: [[emotion, 1]],
      source: "manual",
    });
    setPendingMoodChange(null);
    resetCameraBatch();
    setRequestedEmotion(emotion);
    setScanId((current) => current + 1);
  };

  const handleToggleFavorite = useCallback((song) => {
    const normalized = normalizeSong(song);
    const key = songKey(normalized);

    setFavorites((currentFavorites) => {
      if (currentFavorites.some((item) => songKey(item) === key)) {
        return currentFavorites.filter((item) => songKey(item) !== key);
      }

      return [normalized, ...currentFavorites].slice(0, 12);
    });
  }, []);

  const handleAcceptSuggestedMood = () => {
    if (!pendingMoodChange) return;

    hasLockedMoodRef.current = true;
    setRequestedEmotion(pendingMoodChange.emotion);
    setScanId((current) => current + 1);
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
        {pendingMoodChange && (
          <div className="mood-floating premium">
            <div className="mood-floating-text">
              Switch to {emotionLabels[pendingMoodChange.emotion]}
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
