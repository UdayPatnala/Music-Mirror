import { useState, useEffect } from "react";
import axios from "axios";
import Camera from "./components/Camera";
import EmotionCard from "./components/EmotionCard";
import SongCard from "./components/SongCard";

export default function App() {
  const [emotion, setEmotion] = useState("");
  const [songs, setSongs] = useState([]);

  useEffect(() => {
    if (!emotion) return;

    // Normalize emotion name for backend
    const normalizedEmotion =
      emotion === "surprised" ? "surprise" : emotion;

    axios
      .post(`${process.env.REACT_APP_API_URL}/recommend`, {
        emotion: normalizedEmotion,
      })
      .then((res) => {
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
      {songs.map((song, index) => (
        <SongCard key={index} song={song} />
      ))}
    </div>
  );
}
