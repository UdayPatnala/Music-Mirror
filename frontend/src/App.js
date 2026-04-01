import { useState, useEffect } from "react";
import axios from "axios";
import Camera from "./components/Camera";
import EmotionCard from "./components/EmotionCard";
import SongCard from "./components/SongCard";

export default function App() {
  const [emotion, setEmotion] = useState("");
  const [songs, setSongs] = useState([]);

  // ✅ HARD-CODED BACKEND URL (IMPORTANT)
  const API_URL = "https://emotion-music-recommender-wruw.onrender.com";

  useEffect(() => {
    if (!emotion) return;

    // Normalize emotion name for backend
    const normalizedEmotion =
      emotion === "surprised" ? "surprise" : emotion;

    axios
      .post(`${API_URL}/recommend`, {
        emotion: normalizedEmotion,
      })
      .then((res) => {
        console.log("API Response:", res.data); // 🔍 debug
        setSongs(res.data.songs || []);
      })
      .catch((err) => {
        console.error("Error fetching songs:", err);
        setSongs([]);
      });
  }, [emotion]);

  return (
    <div className="container">
      <h1>Emotion-Based Music Recommendation</h1>

      {/* Camera detects facial emotion */}
      <Camera onEmotion={setEmotion} />

      {/* Show detected emotion */}
      {emotion && <EmotionCard emotion={emotion} />}

      {/* Show recommended songs */}
      {songs.length > 0 ? (
        songs.map((song, index) => (
          <SongCard key={index} song={song} />
        ))
      ) : (
        emotion && <p>Loading songs...</p>
      )}
    </div>
  );
}