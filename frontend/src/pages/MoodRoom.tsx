// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from "../api/client";
import { useAppStore } from "../store/useAppStore";

import BrandLockup from "../components/BrandLockup";
import Camera from "../components/Camera";
import EmotionCard, { emotionLabels } from "../components/EmotionCard";
import HistoryPanel from "../components/HistoryPanel";
import NowPlaying from "../components/NowPlaying";
import SongCard from "../components/SongCard";

const CAMERA_BATCH_SIZE = 3;

function songKey(song) {
  return `${song.title}::${song.artist}`;
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
  return batch.map(({ emotion }) => emotionLabels[emotion] || emotion).join(", ");
}

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function MoodRoom() {
  const profile = useAppStore(state => state.profile);
  const clearProfile = useAppStore(state => state.clearProfile);

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
        const response = await apiClient.post(`/recommend`, {
          emotion: requestedEmotion,
          genre: profile.genre,
          goal: profile.goal,
        });
        if (ignore) return;
        const nextSongs = Array.isArray(response.data.songs) ? response.data.songs : [];
        const nextPlaylistEmotion = response.data.normalized_emotion || "";
        
        setSongs(nextSongs);
        setPlaylistEmotion(nextPlaylistEmotion);
        setRequestState(nextSongs.length > 0 ? "success" : "empty");
        setPendingMoodChange(null);
        setSelectedSong((currentSong) => {
          if (currentSong && nextSongs.some((song) => songKey(song) === songKey(currentSong))) {
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
            if (currentHistory[0] && currentHistory[0].emotion === nextEntry.emotion && currentHistory[0].title === nextEntry.title) {
              return currentHistory;
            }
            return [nextEntry, ...currentHistory].slice(0, 10);
          });
        }
      } catch (error) {
        if (ignore) return;
        setSongs([]);
        setSelectedSong(null);
        setRequestState("error");
        setErrorMessage("Could not load songs.");
      }
    };
    fetchSongs();
    return () => { ignore = true; };
  }, [detection.source, profile, requestedEmotion]);

  const favoriteKeys = useMemo(() => new Set(favorites.map((song) => songKey(song))), [favorites]);

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

  const activeMood = playlistEmotion || requestedEmotion;
  const activeMoodLabel = activeMood ? emotionLabels[activeMood] || activeMood : "Waiting for a mood";
  const greetingName = profile?.name || "Listener";

  const handleLogout = () => {
    clearProfile();
  };

  const handleDetection = useCallback((nextDetection) => {
    setDetection(nextDetection);
    if (nextDetection.confidence < 0.5) return;

    const nextBatch = [...cameraBatchRef.current, nextDetection].slice(0, CAMERA_BATCH_SIZE);
    cameraBatchRef.current = nextBatch;
    setCameraBatch(nextBatch);

    if (nextBatch.length < CAMERA_BATCH_SIZE) return;

    const stableEmotion = resolveStableEmotion(nextBatch);
    cameraBatchRef.current = [];
    setCameraBatch([]);

    setDetection({ ...nextDetection, emotion: stableEmotion, source: "camera" });

    if (!requestedEmotion || !selectedSong || requestState !== "success") {
      setRequestedEmotion(stableEmotion);
      setPendingMoodChange(null);
      return;
    }

    if (stableEmotion === requestedEmotion) {
      setPendingMoodChange(null);
      return;
    }

    setPendingMoodChange({ emotion: stableEmotion });
  }, [requestedEmotion, selectedSong, requestState]);

  const handleManualMood = (emotion) => {
    setDetection({ emotion, confidence: 1, scores: [[emotion, 1]], source: "manual" });
    setPendingMoodChange(null);
    cameraBatchRef.current = [];
    setCameraBatch([]);
    setRequestedEmotion(emotion);
  };

  return (
    <div className="app-shell">
      <div className="app-noise" />
      <header className="topbar">
        <BrandLockup label="Emotion-aware music room" labelClassName="topbar-label" />
        <div className="topbar-actions">
          <div className="profile-chip">
            <span>{greetingName}</span>
            <small>{profile?.genre} focus</small>
          </div>
          <Link to="/summary" className="ghost-btn">Summary</Link>
          <button className="ghost-btn" onClick={handleLogout} type="button">Log out</button>
        </div>
      </header>

      <section className="poster">
        <div className="poster-copy">
          <p className="eyebrow">Live recommendation studio</p>
          <h2>Music that adapts to your face, your mood, and your session.</h2>
          <div className="poster-meta">
            <div>
              <span className="meta-label">Current lane</span>
              <strong>{activeMoodLabel}</strong>
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

      <main className="workspace">
        <section className="workspace-main">
          <section className="panel capture-panel" id="capture-panel">
            <Camera onEmotion={handleDetection} />
            <div className="manual-moods" style={{marginTop: '20px'}}>
               {["happy", "sad", "angry", "neutral"].map(m => (
                 <button key={m} className="mood-pill" onClick={() => handleManualMood(m)}>{m}</button>
               ))}
            </div>
          </section>

          <EmotionCard detection={detection} playlistEmotion={playlistEmotion} />

          <section className="panel recommendations-panel" id="queue-panel">
            {requestState === "success" && (
              <div className="recommendation-list">
                {songs.map((song) => (
                  <SongCard
                    key={songKey(song)}
                    isActive={selectedSong ? songKey(song) === songKey(selectedSong) : false}
                    isFavorite={favoriteKeys.has(songKey(song))}
                    onPlay={setSelectedSong}
                    song={song}
                  />
                ))}
              </div>
            )}
          </section>
        </section>
        
        <aside className="workspace-side">
          <HistoryPanel history={history} />
        </aside>
      </main>
    </div>
  );
}
