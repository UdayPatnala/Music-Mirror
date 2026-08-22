/**
 * ============================================================================
 * B.Tech CSE Final Year Project — Music Mirror (Stage 3 & 4 Submission)
 * Originally developed by: Student 1 (Roll: 1601-22-733-045) - April 2026
 * ----------------------------------------------------------------------------
 * Contribution: Designed initial local playback logic, HTML5 audio context,
 * queue state updates, and three-column Studio control layout.
 * ============================================================================
 * Solo Upgrades (Student Project Lead - Months 8-10):
 *  - Replaced the simple simulated music ticker with real YouTube IFrame playback.
 *  - Added the YouTubeDiscoveryService for query expansions (5-level ladder).
 *  - Integrated PlaybackStateMachine to drive detailed live status text.
 *  - Implemented the YouTubeRecoveryEngine to automatically skip unplayable or
 *    embedding-restricted videos sequentially (debounced fallback ladder).
 * ============================================================================
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import Camera from "../components/Camera";
import type { DetectionResult } from "../components/Camera";
import Navbar from "../components/Navbar";
import { useAppStore } from "../store/useAppStore";
import type { Song } from "../types";
import { JamendoProviderAdapter } from "../architecture/layers/ProviderAdapterLayer/JamendoProviderAdapter";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, RefreshCw, Sparkles, ChevronLeft, ChevronRight, Music, Heart, AlertCircle } from "lucide-react";
import { youtubePlaybackAdapter } from "../architecture/layers/PlaybackLayer/YouTubePlaybackAdapter";
import { discoverYouTubeCandidates } from "../services/YouTubeDiscoveryService";
import { YouTubeRecoveryEngine } from "../services/YouTubeRecoveryEngine";
import { PlaybackStateMachine } from "../architecture/layers/PlaybackLayer/PlaybackStateMachine";
import type { PlaybackMachineState } from "../architecture/layers/PlaybackLayer/PlaybackStateMachine";

/* ─── Emotion configuration ──────────────────────────────── */
const MOODS = ["calm", "happy", "sad", "energetic", "focused", "romantic", "neutral"];

const MOOD_COLOR: Record<string, string> = {
  calm:      "#8C2548",
  happy:     "#D5A85C",
  sad:       "#5B6478",
  energetic: "#9E3155",
  focused:   "#6E1835",
  romantic:  "#C24B70",
  neutral:   "#7E7477",
};

const MOOD_LABEL: Record<string, string> = {
  calm:      "Calm & Peaceful",
  happy:     "Upbeat & Joyful",
  sad:       "Melancholy & Soft",
  energetic: "High Energy",
  focused:   "Deep Focus",
  romantic:  "Romantic & Warm",
  neutral:   "Balanced Neutral",
};

/* ─── Source-specific catalog data ────────────────────────── */
/* ─── Source-specific catalog data ────────────────────────── */
const PROVIDER_CATALOGS: Record<string, Song[]> = {
  youtube: [
    { name: "Buttabomma",       artist: "Armaan Malik",    genre: "Telugu Pop",  language: "Telugu",  source_provider: "YouTube", youtubeId: "A6BJ-PgNWXA", preview_url: "https://prod-1.storage.jamendo.com/download/track/1820491/mp32/" },
    { name: "Samajavaragamana", artist: "Sid Sriram",      genre: "Telugu Soul", language: "Telugu",  source_provider: "YouTube", youtubeId: "E3BnMDc9ATE", preview_url: "https://prod-1.storage.jamendo.com/download/track/1158428/mp32/" },
    { name: "Blinding Lights",  artist: "The Weeknd",      genre: "Synthpop",    language: "English", source_provider: "YouTube", youtubeId: "4NRXx6U8ABQ", preview_url: "https://prod-1.storage.jamendo.com/download/track/1880003/mp32/" },
    { name: "Ramuloo Ramulaa",  artist: "Anurag Kulkarni", genre: "Telugu Folk", language: "Telugu",  source_provider: "YouTube", youtubeId: "A6BJ-PgNWXA", preview_url: "https://prod-1.storage.jamendo.com/download/track/1532771/mp32/" },
    { name: "Ennenno Janmala",  artist: "Sid Sriram",      genre: "Telugu Soul", language: "Telugu",  source_provider: "YouTube", youtubeId: "_dXwkfq5YG8", preview_url: "https://prod-1.storage.jamendo.com/download/track/1849102/mp32/" },
    { name: "Kannazhaga",       artist: "Mohit Chauhan",   genre: "Tamil Soul",  language: "Tamil",   source_provider: "YouTube", youtubeId: "9oNvxVFsm5U", preview_url: "https://prod-1.storage.jamendo.com/download/track/1473953/mp32/" },
    { name: "Levitating",       artist: "Dua Lipa",        genre: "Pop",         language: "English", source_provider: "YouTube", youtubeId: "TUVcZfQe-Kw", preview_url: "https://prod-1.storage.jamendo.com/download/track/1689240/mp32/" },
  ],
  jamendo: [
    { name: "Midnight Synth Drive",  artist: "Solaris",      genre: "Synthwave",   language: "English", source_provider: "Jamendo", preview_url: "https://prod-1.storage.jamendo.com/download/track/1880003/mp32/" },
    { name: "Lofi Chill Ambient",   artist: "Acoustica",    genre: "Lo-Fi",       language: "English", source_provider: "Jamendo", preview_url: "https://prod-1.storage.jamendo.com/download/track/1473953/mp32/" },
    { name: "Acoustic Sunrise",     artist: "Elysium Duo",  genre: "Acoustic",    language: "English", source_provider: "Jamendo", preview_url: "https://prod-1.storage.jamendo.com/download/track/1158428/mp32/" },
    { name: "Neon Horizons",        artist: "Synth Explorer",genre: "Chillstep",  language: "English", source_provider: "Jamendo", preview_url: "https://prod-1.storage.jamendo.com/download/track/1789421/mp32/" },
    { name: "Deep Focus Drift",     artist: "Zenith Studio",genre: "Ambient",     language: "English", source_provider: "Jamendo", preview_url: "https://prod-1.storage.jamendo.com/download/track/18000124/mp32/" },
  ],
  local: [
    { name: "Local Disk Track 01", artist: "Local Artist", genre: "Unsorted", language: "English", source_provider: "Local", preview_url: "https://prod-1.storage.jamendo.com/download/track/1880003/mp32/" },
    { name: "Local Disk Track 02", artist: "Local Artist", genre: "Unsorted", language: "English", source_provider: "Local", preview_url: "https://prod-1.storage.jamendo.com/download/track/1473953/mp32/" },
    { name: "Local Disk Track 03", artist: "Local Artist", genre: "Unsorted", language: "English", source_provider: "Local", preview_url: "https://prod-1.storage.jamendo.com/download/track/1158428/mp32/" },
  ]
};

const key = (s: Song) => `${s.title || s.name}::${s.artist}`;

export default function MoodRoom() {
  const activeMood = useAppStore(s => s.activeMood);
  const setActiveMood = useAppStore(s => s.setActiveMood);
  const currentSong = useAppStore(s => s.currentSong);
  const setCurrentSong = useAppStore(s => s.setCurrentSong);
  const songsQueue = useAppStore(s => s.songsQueue);
  const setSongsQueue = useAppStore(s => s.setSongsQueue);
  const playerMode = useAppStore(s => s.playerMode);
  const toggleFav = useAppStore(s => s.toggleFav);
  const favs = useAppStore(s => s.favs);

  // Keep live refs to avoid stale closures in audio event handlers
  const songsQueueRef = useRef<Song[]>([]);
  const currentSongRef = useRef<Song | null>(null);
  songsQueueRef.current = songsQueue;
  currentSongRef.current = currentSong;

  const [camOpen, setCamOpen] = useState(true);
  const [isBioCollapsed, setIsBioCollapsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(38); // percentage
  const [currentTimeStr, setCurrentTimeStr] = useState("1:24");
  const [durationStr, setDurationStr] = useState("3:40");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState("");

  // ── YouTube Discovery State Machine ─────────────────────────────────────
  const [ytMachineState, setYtMachineState] = useState<PlaybackMachineState>("IDLE");
  const [ytStatusMsg, setYtStatusMsg] = useState("");
  const [ytTopScore, setYtTopScore] = useState<number | null>(null);

  // Singleton state machine and recovery engine (stable refs)
  const stateMachineRef = useRef<PlaybackStateMachine>(new PlaybackStateMachine());
  const recoveryEngineRef = useRef<YouTubeRecoveryEngine | null>(null);

  // Mirror state machine transitions into React state for rendering
  useEffect(() => {
    const machine = stateMachineRef.current;
    const unsub = machine.subscribe((state, msg) => {
      setYtMachineState(state);
      setYtStatusMsg(msg);
    });
    return unsub;
  }, []);

  const isSearching = ytMachineState === "SEARCHING" || ytMachineState === "RANKING" ||
    ytMachineState === "VALIDATING" || ytMachineState === "PLAYER_LOADING" ||
    ytMachineState === "RECOVERING";

  /* Subscribe to session orchestrator playback state has been removed;
     MoodRoom owns its own audioRef element and manages playback directly */

  /* Synchronize catalog whenever playerMode or activeMood changes */
  useEffect(() => {
    let active = true;
    if (playerMode === 'jamendo') {
      const adapter = new JamendoProviderAdapter();
      adapter.searchCandidates({ moodLabel: activeMood } as any, undefined, 20).then((candidates) => {
        if (!active) return;
        if (candidates && candidates.length > 0) {
          const mapped: Song[] = candidates.map(c => ({
            id: c.id,
            name: c.title,
            title: c.title,
            artist: c.artist || c.artists[0] || 'Jamendo Artist',
            genre: c.genre || 'Jamendo CC',
            language: c.language || 'Instrumental',
            source_provider: 'Jamendo CC',
            preview_url: c.playbackRef,
            attributionText: c.attributionText,
          }));
          setSongsQueue(mapped);
          if (!currentSong || !mapped.some(s => key(s) === key(currentSong))) {
            setCurrentSong(mapped[0]);
          }
        }
      }).catch(() => {
        const catalog = PROVIDER_CATALOGS.jamendo;
        setSongsQueue(catalog);
      });
    } else {
      const catalog = PROVIDER_CATALOGS[playerMode] || PROVIDER_CATALOGS.youtube;
      setSongsQueue(catalog);
      if (!currentSong || !catalog.some(s => key(s) === key(currentSong))) {
        setCurrentSong(catalog[0]);
      }
    }
    return () => { active = false; };
  }, [playerMode, activeMood]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── HTML5 Audio Element Integration ───────────────────────── */
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    // volume is 0-1 range; no division needed
    audio.volume = 0.8;

    const handleTimeUpdate = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        const pct = (audio.currentTime / audio.duration) * 100;
        setProgress(pct);
        const curSec = Math.floor(audio.currentTime);
        const mins = Math.floor(curSec / 60);
        const secs = curSec % 60;
        setCurrentTimeStr(`${mins}:${secs < 10 ? '0' : ''}${secs}`);

        const durSec = Math.floor(audio.duration);
        const durMins = Math.floor(durSec / 60);
        const durSecs = durSec % 60;
        setDurationStr(`${durMins}:${durSecs < 10 ? '0' : ''}${durSecs}`);
      }
    };

    // Use refs to avoid stale closure — always reads live queue state
    const handleEnded = () => {
      const queue = songsQueueRef.current;
      const cur = currentSongRef.current;
      if (!queue.length) return;
      const curIdx = queue.findIndex(s => key(s) === key(cur || queue[0]));
      const nextIdx = (curIdx + 1) % queue.length;
      setCurrentSong(queue[nextIdx]);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopRecovery = useCallback(() => {
    if (recoveryEngineRef.current) {
      recoveryEngineRef.current.stop();
      recoveryEngineRef.current = null;
    }
    stateMachineRef.current.reset();
  }, []);

  const activeSong = currentSong || songsQueue[0] || PROVIDER_CATALOGS.jamendo[0];
  const isYouTubePlaying = playerMode === 'youtube' || activeSong?.source_provider === 'YouTube' || !!activeSong?.youtubeId;

  const triggerFallback = () => {
    if (recoveryEngineRef.current) {
      console.log("YouTube recovery engine reportFailure triggered");
      recoveryEngineRef.current.reportFailure();
      return;
    }
    const queue = songsQueueRef.current;
    const cur = currentSongRef.current;
    if (!queue.length || !cur) return;
    const curIdx = queue.findIndex(s => key(s) === key(cur));
    if (curIdx !== -1 && curIdx < queue.length - 1) {
      console.log(`Fallback skip: skipping from unplayable video to next: ${queue[curIdx + 1].title}`);
      setCurrentSong(queue[curIdx + 1]);
    } else {
      setSearchError("Selected video is unplayable (embedding disabled or restricted).");
    }
  };

  useEffect(() => {
    youtubePlaybackAdapter.initialize();
    
    const unsubscribe = youtubePlaybackAdapter.subscribe((event) => {
      if (!isYouTubePlaying) return;
      if (event.type === 'ended') {
        handleSkipNext();
      } else if (event.type === 'start') {
        stateMachineRef.current.transition('PLAYING');
        recoveryEngineRef.current?.reportSuccess();
      } else if (event.type === 'timeupdate') {
        const pos = youtubePlaybackAdapter.getPosition();
        const dur = youtubePlaybackAdapter.getDuration();
        if (dur > 0) {
          setProgress((pos / dur) * 100);
          const curSec = Math.floor(pos);
          const mins = Math.floor(curSec / 60);
          const secs = curSec % 60;
          setCurrentTimeStr(`${mins}:${secs < 10 ? '0' : ''}${secs}`);

          const durSec = Math.floor(dur);
          const durMins = Math.floor(durSec / 60);
          const durSecs = durSec % 60;
          setDurationStr(`${durMins}:${durSecs < 10 ? '0' : ''}${durSecs}`);
        }
      } else if (event.type === 'error') {
        triggerFallback();
      }
    });
    return () => unsubscribe();
  }, [isYouTubePlaying, songsQueue, currentSong]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isYouTubePlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (activeSong) {
        const candidate: any = {
          id: (activeSong as any).id || `yt_${activeSong.youtubeId || 'A6BJ-PgNWXA'}`,
          providerId: "youtube",
          providerTrackId: activeSong.youtubeId || "A6BJ-PgNWXA",
          title: activeSong.title || activeSong.name || "YouTube Video",
          artists: [activeSong.artist],
          artist: activeSong.artist,
          album: "YouTube",
          artworkUrl: activeSong.cover_image_url || `https://img.youtube.com/vi/${activeSong.youtubeId || 'A6BJ-PgNWXA'}/hqdefault.jpg`,
          albumArtUrl: activeSong.cover_image_url || `https://img.youtube.com/vi/${activeSong.youtubeId || 'A6BJ-PgNWXA'}/hqdefault.jpg`,
          duration: (activeSong as any).duration || 180,
          releaseInfo: "2026",
          canonicalGenres: ["YouTube"],
          genre: "YouTube",
          language: activeSong.language || "English",
          musicAttributes: { valence: 0.5, energy: 0.5, bpm: 120 },
          audioFeatures: { valence: 0.5, energy: 0.5, bpm: 120 },
          providerUrl: activeSong.preview_url || `https://www.youtube.com/watch?v=${activeSong.youtubeId || 'A6BJ-PgNWXA'}`,
          playbackRef: activeSong.youtubeId || "A6BJ-PgNWXA",
          playbackCapability: "officialEmbed",
          explicitContent: false,
          status: "available",
          relevanceScore: 1.0,
          recommendationScore: 1.0,
          recommendationReason: "Search Result",
          sourceMetadata: { source: "youtube_search" },
          retrievalTimestamp: Date.now(),
          attributionText: "YouTube IFrame",
        };
        
        youtubePlaybackAdapter.load(candidate).then(() => {
          youtubePlaybackAdapter.bindElement('youtube-player-element');
          if (isPlaying) {
            youtubePlaybackAdapter.play();
          }
        });
      }
    } else {
      youtubePlaybackAdapter.stop();
      
      const audio = audioRef.current;
      if (!audio || !activeSong) return;
      const streamUrl = activeSong.preview_url || (activeSong as any).playbackRef || "https://prod-1.storage.jamendo.com/download/track/1880003/mp32/";

      if ((activeSong as any).duration_str) {
         setDurationStr((activeSong as any).duration_str);
      } else if ((activeSong as any).duration && typeof (activeSong as any).duration === 'number') {
         const sec = (activeSong as any).duration;
         const m = Math.floor(sec / 60);
         const s = sec % 60;
         setDurationStr(`${m}:${s < 10 ? '0' : ''}${s}`);
      }

      if (audio.src !== streamUrl) {
        audio.src = streamUrl;
        if (isPlaying) {
          audio.play().catch(() => {
            setIsPlaying(false);
          });
        }
      }
    }
  }, [activeSong, isYouTubePlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isYouTubePlaying) {
      youtubePlaybackAdapter.setVolume(volume * 100);
      youtubePlaybackAdapter.setMute(isMuted);
    }
  }, [volume, isMuted, isYouTubePlaying]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    const machine = stateMachineRef.current;
    machine.transition("SEARCHING");
    setSearchError("");
    setYtTopScore(null);
    
    try {
      const result = await discoverYouTubeCandidates(searchQuery, 15, (level, query) => {
        console.log(`Trying query expansion level ${level}: ${query}`);
      });
      
      if (!result.candidates || result.candidates.length === 0) {
        machine.transition("NO_RESULTS");
        setSearchError("No playable candidates found after attempting all search strategies.");
        return;
      }
      
      if (result.candidates[0]) {
        setYtTopScore(result.candidates[0].score);
      }
      
      const mappedSongs: Song[] = result.candidates.map((candidate) => ({
        id: `yt_${candidate.video_id}`,
        name: candidate.title,
        title: candidate.title,
        artist: candidate.channel_name,
        genre: "YouTube",
        language: "English",
        source_provider: "YouTube",
        youtubeId: candidate.video_id,
        preview_url: candidate.watch_url,
        duration: candidate.duration_seconds,
        cover_image_url: candidate.thumbnail_url,
        relevanceScore: candidate.score,
      } as any));
      
      useAppStore.getState().setSongsQueue(mappedSongs);
      
      const recEngine = new YouTubeRecoveryEngine(result.candidates, {
        onCandidateSelected: (candidate, _attempt) => {
          machine.transition("PLAYER_LOADING");
          const song: Song = {
            id: `yt_${candidate.video_id}`,
            name: candidate.title,
            title: candidate.title,
            artist: candidate.channel_name,
            genre: "YouTube",
            language: "English",
            source_provider: "YouTube",
            youtubeId: candidate.video_id,
            preview_url: candidate.watch_url,
            duration: candidate.duration_seconds,
            cover_image_url: candidate.thumbnail_url,
            relevanceScore: candidate.score,
          } as any;
          useAppStore.getState().setCurrentSong(song);
          useAppStore.getState().setPlayerMode('youtube');
          setIsPlaying(true);
        },
        onExhausted: () => {
          machine.transition("FAILED");
          setSearchError("All video candidates failed to play (embedding restricted or unavailable).");
        },
        onRecovering: (_attemptIndex, _remainingCount) => {
          machine.transition("RECOVERING");
        }
      });
      
      recoveryEngineRef.current = recEngine;
      recEngine.start();
      
    } catch (err: any) {
      machine.transition("FAILED");
      setSearchError(`Search failed: ${err.message}`);
    }
  };

  const handleDetect = (d: DetectionResult) => {
    if (!d || d.source === "manual" || !d.emotion) return;
    const norm = d.emotion.toLowerCase();
    if (MOODS.includes(norm) && norm !== activeMood) {
      stopRecovery();
      setActiveMood(norm);
    }
  };

  const handleTogglePlay = () => {
    stopRecovery();
    if (isYouTubePlaying) {
      if (isPlaying) {
        youtubePlaybackAdapter.pause();
        setIsPlaying(false);
      } else {
        youtubePlaybackAdapter.resume();
        setIsPlaying(true);
      }
    } else {
      const audio = audioRef.current;
      if (isPlaying) {
        if (audio) audio.pause();
        setIsPlaying(false);
      } else {
        if (audio) {
          if (!audio.src) {
            const streamUrl = activeSong?.preview_url || (activeSong as any)?.playbackRef || "https://prod-1.storage.jamendo.com/download/track/1880003/mp32/";
            audio.src = streamUrl;
          }
          audio.play().then(() => {
            setIsPlaying(true);
          }).catch((err) => {
            console.warn("Audio play blocked:", err);
            setIsPlaying(false);
          });
        }
      }
    }
  };

  const handleSkipNext = () => {
    stopRecovery();
    if (!songsQueue.length) return;
    const curIdx = songsQueue.findIndex(s => key(s) === key(currentSong || songsQueue[0]));
    const nextIdx = (curIdx + 1) % songsQueue.length;
    setCurrentSong(songsQueue[nextIdx]);
  };

  const handleSkipPrev = () => {
    stopRecovery();
    if (!songsQueue.length) return;
    const curIdx = songsQueue.findIndex(s => key(s) === key(currentSong || songsQueue[0]));
    const prevIdx = (curIdx - 1 + songsQueue.length) % songsQueue.length;
    setCurrentSong(songsQueue[prevIdx]);
    
    if (isYouTubePlaying) {
      youtubePlaybackAdapter.seek(0);
    } else {
      const audio = audioRef.current;
      if (audio) { audio.currentTime = 0; }
    }
  };
  const songTitle = activeSong?.title || activeSong?.name || "Music Mirror Audio";
  const songArtist = activeSong?.artist || "AI Recommended";
  const songLang = activeSong?.language || "English";
  const moodColor = MOOD_COLOR[activeMood] || "#6846E8";

  return (
    <div className="pr-root" style={{ background: "var(--bg-primary)", minHeight: "100vh", position: "relative" }}>

      {/* ── Top Header Bar ── */}
      <Navbar modeLabel="Studio Player" />

      {/* ── 3-Column Studio Viewport Layout ── */}
      <div className="studio-layout">

        {/* LEFT: Biometric Input Panel */}
        <aside className="studio-acoustic-panel studio-wood-trim studio-speaker-glow" style={{ width: isBioCollapsed ? 76 : "100%", transition: "all 0.35s ease", background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            {!isBioCollapsed && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="lp-pulse-dot" style={{ background: "#0F9F8F" }} />
                <h3 style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#475569", margin: 0 }}>
                  Biometric Input
                </h3>
              </div>
            )}
            <button
              onClick={() => setIsBioCollapsed(!isBioCollapsed)}
              title={isBioCollapsed ? "Expand Panel" : "Collapse Panel"}
              style={{ background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: "999px", padding: "4px 8px", color: "#475569", cursor: "pointer", fontSize: "0.7rem", marginLeft: "auto" }}
            >
              {isBioCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          {!isBioCollapsed ? (
            <>
              {/* Camera Frame */}
              <div style={{ borderRadius: "var(--r-16)", overflow: "hidden", background: "#F8FAFC", border: "1px solid #E2E8F0", position: "relative", marginBottom: 16 }}>
                {camOpen ? (
                  <Camera onEmotion={handleDetect} />
                ) : (
                  <div style={{ height: 130, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", color: "#7A8699" }}>
                    Camera suspended
                  </div>
                )}
                <button
                  onClick={() => setCamOpen(!camOpen)}
                  style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(255,255,255,0.85)", border: "1px solid #CBD5E1", borderRadius: "999px", padding: "4px 10px", fontSize: "0.68rem", color: "#172033", cursor: "pointer", backdropFilter: "blur(6px)", fontWeight: 600 }}
                >
                  {camOpen ? "Suspend" : "Enable"}
                </button>
              </div>

              {/* Detected Emotion Card */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "var(--r-16)", padding: "12px 14px", marginBottom: 16 }}>
                <div style={{ fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7A8699", marginBottom: 3 }}>Detected Facial State</div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: moodColor }}>{MOOD_LABEL[activeMood] || activeMood}</div>
              </div>

              {/* Manual Override List */}
              <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 14, overflowY: "auto", flex: 1, maxHeight: "calc(100vh - 380px)", paddingRight: 4 }}>
                <div style={{ fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7A8699", marginBottom: 8 }}>
                  Manual Mood Override
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {MOODS.map(m => (
                    <button
                      key={m}
                      onClick={() => {
                        stopRecovery();
                        setActiveMood(m);
                      }}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 12px", borderRadius: "var(--r-12)",
                        border: "1px solid transparent",
                        background: activeMood === m ? "#EEF2FF" : "transparent",
                        color: activeMood === m ? MOOD_COLOR[m] || "#4F46E5" : "#475569",
                        fontSize: "0.8rem", fontWeight: activeMood === m ? 700 : 500,
                        cursor: "pointer", textAlign: "left", transition: "var(--spring-transition)",
                      }}
                    >
                      <span>{MOOD_LABEL[m]}</span>
                      {activeMood === m && <span style={{ width: 6, height: 6, borderRadius: "50%", background: MOOD_COLOR[m] || "#4F46E5" }} />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Compact Collapsed Mode */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginTop: 20 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: moodColor, boxShadow: `0 0 10px ${moodColor}` }} />
              <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: "0.78rem", fontWeight: 800, color: moodColor, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {activeMood}
              </div>
            </div>
          )}
        </aside>

        {/* CENTER: Main Studio Music Player Stage */}
        <main style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 12px" }}>
          
          <div className="panel" style={{
            width: "100%", maxWidth: 620,
            background: "#FFFFFF",
            backdropFilter: "blur(32px)",
            border: "1px solid #E2E8F0",
            borderRadius: "var(--r-32)",
            padding: "36px 32px 28px",
            display: "flex", flexDirection: "column", alignItems: "center",
            boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
            position: "relative", overflow: "hidden",
          }}>

            {/* Ambient Accent Radial Glow behind player */}
            <div style={{
              position: "absolute", top: "-20%", left: "20%", right: "20%", height: "50%",
              background: `radial-gradient(ellipse at center, ${moodColor}15 0%, transparent 70%)`,
              pointerEvents: "none", filter: "blur(40px)"
            }} />

            {/* Search Input Bar */}
            <div style={{ width: "100%", marginBottom: 18, zIndex: 2, display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Search topic or video (e.g. Java inheritance)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "999px",
                  border: "1.5px solid #E2E8F0",
                  fontSize: "0.85rem",
                  outline: "none",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
                  transition: "all 0.2s ease"
                }}
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                style={{
                  padding: "10px 20px",
                  borderRadius: "999px",
                  background: "linear-gradient(135deg, #4F46E5, #635BFF)",
                  color: "#FFF",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                {isSearching ? (ytStatusMsg || "Searching...") : "Search"}
              </button>
            </div>

            {searchError && (
              <div style={{ fontSize: "0.75rem", color: "#EF4444", fontWeight: 600, marginBottom: 12, zIndex: 2, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={14} />
                <span>{searchError}</span>
              </div>
            )}

            {ytMachineState !== "IDLE" && (
              <div style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                background: ytMachineState === "FAILED" || ytMachineState === "NO_RESULTS" ? "#FEE2E2" : "#F0FDF4",
                border: `1px solid ${ytMachineState === "FAILED" || ytMachineState === "NO_RESULTS" ? "#FCA5A5" : "#BBF7D0"}`,
                color: ytMachineState === "FAILED" || ytMachineState === "NO_RESULTS" ? "#991B1B" : "#166534",
                fontSize: "0.75rem",
                fontWeight: 600,
                marginBottom: 12,
                zIndex: 2,
                display: "flex",
                alignItems: "center",
                gap: 6
              }}>
                <Sparkles size={12} className={isSearching ? "animate-spin" : ""} />
                <span>{ytStatusMsg}</span>
                {ytTopScore !== null && (
                  <span style={{ marginLeft: "auto", background: "rgba(255,255,255,0.6)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", color: "#374151" }}>
                    Match: {(ytTopScore * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            )}

            {/* Top Match Badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, zIndex: 2 }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4F46E5", background: "#EEF2FF", border: "1px solid #C7D2FE", padding: "4px 14px", borderRadius: "999px", display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={12} />
                98% Emotion Match · {MOOD_LABEL[activeMood]}
              </span>
            </div>

            {/* Playback Stage Container */}
            <div style={{ position: "relative", margin: "10px 0 24px", zIndex: 2 }}>
              {isYouTubePlaying ? (
                <div style={{ width: 280, height: 158, borderRadius: 20, overflow: "hidden", background: "#000", border: "1px solid #E2E8F0", boxShadow: "0 10px 24px rgba(15,23,42,0.12)" }}>
                  <div id="youtube-player-element" style={{ width: "100%", height: "100%" }}></div>
                </div>
              ) : activeSong?.cover_image_url || activeSong?.youtubeId ? (
                <img
                  src={activeSong.cover_image_url || `https://img.youtube.com/vi/${activeSong.youtubeId}/hqdefault.jpg`}
                  alt={songTitle}
                  style={{
                    width: 160,
                    height: 160,
                    borderRadius: 20,
                    objectFit: "cover",
                    boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
                    border: "1px solid #E2E8F0",
                  }}
                />
              ) : (
                <div style={{
                  width: 160,
                  height: 160,
                  borderRadius: 20,
                  background: `linear-gradient(135deg, ${moodColor}22, ${moodColor}55)`,
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: moodColor,
                  boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
                }}>
                  <Music size={56} />
                </div>
              )}
            </div>

            {/* Song Metadata Lockup */}
            <div style={{ textAlign: "center", marginBottom: 24, zIndex: 2, maxWidth: "100%" }}>
              <h2 className="font-brand" style={{ fontSize: "1.7rem", fontWeight: 800, color: "#172033", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {songTitle}
              </h2>
              <div style={{ fontSize: "0.95rem", color: "#475569", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <span>{songArtist}</span>
                <span style={{ color: "#A8B1BF" }}>•</span>
                <span style={{ fontSize: "0.72rem", color: "#4F46E5", border: "1px solid #CBD5E1", padding: "1px 8px", borderRadius: "999px", background: "#EEF2FF" }}>
                  {songLang}
                </span>
                {isYouTubePlaying && activeSong && (activeSong as any).relevanceScore !== undefined && (
                  <>
                    <span style={{ color: "#A8B1BF" }}>•</span>
                    <span style={{ fontSize: "0.72rem", color: "#10B981", border: "1px solid #A7F3D0", padding: "1px 8px", borderRadius: "999px", background: "#ECFDF5" }}>
                      Score: {((activeSong as any).relevanceScore * 100).toFixed(0)}%
                    </span>
                  </>
                )}
                {/* Favorite toggle */}
                <button
                  onClick={() => activeSong && toggleFav(activeSong)}
                  aria-label={favs.some(f => key(f) === key(activeSong)) ? "Remove from favorites" : "Add to favorites"}
                  title={favs.some(f => key(f) === key(activeSong)) ? "Saved" : "Save"}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center", color: favs.some(f => key(f) === key(activeSong)) ? "#F472B6" : "#A8B1BF", transition: "color 0.2s" }}
                >
                  <Heart size={18} fill={favs.some(f => key(f) === key(activeSong)) ? "#F472B6" : "none"} />
                </button>
              </div>
            </div>


            {/* Progress Seek Bar */}
            <div style={{ width: "100%", marginBottom: 24, zIndex: 2 }}>
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  if (isYouTubePlaying) {
                    const dur = youtubePlaybackAdapter.getDuration();
                    youtubePlaybackAdapter.seek(fraction * dur);
                  } else {
                    const audio = audioRef.current;
                    if (audio && audio.duration && !isNaN(audio.duration)) {
                      audio.currentTime = fraction * audio.duration;
                      setProgress(fraction * 100);
                    } else {
                      setProgress(fraction * 100);
                    }
                  }
                }}
                style={{ width: "100%", height: 6, background: "#E2E8F0", borderRadius: 3, cursor: "pointer", position: "relative", overflow: "hidden" }}
              >
                <div style={{ height: "100%", background: `linear-gradient(90deg, #4F46E5, ${moodColor})`, width: `${progress}%`, borderRadius: 3, transition: "width 0.2s linear" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: "0.72rem", color: "#7A8699", fontFamily: "JetBrains Mono, monospace" }}>
                <span>{currentTimeStr}</span>
                <span>{durationStr}</span>
              </div>
            </div>

            {/* Primary Control Buttons Row */}
            <div style={{ display: "flex", alignItems: "center", gap: 24, zIndex: 2 }}>
              
              {/* Prev */}
              <button
                onClick={handleSkipPrev}
                aria-label="Previous Song"
                style={{ width: 42, height: 42, borderRadius: "50%", background: "#F1F5F9", border: "1px solid #E2E8F0", color: "#172033", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "var(--spring-transition)" }}
              >
                <SkipBack size={18} />
              </button>

              {/* Play/Pause Main Button */}
              <button
                onClick={handleTogglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: `linear-gradient(135deg, #4F46E5, #4338CA)`,
                  color: "#FFFFFF", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 8px 24px rgba(79, 70, 229, 0.35)`,
                  transition: "var(--spring-transition)",
                  transform: "scale(1)",
                }}
              >
                {isPlaying ? <Pause size={26} fill="#FFFFFF" /> : <Play size={26} fill="#FFFFFF" style={{ marginLeft: 3 }} />}
              </button>

              {/* Next */}
              <button
                onClick={handleSkipNext}
                aria-label="Next Song"
                style={{ width: 42, height: 42, borderRadius: "50%", background: "#F1F5F9", border: "1px solid #E2E8F0", color: "#172033", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "var(--spring-transition)" }}
              >
                <SkipForward size={18} />
              </button>

            </div>

            {/* Secondary Controls Bar: Volume & Re-sync */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 24, zIndex: 2, width: "100%", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => {
                    const nextMute = !isMuted;
                    setIsMuted(nextMute);
                    const audio = audioRef.current;
                    if (audio) audio.volume = nextMute ? 0 : volume;
                  }}
                  style={{ background: "none", border: "none", color: "#475569", cursor: "pointer" }}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    setIsMuted(v === 0);
                  }}
                  style={{ width: 80, height: 4, accentColor: "#4F46E5", cursor: "pointer" }}
                />
              </div>

              <button
                onClick={() => handleDetect({ emotion: activeMood, confidence: 0.95, scores: [[activeMood, 0.95]], source: "manual" })}
                style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", background: "#F1F5F9", border: "1px solid #E2E8F0", padding: "6px 14px", borderRadius: "999px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                <RefreshCw size={12} /> Re-sync Mood Match
              </button>
            </div>

          </div>

        </main>

        {/* RIGHT: Up Next Queue Panel */}
        <aside className="studio-acoustic-panel studio-speaker-glow" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexShrink: 0 }}>
            <div>
              <h3 style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#475569", margin: 0 }}>
                Up Next Queue
              </h3>
              <div style={{ fontSize: "0.68rem", color: "#7A8699", marginTop: 2 }}>{songsQueue.length} Tracks · {playerMode.toUpperCase()}</div>
            </div>
            <span style={{ fontSize: "0.68rem", color: "#4F46E5", fontWeight: 700, background: "#EEF2FF", border: "1px solid #C7D2FE", padding: "3px 10px", borderRadius: "999px" }}>
              Auto-Play
            </span>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1, paddingRight: 4 }}
            className="studio-queue-scroll"
          >
            {songsQueue.map((song, i) => {
              const isActive = currentSong ? key(song) === key(currentSong) : i === 0;
              const title = song.title || song.name || "Unknown";
              return (
                <div
                  key={i}
                  onClick={() => {
                    stopRecovery();
                    setCurrentSong(song);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: "var(--r-16)",
                    background: isActive ? "#EEF2FF" : "#F8FAFC",
                    border: "1px solid",
                    borderColor: isActive ? "#818CF8" : "#E2E8F0",
                    cursor: "pointer", transition: "var(--spring-transition)",
                    boxShadow: isActive ? "0 4px 12px rgba(79, 70, 229, 0.10)" : "none",
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "var(--r-12)",
                    background: isActive ? "linear-gradient(135deg, #4F46E5, #7C3AED)" : "#E2E8F0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.85rem", fontWeight: 800, color: isActive ? "#FFFFFF" : "#475569",
                    flexShrink: 0
                  }}>
                    {isActive ? <Music size={16} /> : title[0]?.toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.84rem", fontWeight: 700, color: isActive ? "#4F46E5" : "#172033", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {title}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {song.artist}
                    </div>
                  </div>

                  {isActive ? (
                    <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#4F46E5", background: "#EEF2FF", border: "1px solid #C7D2FE", padding: "2px 8px", borderRadius: "999px", flexShrink: 0, letterSpacing: "0.05em" }}>
                      PLAYING
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.66rem", color: "#7A8699", background: "#F1F5F9", padding: "2px 7px", borderRadius: "999px", flexShrink: 0 }}>
                      {song.language || "Pop"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {/* ── Floating Bottom Navigation Pill ── */}
      <nav className="studio-nav-bar" style={{ background: "rgba(255,255,255,0.88)", border: "1px solid #E2E8F0", boxShadow: "0 8px 24px rgba(15,23,42,0.06)" }}>
        <Link to="/" className="studio-nav-item">Discover</Link>
        <Link to="/room" className="studio-nav-item active">Room</Link>
        <Link to="/profile" className="studio-nav-item">Profile</Link>
        <Link to="/dashboard" className="studio-nav-item">AI Lab</Link>
      </nav>

      <style>{`
        .studio-queue-scroll::-webkit-scrollbar { width: 4px; }
        .studio-queue-scroll::-webkit-scrollbar-track { background: transparent; }
        .room-brand { display: flex; align-items: center; gap: 8px; font-size: 1rem; font-weight: 800; color: var(--text-1); }
        .room-brand-name { letter-spacing: -0.02em; }
        @keyframes bg-bar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1);   }
        }
      `}</style>
    </div>
  );
}
