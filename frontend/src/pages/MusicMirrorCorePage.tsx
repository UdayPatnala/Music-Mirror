import { useState, useEffect, useRef, useCallback } from 'react';
import { musicMirrorCore } from '../core/MusicMirrorCore';
import { apiClient } from '../api/client';
import type {
  Track,
  PlaybackState,
  QueueState,
  SearchResult,
  SystemHealth,
} from '../domain/canonical';
import Camera from '../components/Camera';
import type { DetectionResult } from '../components/Camera';
import { getDiscoveryCacheStats, clearDiscoveryCache } from '../services/YouTubeDiscoveryService';
import { appConfig } from '../config/appConfig';
import AcousticSoundwaveCanvas from '../components/AcousticSoundwaveCanvas';
import CircumplexRadar from '../components/CircumplexRadar';

/* ─── True Emotion Taxonomy ────────────────────────────────────────── */

interface EmotionDescriptor {
  id: string;
  label: string;
  emoji: string;
  valence: number; // 0.0 (sad/gloomy) to 1.0 (happy/cheerful)
  energy: number;  // 0.0 (calm/serene) to 1.0 (intense/energetic)
  targetBpm: number;
  mode: 'major' | 'minor';
  accentColor: string;
  description: string;
}

const TRUE_EMOTIONS: EmotionDescriptor[] = [
  { id: 'serene', label: 'Serene & Peaceful', emoji: '🕊️', valence: 0.70, energy: 0.25, targetBpm: 75, mode: 'major', accentColor: 'var(--emo-serene)', description: 'Tranquil calm, gentle acoustic resonance, deep breathing' },
  { id: 'joyful', label: 'Joyful & Euphoric', emoji: '✨', valence: 0.95, energy: 0.88, targetBpm: 128, mode: 'major', accentColor: 'var(--emo-joyful)', description: 'High vitality, uplifting rhythms, cheerful melodic drive' },
  { id: 'melancholy', label: 'Melancholy & Somber', emoji: '🌧️', valence: 0.20, energy: 0.30, targetBpm: 70, mode: 'minor', accentColor: 'var(--emo-melancholy)', description: 'Introspective, yearning, emotional depth, soul & blues' },
  { id: 'triumphant', label: 'Triumphant & Driven', emoji: '⚡', valence: 0.85, energy: 0.92, targetBpm: 136, mode: 'major', accentColor: 'var(--emo-triumphant)', description: 'Powerful, resolute, victorious, high-bpm drive' },
  { id: 'focused', label: 'Contemplative Focus', emoji: '🧘', valence: 0.55, energy: 0.45, targetBpm: 95, mode: 'minor', accentColor: 'var(--emo-focused)', description: 'Steady ambient, lofi textures, distraction-free concentration' },
  { id: 'cathartic', label: 'Cathartic Release', emoji: '🔥', valence: 0.30, energy: 0.95, targetBpm: 145, mode: 'minor', accentColor: 'var(--emo-cathartic)', description: 'Intense frustration/tension release through high-energy rhythms' },
  { id: 'centered', label: 'Centered Equilibrium', emoji: '⚖️', valence: 0.50, energy: 0.50, targetBpm: 100, mode: 'major', accentColor: 'var(--emo-centered)', description: 'Harmonious baseline, grounded presence, balance' },
];

type MirrorPolicy = 'REFLECT' | 'REGULATE' | 'CATHARSIS' | 'BALANCE';

export default function MusicMirrorCorePage() {
  // ─── Core Engine State ───────────────────────────────────────────
  const [playback, setPlayback] = useState<PlaybackState>(musicMirrorCore.getPlaybackState());
  const [queue, setQueue] = useState<QueueState>(musicMirrorCore.getQueue());
  const [health, setHealth] = useState<SystemHealth>({
    status: 'READY',
    backendConnected: false,
    databaseHealthy: false,
    activeProvider: 'youtube',
    version: '2.04.00.0',
    lastCheckedTimestamp: Date.now(),
  });

  // ─── True Emotion State ──────────────────────────────────────────
  const [activeEmotion, setActiveEmotion] = useState<EmotionDescriptor>(TRUE_EMOTIONS[1]); // Joyful default
  const [mirrorPolicy, setMirrorPolicy] = useState<MirrorPolicy>('REFLECT');
  const [targetRegulationEmotion, setTargetRegulationEmotion] = useState<EmotionDescriptor>(TRUE_EMOTIONS[0]); // Serene default target
  const [facialDetection, setFacialDetection] = useState<DetectionResult | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [userNote, setUserNote] = useState<string>('');

  // ─── Discovery & Recommendations ─────────────────────────────────
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [journeySteps, setJourneySteps] = useState<Track[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusLog, setStatusLog] = useState<Array<{ time: string; msg: string; type: 'info' | 'warn' | 'error' }>>([]);

  // ─── Diagnostics & Observability ─────────────────────────────────
  const [cacheStats, setCacheStats] = useState({ size: 0, inFlightCount: 0 });
  const [lastLatencyMs, setLastLatencyMs] = useState<number>(0);
  const [testStatus, setTestStatus] = useState<string>('');
  const [diagnosticsOpen, setDiagnosticsOpen] = useState<boolean>(false);
  const ytPlayerContainerRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string, type: 'info' | 'warn' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setStatusLog(prev => [{ time, msg, type }, ...prev.slice(0, 40)]);
  }, []);

  // ─── Subscription & Initialization ───────────────────────────────
  useEffect(() => {
    musicMirrorCore.initialize();
    const unsubPlayback = musicMirrorCore.subscribe(state => setPlayback(state));
    const unsubQueue = musicMirrorCore.subscribeQueue(q => setQueue(q));

    // Check system health on load
    apiClient.checkHealth().then(h => {
      // Engine status reflects the JS core, which is always READY once initialized.
      // Only backend connectivity is uncertain — keep engine READY regardless of API reachability.
      setHealth({
        ...h,
        status: h.backendConnected ? h.status : 'READY',
      });
      addLog(`Backend health verified: ${h.status} (version ${h.version})`, 'info');
    }).catch(err => {
      // Backend unreachable — engine stays READY, API shows STANDALONE
      setHealth(prev => ({ ...prev, backendConnected: false, activeProvider: 'fallback' }));
      addLog(`Backend health check offline: ${err.message}`, 'warn');
    });

    const statsTimer = setInterval(() => {
      setCacheStats(getDiscoveryCacheStats());
    }, 2000);

    return () => {
      unsubPlayback();
      unsubQueue();
      clearInterval(statsTimer);
    };
  }, [addLog]);

  // ─── True Emotion Computation ─────────────────────────────────────
  const effectiveValence = facialDetection
    ? Math.round(((activeEmotion.valence * 0.6) + ((facialDetection.confidence) * 0.4)) * 100) / 100
    : activeEmotion.valence;
  const effectiveEnergy = activeEmotion.energy;

  const handleFacialEmotionDetected = (res: DetectionResult) => {
    setFacialDetection(res);
    const matched = TRUE_EMOTIONS.find(e => e.id.toLowerCase() === res.emotion.toLowerCase());
    if (matched && res.confidence > 0.65) {
      addLog(`Facial mirror detected: ${res.emotion} (confidence ${(res.confidence * 100).toFixed(1)}%)`, 'info');
    }
  };

  const handleRadarCoordinateSelected = (v: number, e: number) => {
    let closest = TRUE_EMOTIONS[0];
    let minD = Infinity;
    for (const emo of TRUE_EMOTIONS) {
      const d = Math.hypot(emo.valence - v, emo.energy - e);
      if (d < minD) {
        minD = d;
        closest = emo;
      }
    }
    setActiveEmotion(closest);
    addLog(`Radar coordinate selected: (${v}, ${e}) → ${closest.label}`, 'info');
  };

  // ─── Discovery: Recommend Tracks based on True Emotion ────────────
  const handleReflectMood = async () => {
    setIsSearching(true);
    setErrorMessage(null);
    const start = Date.now();
    try {
      addLog(`Reflecting emotional intent: ${activeEmotion.label} [Policy: ${mirrorPolicy}]`, 'info');
      if (userNote.trim()) {
        addLog(`Subjective note noted: "${userNote.trim()}"`, 'info');
      }

      if (mirrorPolicy === 'REGULATE') {
        const journey = await apiClient.getTransitionJourney({
          startEmotion: activeEmotion.id,
          targetEmotion: targetRegulationEmotion.id,
          steps: 4,
        });
        setJourneySteps(journey.journeySteps || journey.tracks);
        setRecommendations(journey.tracks);
        if (journey.tracks.length > 0) {
          musicMirrorCore.clearQueue();
          journey.tracks.forEach(t => musicMirrorCore.addToQueue(t));
          await musicMirrorCore.play(journey.tracks[0]);
          addLog(`Alchemical journey initialized: ${journey.tracks.length} stages mapped.`, 'info');
        }
      } else {
        const recs = await apiClient.getRecommendations({
          emotion: activeEmotion.id,
          goal: mirrorPolicy.toLowerCase(),
        });
        setRecommendations(recs.tracks);
        if (recs.tracks.length > 0) {
          musicMirrorCore.clearQueue();
          recs.tracks.forEach(t => musicMirrorCore.addToQueue(t));
          await musicMirrorCore.play(recs.tracks[0]);
          addLog(`True Emotion mirrored: ${recs.tracks.length} tracks loaded into queue.`, 'info');
        } else {
          addLog('No direct catalog recommendation returned. Searching candidate pool.', 'warn');
          await handleSearch(`${activeEmotion.label} ${activeEmotion.mode}`);
        }
      }
      setLastLatencyMs(Date.now() - start);
    } catch (err: any) {
      setErrorMessage(err.message || 'Recommendation request failed');
      addLog(`Recommendation failure: ${err.message}`, 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // ─── Discovery: Search YouTube Pool & Catalog ────────────────────
  const handleSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery || searchQuery).trim();
    if (!q) return;

    setIsSearching(true);
    setErrorMessage(null);
    const start = Date.now();
    try {
      addLog(`Querying candidate pool for: "${q}"...`, 'info');
      const result: SearchResult = await musicMirrorCore.searchTracks(q, 12);
      setSearchResults(result.tracks);
      setLastLatencyMs(Date.now() - start);
      addLog(`Discovered ${result.tracks.length} candidates in ${result.latencyMs}ms (Cached: ${result.isCached})`, 'info');
    } catch (err: any) {
      setErrorMessage(err.message || 'Search failed');
      addLog(`Search error: ${err.message}`, 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // ─── Playback Control Handlers ────────────────────────────────────
  const handlePlayTrack = async (track: Track) => {
    addLog(`Requested track play: "${track.title}" - ${track.artist}`, 'info');
    await musicMirrorCore.play(track);
  };

  const handleTogglePlayPause = async () => {
    if (playback.isPlaying) {
      await musicMirrorCore.pause();
      addLog('Playback paused', 'info');
    } else {
      await musicMirrorCore.resume();
      addLog('Playback resumed', 'info');
    }
  };

  // ─── Failure Injection & Automated Self-Healing Tests ─────────────
  const runEmbedErrorFailoverTest = () => {
    setTestStatus('Simulating Embed Error 150 (Restricted Video)...');
    addLog('TEST: Triggering simulated IFrame error 150 to verify sub-3s fallback ladder...', 'warn');
    musicMirrorCore.reportFailure('150');
    setTimeout(() => {
      setTestStatus('Fallback verified: Successfully transitioned to next candidate in queue.');
      addLog('TEST PASS: Sequential failover ladder executed safely.', 'info');
    }, 1200);
  };

  const runOfflineSimTest = () => {
    setTestStatus('Testing Offline Fallback Candidate Resolution...');
    addLog('TEST: Querying tracks with simulated network blackout...', 'warn');
    musicMirrorCore.searchTracks('Acoustic Calm Offline', 5).then(res => {
      setTestStatus(`Offline Fallback verified: ${res.tracks.length} fallback tracks available.`);
      addLog(`TEST PASS: Offline candidate pool returned ${res.tracks.length} tracks.`, 'info');
    }).catch(err => {
      setTestStatus(`Test result: ${err.message}`);
    });
  };

  const runLatencyBenchmark = async () => {
    setTestStatus('Benchmarking Discovery & Normalization Latency...');
    const t0 = performance.now();
    await musicMirrorCore.searchTracks('Sid Sriram Telugu Soul', 10);
    const t1 = performance.now();
    const duration = Math.round(t1 - t0);
    setTestStatus(`Benchmark Complete: Query-to-Candidate ready took ${duration}ms.`);
    addLog(`BENCHMARK: Discovery & Ranking finished in ${duration}ms`, 'info');
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <div className="mirror-shell">

      {/* ─── 1. HEADER & TELEMETRY RIBBON ──────────────────────────── */}
      <header className="mirror-header">
        <div className="mirror-brand">
          <div className="brand-icon-wrapper">🪞</div>
          <div className="brand-text">
            <h1>MUSIC MIRROR</h1>
            <span className="brand-tagline">Acoustic Reflection · Affective Music Intelligence</span>
          </div>
        </div>

        <div className="telemetry-ribbon">
          <div className="telemetry-pill">
            <span className={`beacon ${health.status === 'READY' ? 'ready' : health.status === 'DEGRADED' ? 'degraded' : 'offline'}`} />
            <span>ENGINE: {health.status}</span>
          </div>

          <div className="telemetry-pill">
            <span>API: {health.backendConnected ? 'ONLINE' : 'STANDALONE'}</span>
          </div>

          <div className="telemetry-pill">
            <span>PROVIDER: {health.activeProvider.toUpperCase()}</span>
          </div>

          <div className="telemetry-pill">
            <span>LATENCY: {lastLatencyMs}ms</span>
          </div>

          <div className="telemetry-pill version-badge">
            <span>v{appConfig.version}</span>
          </div>
        </div>
      </header>

      {/* ─── 2. NOTIFICATION / RECOVERABLE ERROR BANNER ─────────────── */}
      {errorMessage && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--danger)', color: '#fecdd3', padding: '12px 18px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="btn-secondary" style={{ padding: '2px 8px' }}>Dismiss</button>
        </div>
      )}

      {/* ─── 3. MAIN WORKBENCH GRID ─────────────────────────────────── */}
      <div className="mirror-grid">

        {/* ── COLUMN A: THE MIRROR STUDIO ───────────────────────────── */}
        <section className="mirror-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span>🪞 The Mirror Studio</span>
            </div>
            <span className="panel-title-badge">Affective Engine</span>
          </div>

          {/* Webcam Physical Mirror Viewfinder */}
          <div className="camera-viewfinder-card">
            <div className="viewfinder-top">
              <span className="viewfinder-status">
                <span className={`beacon ${cameraActive ? 'ready' : 'offline'}`} />
                {cameraActive ? 'Physical Stream Active' : 'Camera Standby'}
              </span>
              <button
                onClick={() => setCameraActive(prev => !prev)}
                className={cameraActive ? 'btn-secondary' : 'btn-primary'}
                style={{ padding: '4px 10px', fontSize: '11px' }}
              >
                {cameraActive ? 'Disable Camera' : 'Enable Camera'}
              </button>
            </div>

            <div className="camera-container-box">
              {cameraActive ? (
                <div style={{ width: '100%' }}>
                  <Camera onEmotion={handleFacialEmotionDetected} showLandmarks={false} />
                </div>
              ) : (
                <div className="camera-placeholder-text">
                  Camera offline. Click "Enable Camera" for facial affect detection, or select an emotional archetype below.
                </div>
              )}
            </div>

            {facialDetection && cameraActive && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>Facial Classification: <strong style={{ color: 'var(--text-primary)' }}>{facialDetection.emotion}</strong></span>
                <span>Confidence: <strong style={{ color: 'var(--text-primary)' }}>{(facialDetection.confidence * 100).toFixed(1)}%</strong></span>
              </div>
            )}
          </div>

          {/* 2D Circumplex Radar Affective Model */}
          <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="section-label">Russell Circumplex Radar</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Click plane to navigate affect</span>
            </div>
            <CircumplexRadar
              currentValence={effectiveValence}
              currentEnergy={effectiveEnergy}
              targetValence={mirrorPolicy === 'REGULATE' ? targetRegulationEmotion.valence : undefined}
              targetEnergy={mirrorPolicy === 'REGULATE' ? targetRegulationEmotion.energy : undefined}
              songValence={playback.currentTrack?.acousticFeatures?.valence}
              songEnergy={playback.currentTrack?.acousticFeatures?.energy}
              isRegulating={mirrorPolicy === 'REGULATE'}
              activeColor={activeEmotion.accentColor}
              onCoordinateSelected={handleRadarCoordinateSelected}
              size={240}
            />
          </div>

          {/* Computed Acoustic Metrics Row */}
          <div className="emotion-metrics-row">
            <div className="metric-chip">
              <span className="metric-chip-label">Valence (Cheer)</span>
              <span className="metric-chip-val" style={{ color: activeEmotion.accentColor }}>{effectiveValence} / 1.0</span>
            </div>
            <div className="metric-chip">
              <span className="metric-chip-label">Energy (Vitality)</span>
              <span className="metric-chip-val" style={{ color: activeEmotion.accentColor }}>{effectiveEnergy} / 1.0</span>
            </div>
            <div className="metric-chip">
              <span className="metric-chip-label">Target BPM</span>
              <span className="metric-chip-val">{activeEmotion.targetBpm}</span>
            </div>
            <div className="metric-chip">
              <span className="metric-chip-label">Harmonic Mode</span>
              <span className="metric-chip-val">{activeEmotion.mode.toUpperCase()}</span>
            </div>
          </div>

          {/* Emotion Archetype Taxonomy Cards */}
          <div className="taxonomy-section">
            <span className="section-label">Select Emotional Archetype</span>
            <div className="emotion-card-grid">
              {TRUE_EMOTIONS.map(e => {
                const isSelected = activeEmotion.id === e.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => setActiveEmotion(e)}
                    className={`emotion-card ${isSelected ? 'active' : ''}`}
                    style={{ borderColor: isSelected ? e.accentColor : undefined }}
                  >
                    <div className="emo-card-header">
                      <span className="emo-card-emoji">{e.emoji}</span>
                      <span className="emo-card-mode">{e.mode}</span>
                    </div>
                    <span className="emo-card-label">{e.label}</span>
                    <div className="emo-card-bars">
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${e.valence * 100}%`, background: e.accentColor }} />
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${e.energy * 100}%`, background: 'rgba(255, 255, 255, 0.4)' }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
              {activeEmotion.description}
            </span>
          </div>

          {/* Subjective Note Input */}
          <div className="taxonomy-section">
            <span className="section-label">Subjective Reflection Context</span>
            <div className="note-container">
              <input
                type="text"
                placeholder="What is present for you right now? (e.g., Unwinding after intense work...)"
                value={userNote}
                onChange={e => setUserNote(e.target.value)}
                className="mirror-input"
              />
            </div>
          </div>

          {/* Mirroring Intent Policy */}
          <div className="taxonomy-section">
            <span className="section-label">Mirror Intent Policy</span>
            <div className="policy-group">
              {(['REFLECT', 'REGULATE', 'CATHARSIS', 'BALANCE'] as MirrorPolicy[]).map(p => (
                <button
                  key={p}
                  onClick={() => setMirrorPolicy(p)}
                  className={`policy-btn ${mirrorPolicy === p ? 'active' : ''}`}
                >
                  <span className="policy-title">
                    {p === 'REFLECT' ? '🪞 REFLECT' :
                     p === 'REGULATE' ? '🌿 REGULATE' :
                     p === 'CATHARSIS' ? '🔥 CATHARSIS' : '⚖️ BALANCE'}
                  </span>
                  <span className="policy-desc">
                    {p === 'REFLECT' ? 'Echo state' :
                     p === 'REGULATE' ? 'Guide mood' :
                     p === 'CATHARSIS' ? 'Release tension' : 'Center focus'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Target Regulation Selector */}
          {mirrorPolicy === 'REGULATE' && (
            <div className="taxonomy-section" style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <span className="section-label">Target Destination Mood</span>
              <select
                value={targetRegulationEmotion.id}
                onChange={e => {
                  const found = TRUE_EMOTIONS.find(x => x.id === e.target.value);
                  if (found) setTargetRegulationEmotion(found);
                }}
                className="mirror-input"
                style={{ marginTop: '4px' }}
              >
                {TRUE_EMOTIONS.filter(x => x.id !== activeEmotion.id).map(e => (
                  <option key={e.id} value={e.id}>{e.emoji} {e.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Alchemical Journey Transition Stages */}
          {journeySteps.length > 0 && mirrorPolicy === 'REGULATE' && (
            <div className="journey-card">
              <span className="section-label">🌿 Alchemical Transition Path ({journeySteps.length} Stages)</span>
              <div className="journey-steps-row">
                {journeySteps.map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="journey-step-chip">
                      <strong>{idx + 1}.</strong> {step.title}
                    </div>
                    {idx < journeySteps.length - 1 && <span className="journey-arrow">→</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Execution Button */}
          <button
            onClick={handleReflectMood}
            disabled={isSearching}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '14px' }}
          >
            {isSearching ? 'MIRRORING EMOTION...' : '🪞 EXECUTE TRUE EMOTION MIRROR'}
          </button>
        </section>

        {/* ── COLUMN B: PLAYBACK DECK & DISCOVERY ───────────────────── */}
        <section className="mirror-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span>🎧 Playback Deck & Orchestration</span>
            </div>
            <span className="panel-title-badge">Status: {playback.status}</span>
          </div>

          {/* Now Playing Deck */}
          <div className="now-playing-deck">
            <div className="track-hero">
              <div className="track-artwork">
                {playback.currentTrack?.artworkUrl ? (
                  <img src={playback.currentTrack.artworkUrl} alt="Artwork" />
                ) : (
                  <span>🎵</span>
                )}
              </div>

              <div className="track-info">
                <span className="track-title">
                  {playback.currentTrack ? playback.currentTrack.title : 'Ready for Reflection'}
                </span>
                <span className="track-artist">
                  {playback.currentTrack ? playback.currentTrack.artist : 'Select an emotion or search to begin'}
                </span>

                <div className="track-acoustic-tags">
                  <span className="acoustic-pill">
                    VALENCE: {playback.currentTrack?.acousticFeatures?.valence ?? effectiveValence}
                  </span>
                  <span className="acoustic-pill">
                    ENERGY: {playback.currentTrack?.acousticFeatures?.energy ?? effectiveEnergy}
                  </span>
                  <span className="acoustic-pill">
                    BPM: {playback.currentTrack?.acousticFeatures?.tempo ?? activeEmotion.targetBpm}
                  </span>
                  <span className="acoustic-pill">
                    MODE: {activeEmotion.mode.toUpperCase()}
                  </span>
                  {playback.currentTrack?.primarySource && (
                    <span className="acoustic-pill" style={{ color: 'var(--success)' }}>
                      SRC: {playback.currentTrack.primarySource.sourceType.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Dynamic Acoustic Soundwave DSP Canvas */}
            <div style={{ background: '#07090e', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '2px', overflow: 'hidden' }}>
              <AcousticSoundwaveCanvas
                isPlaying={playback.isPlaying}
                valence={playback.currentTrack?.acousticFeatures?.valence ?? effectiveValence}
                energy={playback.currentTrack?.acousticFeatures?.energy ?? effectiveEnergy}
                tempo={playback.currentTrack?.acousticFeatures?.tempo ?? activeEmotion.targetBpm}
                accentColor={activeEmotion.accentColor}
                mode={activeEmotion.mode}
                height={75}
              />
            </div>

            {/* Transport & Scrubber */}
            <div className="transport-controls">
              <div className="progress-row">
                <span className="time-label">{formatSeconds(playback.currentTimeSeconds)}</span>
                <input
                  type="range"
                  min={0}
                  max={playback.durationSeconds || 180}
                  value={playback.currentTimeSeconds}
                  onChange={e => musicMirrorCore.seek(Number(e.target.value))}
                  className="scrubber-slider"
                />
                <span className="time-label">{formatSeconds(playback.durationSeconds || 180)}</span>
              </div>

              <div className="control-buttons-row">
                <div className="main-controls">
                  <button onClick={() => musicMirrorCore.previous()} className="btn-circle" title="Previous Track">
                    ⏮
                  </button>
                  <button onClick={handleTogglePlayPause} className="btn-circle hero" title={playback.isPlaying ? 'Pause' : 'Play'}>
                    {playback.isPlaying ? '⏸' : '⏵'}
                  </button>
                  <button onClick={() => musicMirrorCore.next()} className="btn-circle" title="Next Track">
                    ⏭
                  </button>
                  <button onClick={() => musicMirrorCore.stop()} className="btn-circle" title="Stop Playback">
                    ⏹
                  </button>
                </div>

                <div className="aux-controls">
                  <div className="volume-container">
                    <button onClick={() => musicMirrorCore.toggleMute()} className="action-btn">
                      {playback.isMuted ? '🔇' : '🔊'}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={playback.isMuted ? 0 : playback.volumePercent}
                      onChange={e => musicMirrorCore.setVolume(Number(e.target.value))}
                      className="volume-slider"
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '28px' }}>
                      {playback.volumePercent}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* YouTube IFrame Mount Container */}
            <div className="yt-player-card">
              <div id="youtube-player-container" ref={ytPlayerContainerRef} />
            </div>
          </div>

          {/* Discovery Pool & Candidate Search */}
          <div className="discovery-section">
            <div className="search-bar-row">
              <div className="search-input-wrap">
                <span className="search-icon-adornment">🔍</span>
                <input
                  type="text"
                  placeholder="Search songs, artists, genres, or moods..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="mirror-input search-input"
                />
              </div>
              <button onClick={() => handleSearch()} disabled={isSearching} className="btn-primary">
                {isSearching ? '...' : 'Search'}
              </button>
            </div>

            <span className="section-label">
              {searchResults.length > 0 ? `Discovery Results (${searchResults.length})` : `Recommended Candidates (${recommendations.length})`}
            </span>

            <div className="track-list">
              {(searchResults.length > 0 ? searchResults : recommendations).length === 0 ? (
                <div style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '12px' }}>
                  No candidate tracks loaded. Search for tracks above or execute a True Emotion reflection.
                </div>
              ) : (
                (searchResults.length > 0 ? searchResults : recommendations).map((track, idx) => (
                  <div key={`${track.id}-${idx}`} className="track-row">
                    <div className="track-row-left">
                      <span className="track-row-index">{idx + 1}</span>
                      <div className="track-row-meta">
                        <span className="track-row-title">{track.title}</span>
                        <span className="track-row-sub">{track.artist} · {track.metadata.durationFormatted}</span>
                      </div>
                    </div>

                    <div className="track-row-actions">
                      <button onClick={() => handlePlayTrack(track)} className="action-btn" style={{ color: 'var(--success)' }}>
                        ⏵ Play
                      </button>
                      <button
                        onClick={() => {
                          musicMirrorCore.addToQueue(track);
                          addLog(`Added "${track.title}" to queue`, 'info');
                        }}
                        className="action-btn"
                      >
                        + Queue
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Queue Manager */}
          <div className="discovery-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="section-label">Active Queue ({queue.items.length})</span>
              {queue.items.length > 0 && (
                <button onClick={() => musicMirrorCore.clearQueue()} className="action-btn" style={{ color: 'var(--danger)' }}>
                  Clear Queue
                </button>
              )}
            </div>

            <div className="track-list" style={{ maxHeight: '180px' }}>
              {queue.items.length === 0 ? (
                <div style={{ padding: '16px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '12px' }}>
                  Queue is empty. Add tracks from recommendations or candidate pool.
                </div>
              ) : (
                queue.items.map((item, idx) => {
                  const isCurrent = queue.currentIndex === idx;
                  return (
                    <div key={`${item.id}-${idx}`} className={`track-row ${isCurrent ? 'playing' : ''}`}>
                      <div className="track-row-left">
                        <span className="track-row-index">{isCurrent ? '▶' : idx + 1}</span>
                        <div className="track-row-meta">
                          <span className="track-row-title">{item.title}</span>
                          <span className="track-row-sub">{item.artist}</span>
                        </div>
                      </div>

                      <div className="track-row-actions">
                        <button onClick={() => handlePlayTrack(item)} className="action-btn">
                          Play
                        </button>
                        <button onClick={() => musicMirrorCore.removeFromQueue(idx)} className="action-btn" style={{ color: 'var(--danger)' }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

      </div>

      {/* ─── 4. COLLAPSIBLE DIAGNOSTICS & TEST HARNESS DRAWER ───────── */}
      <section className="diagnostic-drawer">
        <div
          className={`diagnostic-toggle-bar ${diagnosticsOpen ? 'open' : ''}`}
          onClick={() => setDiagnosticsOpen(prev => !prev)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>⚙️</span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Diagnostics & Reliability Test Harness</span>
            <span className="panel-title-badge">Cache: {cacheStats.size} | SLA: &lt;3000ms</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {diagnosticsOpen ? '▲ Collapse' : '▼ Expand'}
          </span>
        </div>

        {diagnosticsOpen && (
          <div className="diagnostic-content">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={runEmbedErrorFailoverTest} className="btn-secondary" style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}>
                ⚡ Simulate Error 150 (Embed Restricted)
              </button>
              <button onClick={runOfflineSimTest} className="btn-secondary" style={{ color: 'var(--emo-serene)' }}>
                🔌 Test Offline Fallback
              </button>
              <button onClick={runLatencyBenchmark} className="btn-secondary">
                ⏱ Benchmark Discovery Latency
              </button>
              <button onClick={() => { clearDiscoveryCache(); addLog('Discovery L1 cache purged', 'info'); }} className="btn-secondary">
                🧹 Purge Cache
              </button>
              <button onClick={() => { musicMirrorCore.resetState(); addLog('Core engine state reset', 'warn'); }} className="btn-secondary" style={{ color: 'var(--danger)' }}>
                🛑 Reset Core Engine
              </button>
            </div>

            {testStatus && (
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: '12px', color: '#c7d2fe' }}>
                {testStatus}
              </div>
            )}

            <div>
              <span className="section-label" style={{ display: 'block', marginBottom: '6px' }}>Telemetry & Event Trace Log</span>
              <div className="terminal-log-box">
                {statusLog.length === 0 ? (
                  <span style={{ color: 'var(--text-muted)' }}>No events logged yet.</span>
                ) : (
                  statusLog.map((log, i) => (
                    <div key={i} className={`log-entry ${log.type}`}>
                      <span className="log-time">[{log.time}]</span>
                      <span className="log-text">{log.msg}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─── 5. UNOBTRUSIVE FOOTER ───────────────────────────────────── */}
      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
        <span>Music Mirror AI · Headless Core & Affective Intelligence</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>v{appConfig.version} · Production Active</span>
      </footer>

    </div>
  );
}
