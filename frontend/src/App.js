import { useEffect, useState } from "react";
import axios from "axios";
import Camera from "./components/Camera";
import EmotionCard from "./components/EmotionCard";
import SongCard from "./components/SongCard";

const DEFAULT_API_URL =
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:8000"
    : "https://emotion-music-recommender-wruw.onrender.com";

const API_URL = process.env.REACT_APP_API_URL || DEFAULT_API_URL;

export default function App() {
  const [emotion, setEmotion] = useState("");
  const [playlistEmotion, setPlaylistEmotion] = useState("");
  const [songs, setSongs] = useState([]);
  const [requestState, setRequestState] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!emotion) return;

    let ignore = false;

    const fetchSongs = async () => {
      setRequestState("loading");
      setErrorMessage("");
      setSongs([]);
      setPlaylistEmotion("");

      try {
        const response = await axios.post(`${API_URL}/recommend`, { emotion });
        if (ignore) return;

        const nextSongs = Array.isArray(response.data.songs)
          ? response.data.songs
          : [];
        const nextPlaylistEmotion = response.data.normalized_emotion || "";

        setSongs(nextSongs);
        setPlaylistEmotion(nextPlaylistEmotion);
        setRequestState(nextSongs.length > 0 ? "success" : "empty");
      } catch (error) {
        if (ignore) return;

        console.error("Error fetching songs:", error);
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
  }, [emotion]);

  return (
    <div className="container">
      <header className="hero">
        <p className="eyebrow">Real-time webcam demo</p>
        <h1>Emotion-Based Music Recommendation</h1>
        <p className="hero-copy">
          Detect a facial expression in the browser and match it to a small,
          curated music mood.
        </p>
      </header>

      <Camera onEmotion={setEmotion} />

      {emotion && (
        <EmotionCard
          detectedEmotion={emotion}
          playlistEmotion={playlistEmotion}
        />
      )}

      {emotion && requestState === "loading" && (
        <p className="status-text">Finding songs for this mood...</p>
      )}

      {emotion && requestState === "error" && (
        <p className="status-text error">{errorMessage}</p>
      )}

      {emotion && requestState === "empty" && (
        <p className="status-text">
          No songs are configured yet for the {playlistEmotion || emotion} mood.
        </p>
      )}

      {requestState === "success" && (
        <div className="song-grid">
          {songs.map((song) => (
            <SongCard key={`${song.title}-${song.artist}`} song={song} />
          ))}
        </div>
      )}
    </div>
  );
}
