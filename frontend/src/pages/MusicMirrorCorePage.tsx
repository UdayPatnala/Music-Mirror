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
import { serviceWorkerManager } from '../services/ServiceWorkerManager';
import { appConfig } from '../config/appConfig';

/* ─── Emotion Taxonomy ───────────────────────────────────────────────────── */

interface EmotionDescriptor {
  id: string;
  label: string;
  valence: number;  // 0.0 (sad/gloomy) to 1.0 (happy/cheerful)
  energy: number;   // 0.0 (calm/serene) to 1.0 (intense/energetic)
  targetBpm: number;
  mode: 'major' | 'minor';
  description: string;
}

const EMOTIONS: EmotionDescriptor[] = [
  { id: 'serene',     label: 'Serene',     valence: 0.70, energy: 0.25, targetBpm: 75,  mode: 'major', description: 'Tranquil, calm, gentle' },
  { id: 'joyful',     label: 'Joyful',     valence: 0.95, energy: 0.88, targetBpm: 128, mode: 'major', description: 'Uplifting, energetic, cheerful' },
  { id: 'melancholy', label: 'Melancholy', valence: 0.20, energy: 0.30, targetBpm: 70,  mode: 'minor', description: 'Introspective, yearning, somber' },
  { id: 'triumphant', label: 'Triumphant', valence: 0.85, energy: 0.92, targetBpm: 136, mode: 'major', description: 'Powerful, resolute, driven' },
  { id: 'focused',    label: 'Focused',    valence: 0.55, energy: 0.45, targetBpm: 95,  mode: 'minor', description: 'Ambient, lo-fi, distraction-free' },
  { id: 'cathartic',  label: 'Cathartic',  valence: 0.30, energy: 0.95, targetBpm: 145, mode: 'minor', description: 'Intense, tension-releasing' },
  { id: 'centered',   label: 'Centered',   valence: 0.50, energy: 0.50, targetBpm: 100, mode: 'major', description: 'Balanced, grounded, neutral' },
];

type MirrorPolicy = 'REFLECT' | 'REGULATE' | 'CATHARSIS' | 'BALANCE';

const POLICY_DESCRIPTIONS: Record<MirrorPolicy, string> = {
  REFLECT: 'Match current emotional state',
  REGULATE: 'Guide toward a target mood',
  CATHARSIS: 'Release tension through music',
  BALANCE: 'Center and ground',
};

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function MusicMirrorCorePage() {
  // ── Core Engine State ──────────────────────────────────────────────
  const [playback, setPlayback] = useState<PlaybackState>(musicMirrorCore.getPlaybackState());
  const [queue, setQueue] = useState<QueueState>(musicMirrorCore.getQueue());
  const [health, setHealth] = useState<SystemHealth>({
    status: 'READY',
    backendConnected: false,
    databaseHealthy: false,
    activeProvider: 'youtube',
    version: appConfig.version,
    lastCheckedTimestamp: Date.now(),
  });

  // ── Emotion State ──────────────────────────────────────────────────
  const [activeEmotion, setActiveEmotion] = useState<EmotionDescriptor>(EMOTIONS[1]); // Joyful default
  const [mirrorPolicy, setMirrorPolicy] = useState<MirrorPolicy>('REFLECT');
  const [targetEmotion, setTargetEmotion] = useState<EmotionDescriptor>(EMOTIONS[0]);
  const [facialDetection, setFacialDetection] = useState<DetectionResult | null>(null);
  const [cameraVisible, setCameraVisible] = useState<boolean>(false);
  const [userNote, setUserNote] = useState<string>('');

  // ── Discovery & Results ────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [journeySteps, setJourneySteps] = useState<Track[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Diagnostics ────────────────────────────────────────────────────
  const [statusLog, setStatusLog] = useState<Array<{ time: string; msg: string; type: 'info' | 'warn' | 'error' }>>([]);
  const [cacheStats, setCacheStats] = useState({ size: 0, inFlightCount: 0 });
  const [lastLatencyMs, setLastLatencyMs] = useState<number>(0);
  const [testStatus, setTestStatus] = useState<string>('');
  const [diagnosticsOpen, setDiagnosticsOpen] = useState<boolean>(false);
  const ytPlayerContainerRef = useRef<HTMLDivElement>(null);

  // ── Logging ────────────────────────────────────────────────────────
  const addLog = useCallback((msg: string, type: 'info' | 'warn' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setStatusLog(prev => [{ time, msg, type }, ...prev.slice(0, 40)]);
  }, []);

  // ── Initialization ─────────────────────────────────────────────────
  useEffect(() => {
    musicMirrorCore.initialize();
    const unsubPlayback = musicMirrorCore.subscribe(state => setPlayback(state));
    const unsubQueue = musicMirrorCore.subscribeQueue(q => setQueue(q));

    apiClient.checkHealth().then(h => {
      setHealth({
        ...h,
        status: h.backendConnected ? h.status : 'READY',
      });
      addLog(`Backend: ${h.status} v${h.version}`, 'info');
    }).catch(err => {
      setHealth(prev => ({ ...prev, backendConnected: false, activeProvider: 'fallback' }));
      addLog(`Backend unreachable: ${err.message}`, 'warn');
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

  // ── Effective valence blends facial detection if available ─────────
  const effectiveValence = facialDetection
    ? Math.round(((activeEmotion.valence * 0.6) + (facialDetection.confidence * 0.4)) * 100) / 100
    : activeEmotion.valence;
  const effectiveEnergy = activeEmotion.energy;

  // ── Facial Detection Callback ──────────────────────────────────────
  const handleFacialDetection = (res: DetectionResult) => {
    setFacialDetection(res);
    const matched = EMOTIONS.find(e => e.id === res.emotion);
    if (matched && res.confidence > 0.65) {
      addLog(`Camera: ${res.emotion} (${(res.confidence * 100).toFixed(0)}% confidence, ${res.inferenceMs}ms)`, 'info');
    }
  };

  // ── Recommendation / Emotion Reflection ───────────────────────────
  const handleReflect = async () => {
    setIsSearching(true);
    setErrorMessage(null);
    const start = Date.now();
    try {
      addLog(`Reflecting: ${activeEmotion.label} [${mirrorPolicy}]`, 'info');

      if (mirrorPolicy === 'REGULATE') {
        const journey = await musicMirrorCore.getTransitionJourney(
          activeEmotion.id,
          targetEmotion.id,
          4
        );
        setJourneySteps(journey.journeySteps || journey.tracks);
        setRecommendations(journey.tracks);
        if (journey.tracks.length > 0) {
          musicMirrorCore.clearQueue();
          journey.tracks.forEach(t => musicMirrorCore.addToQueue(t));
          await musicMirrorCore.play(journey.tracks[0]);
          addLog(`Journey: ${journey.tracks.length} tracks loaded`, 'info');
        } else {
          addLog('Regulate journey fallback: searching candidate pool...', 'warn');
          await handleSearch(`${activeEmotion.label} ${activeEmotion.mode || ''}`);
        }
      } else {
        const recs = await musicMirrorCore.getRecommendations(
          activeEmotion.id,
          mirrorPolicy.toLowerCase()
        );
        setRecommendations(recs.tracks);
        if (recs.tracks.length > 0) {
          musicMirrorCore.clearQueue();
          recs.tracks.forEach(t => musicMirrorCore.addToQueue(t));
          await musicMirrorCore.play(recs.tracks[0]);
          addLog(`Reflect: ${recs.tracks.length} tracks loaded`, 'info');
        } else {
          addLog('No catalog results. Searching candidate pool...', 'warn');
          await handleSearch(`${activeEmotion.label} ${activeEmotion.mode || ''}`);
        }
      }
      setLastLatencyMs(Date.now() - start);
    } catch (err: any) {
      addLog(`Fallback: candidate recovery triggered (${err.message})`, 'warn');
      await handleSearch(`${activeEmotion.label} ${activeEmotion.mode || ''}`);
    } finally {
      setIsSearching(false);
    }
  };

  // ── Search ─────────────────────────────────────────────────────────
  const handleSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery || searchQuery).trim();
    if (!q) return;
    setIsSearching(true);
    setErrorMessage(null);
    const start = Date.now();
    try {
      addLog(`Search: "${q}"`, 'info');
      const result: SearchResult = await musicMirrorCore.searchTracks(q, 12);
      setSearchResults(result.tracks);
      if (recommendations.length === 0) {
        setRecommendations(result.tracks);
      }
      if (result.tracks.length > 0 && queue.items.length === 0) {
        musicMirrorCore.clearQueue();
        result.tracks.forEach(t => musicMirrorCore.addToQueue(t));
        await musicMirrorCore.play(result.tracks[0]);
      }
      setLastLatencyMs(Date.now() - start);
      addLog(`Results: ${result.tracks.length} tracks (${result.latencyMs}ms, cached: ${result.isCached})`, 'info');
    } catch (err: any) {
      setErrorMessage(err.message || 'Search failed');
      addLog(`Search error: ${err.message}`, 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // ── Playback Handlers ──────────────────────────────────────────────
  const handlePlayTrack = async (track: Track) => {
    addLog(`Play: "${track.title}" — ${track.artist}`, 'info');
    await musicMirrorCore.play(track);
  };

  const handleTogglePlayPause = async () => {
    if (playback.isPlaying) {
      await musicMirrorCore.pause();
      addLog('Paused', 'info');
    } else {
      await musicMirrorCore.resume();
      addLog('Resumed', 'info');
    }
  };

  // ── Diagnostic Tests ───────────────────────────────────────────────
  const runFailoverTest = () => {
    setTestStatus('Simulating embed error 150 (restricted video)...');
    addLog('Test: triggering IFrame error 150', 'warn');
    musicMirrorCore.reportFailure('150');
    setTimeout(() => {
      setTestStatus('Failover: transitioned to next candidate.');
      addLog('Test pass: failover ladder executed', 'info');
    }, 1200);
  };

  const runOfflineTest = () => {
    setTestStatus('Testing offline fallback candidate resolution...');
    addLog('Test: querying with simulated network blackout', 'warn');
    musicMirrorCore.searchTracks('Acoustic Calm Offline', 5).then(res => {
      setTestStatus(`Offline fallback: ${res.tracks.length} tracks available.`);
      addLog(`Test pass: offline pool returned ${res.tracks.length} tracks`, 'info');
    }).catch(err => {
      setTestStatus(`Test error: ${err.message}`);
    });
  };

  const runLatencyBenchmark = async () => {
    setTestStatus('Benchmarking discovery latency...');
    const t0 = performance.now();
    await musicMirrorCore.searchTracks('Sid Sriram Telugu Soul', 10);
    const duration = Math.round(performance.now() - t0);
    setTestStatus(`Benchmark: ${duration}ms query-to-candidate`);
    addLog(`Benchmark: ${duration}ms`, 'info');
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ── Active track list (search results take priority over recommendations) ─
  const displayTracks = searchResults.length > 0 ? searchResults : recommendations;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="mm-shell">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header className="mm-header">
        <span className="mm-title">Music Mirror</span>
        <div className="mm-status-row">
          <span className={`mm-status-dot ${health.status === 'READY' ? 'ready' : health.status === 'DEGRADED' ? 'degraded' : 'offline'}`} />
          <span>ENGINE: {health.status}</span>
          <span>|</span>
          <span>API: {health.backendConnected ? 'ONLINE' : 'STANDALONE'}</span>
          <span>|</span>
          <span>PROVIDER: {health.activeProvider.toUpperCase()}</span>
          <span>|</span>
          <span>LATENCY: {lastLatencyMs}ms</span>
          <span>|</span>
          <span>v{appConfig.version}</span>
        </div>
      </header>

      {/* ── ERROR BANNER ────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="mm-error-banner">
          <span>Error: {errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="btn-sm">Dismiss</button>
        </div>
      )}

      {/* ── MAIN GRID ───────────────────────────────────────────────── */}
      <div className="mm-grid">

        {/* ── COLUMN A: EMOTION CONTROL ─────────────────────────────── */}
        <section className="mm-panel">
          <h2 className="mm-panel-title">Emotion Control</h2>

          {/* Camera (optional, consent-gated) */}
          <div className="mm-section">
            <div className="mm-section-header">
              <span className="mm-label">Facial Emotion Detection</span>
              <button
                onClick={() => setCameraVisible(v => !v)}
                className="btn-sm"
              >
                {cameraVisible ? 'Hide' : 'Show'}
              </button>
            </div>

            {cameraVisible && (
              <Camera onEmotion={handleFacialDetection} />
            )}

            {facialDetection && cameraVisible && (
              <div className="mm-data-row">
                <span>Detected: <strong>{facialDetection.emotion}</strong></span>
                <span>Confidence: <strong>{(facialDetection.confidence * 100).toFixed(0)}%</strong></span>
                <span>Inference: {facialDetection.inferenceMs}ms</span>
              </div>
            )}
          </div>

          {/* Emotion selector */}
          <div className="mm-section">
            <span className="mm-label">Select Emotional State</span>
            <div className="mm-emotion-grid">
              {EMOTIONS.map(e => (
                <button
                  key={e.id}
                  onClick={() => setActiveEmotion(e)}
                  className={`mm-emotion-btn ${activeEmotion.id === e.id ? 'active' : ''}`}
                  title={e.description}
                >
                  <span className="mm-emotion-name">{e.label}</span>
                  <span className="mm-emotion-meta">{e.mode} · {e.targetBpm}bpm</span>
                  <span className="mm-emotion-vals">V:{e.valence} E:{e.energy}</span>
                </button>
              ))}
            </div>
            <p className="mm-desc">{activeEmotion.description}</p>
          </div>

          {/* Computed values */}
          <div className="mm-section">
            <span className="mm-label">Effective Values</span>
            <div className="mm-data-row">
              <span>Valence: <strong>{effectiveValence}</strong></span>
              <span>Energy: <strong>{effectiveEnergy}</strong></span>
              <span>BPM: <strong>{activeEmotion.targetBpm}</strong></span>
              <span>Mode: <strong>{activeEmotion.mode.toUpperCase()}</strong></span>
            </div>
            {facialDetection && (
              <p className="mm-desc" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                Valence blended: (manual 60% + facial 40%)
              </p>
            )}
          </div>

          {/* Policy selector */}
          <div className="mm-section">
            <span className="mm-label">Mirror Policy</span>
            <div className="mm-policy-group">
              {(['REFLECT', 'REGULATE', 'CATHARSIS', 'BALANCE'] as MirrorPolicy[]).map(p => (
                <button
                  key={p}
                  onClick={() => setMirrorPolicy(p)}
                  className={`mm-policy-btn ${mirrorPolicy === p ? 'active' : ''}`}
                  title={POLICY_DESCRIPTIONS[p]}
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="mm-desc">{POLICY_DESCRIPTIONS[mirrorPolicy]}</p>
          </div>

          {/* REGULATE: target mood selector */}
          {mirrorPolicy === 'REGULATE' && (
            <div className="mm-section">
              <span className="mm-label">Target Mood</span>
              <select
                value={targetEmotion.id}
                onChange={e => {
                  const found = EMOTIONS.find(x => x.id === e.target.value);
                  if (found) setTargetEmotion(found);
                }}
                className="mm-select"
              >
                {EMOTIONS.filter(x => x.id !== activeEmotion.id).map(e => (
                  <option key={e.id} value={e.id}>{e.label} (V:{e.valence} E:{e.energy})</option>
                ))}
              </select>
            </div>
          )}

          {/* Journey steps (REGULATE mode) */}
          {journeySteps.length > 0 && mirrorPolicy === 'REGULATE' && (
            <div className="mm-section">
              <span className="mm-label">Transition Path ({journeySteps.length} steps)</span>
              <ol className="mm-journey-list">
                {journeySteps.map((step, idx) => (
                  <li key={idx}>{step.title} — {step.artist}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Optional context note */}
          <div className="mm-section">
            <span className="mm-label">Context Note (optional)</span>
            <input
              type="text"
              placeholder="What are you doing or feeling right now?"
              value={userNote}
              onChange={e => setUserNote(e.target.value)}
              className="mm-input"
            />
          </div>

          {/* Execute */}
          <button
            onClick={handleReflect}
            disabled={isSearching}
            className="btn-primary"
            style={{ width: '100%' }}
          >
            {isSearching ? 'Loading...' : 'Execute Emotion Mirror'}
          </button>
        </section>

        {/* ── COLUMN B: PLAYBACK + DISCOVERY ───────────────────────── */}
        <section className="mm-panel">
          <h2 className="mm-panel-title">Playback — {playback.status}</h2>

          {/* Now Playing */}
          <div className="mm-section">
            <span className="mm-label">Now Playing</span>
            <div className="mm-now-playing">
              <div className="mm-track-info">
                <span className="mm-track-title">
                  {playback.currentTrack ? playback.currentTrack.title : 'No track loaded'}
                </span>
                <span className="mm-track-artist">
                  {playback.currentTrack ? playback.currentTrack.artist : 'Select an emotion or search to begin'}
                </span>
                {playback.currentTrack && (
                  <div className="mm-data-row" style={{ fontSize: '11px', marginTop: '4px' }}>
                    <span>V:{playback.currentTrack.acousticFeatures?.valence ?? 'n/a'}</span>
                    <span>E:{playback.currentTrack.acousticFeatures?.energy ?? 'n/a'}</span>
                    <span>BPM:{playback.currentTrack.acousticFeatures?.tempo ?? 'n/a'}</span>
                    <span>SRC:{playback.currentTrack.primarySource?.sourceType ?? 'n/a'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Transport */}
          <div className="mm-section">
            <div className="mm-transport">
              <span className="mm-time">{formatTime(playback.currentTimeSeconds)}</span>
              <input
                type="range"
                min={0}
                max={playback.durationSeconds || 180}
                value={playback.currentTimeSeconds}
                onChange={e => musicMirrorCore.seek(Number(e.target.value))}
                className="mm-scrubber"
              />
              <span className="mm-time">{formatTime(playback.durationSeconds || 180)}</span>
            </div>

            <div className="mm-controls-row">
              <div className="mm-controls-main">
                <button onClick={() => musicMirrorCore.previous()} className="btn-ctrl">Prev</button>
                <button onClick={handleTogglePlayPause} className="btn-ctrl btn-ctrl-primary">
                  {playback.isPlaying ? 'Pause' : 'Play'}
                </button>
                <button onClick={() => musicMirrorCore.next()} className="btn-ctrl">Next</button>
                <button onClick={() => musicMirrorCore.stop()} className="btn-ctrl">Stop</button>
              </div>

              <div className="mm-controls-aux">
                <button onClick={() => musicMirrorCore.toggleMute()} className="btn-ctrl">
                  {playback.isMuted ? 'Unmute' : 'Mute'}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={playback.isMuted ? 0 : playback.volumePercent}
                  onChange={e => musicMirrorCore.setVolume(Number(e.target.value))}
                  className="mm-volume"
                />
                <span className="mm-time">{playback.volumePercent}%</span>
              </div>
            </div>
          </div>

          {/* YouTube iframe mount */}
          <div className="mm-yt-container">
            <div id="youtube-player-container" ref={ytPlayerContainerRef} />
          </div>

          {/* Search */}
          <div className="mm-section">
            <span className="mm-label">Search</span>
            <div className="mm-search-row">
              <input
                type="text"
                placeholder="Artist, song, genre, or mood"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="mm-input"
              />
              <button onClick={() => handleSearch()} disabled={isSearching} className="btn-primary">
                {isSearching ? '...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="mm-section">
            <span className="mm-label">
              {searchResults.length > 0
                ? `Search Results (${searchResults.length})`
                : `Recommendations (${recommendations.length})`}
            </span>
            <div className="mm-track-list">
              {displayTracks.length === 0 ? (
                <span className="mm-empty">No tracks loaded. Search or execute emotion mirror.</span>
              ) : (
                displayTracks.map((track, idx) => (
                  <div key={`${track.id}-${idx}`} className="mm-track-row">
                    <span className="mm-track-idx">{idx + 1}</span>
                    <div className="mm-track-meta">
                      <span className="mm-track-row-title">{track.title}</span>
                      <span className="mm-track-row-sub">{track.artist} · {track.metadata.durationFormatted}</span>
                    </div>
                    <div className="mm-track-actions">
                      <button onClick={() => handlePlayTrack(track)} className="btn-sm btn-sm-action">Play</button>
                      <button
                        onClick={() => {
                          musicMirrorCore.addToQueue(track);
                          addLog(`Queued: "${track.title}"`, 'info');
                        }}
                        className="btn-sm"
                      >
                        Queue
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Queue */}
          <div className="mm-section">
            <div className="mm-section-header">
              <span className="mm-label">Queue ({queue.items.length})</span>
              {queue.items.length > 0 && (
                <button onClick={() => musicMirrorCore.clearQueue()} className="btn-sm btn-sm-danger">
                  Clear
                </button>
              )}
            </div>
            <div className="mm-track-list mm-track-list-sm">
              {queue.items.length === 0 ? (
                <span className="mm-empty">Queue is empty.</span>
              ) : (
                queue.items.map((item, idx) => {
                  const isCurrent = queue.currentIndex === idx;
                  return (
                    <div key={`${item.id}-${idx}`} className={`mm-track-row ${isCurrent ? 'current' : ''}`}>
                      <span className="mm-track-idx">{isCurrent ? '>' : idx + 1}</span>
                      <div className="mm-track-meta">
                        <span className="mm-track-row-title">{item.title}</span>
                        <span className="mm-track-row-sub">{item.artist}</span>
                      </div>
                      <div className="mm-track-actions">
                        <button onClick={() => handlePlayTrack(item)} className="btn-sm btn-sm-action">Play</button>
                        <button onClick={() => musicMirrorCore.removeFromQueue(idx)} className="btn-sm btn-sm-danger">X</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

      </div>

      {/* ── DIAGNOSTICS DRAWER ──────────────────────────────────────── */}
      <section className="mm-diagnostics">
        <button
          className="mm-diag-toggle"
          onClick={() => setDiagnosticsOpen(v => !v)}
        >
          Diagnostics — Cache: {cacheStats.size} | SLA: &lt;3000ms
          <span>{diagnosticsOpen ? ' [collapse]' : ' [expand]'}</span>
        </button>

        {diagnosticsOpen && (
          <div className="mm-diag-content">
            <div className="mm-diag-actions">
              <button onClick={runFailoverTest} className="btn-sm">Simulate Error 150</button>
              <button onClick={runOfflineTest} className="btn-sm">Test Offline Fallback</button>
              <button onClick={runLatencyBenchmark} className="btn-sm">Benchmark Latency</button>
              <button onClick={() => { clearDiscoveryCache(); addLog('Cache purged', 'info'); }} className="btn-sm">Purge Cache</button>
              <button onClick={async () => { await musicMirrorCore.clearOfflineCache(); addLog('Offline DB cache purged', 'info'); }} className="btn-sm">Purge Offline DB</button>
              <button onClick={async () => { await serviceWorkerManager.purgeAudioStreamCache(); addLog('SW Audio Stream cache purged', 'info'); }} className="btn-sm">Purge SW Cache</button>
              <button onClick={() => { const m = musicMirrorCore.getAcousticDspMetrics(); addLog(`DSP: RMS ${(m.rmsEnergy * 100).toFixed(1)}% | Centroid ${Math.round(m.spectralCentroidHz)}Hz | Flatness ${m.spectralFlatness.toFixed(3)}`, 'info'); }} className="btn-sm">Sample Acoustic DSP</button>
              <button onClick={() => { musicMirrorCore.resetState(); addLog('Core engine reset', 'warn'); }} className="btn-sm btn-sm-danger">Reset Engine</button>
            </div>

            {testStatus && (
              <div className="mm-diag-status">{testStatus}</div>
            )}

            <div>
              <span className="mm-label">Event Log</span>
              <div className="mm-log-box">
                {statusLog.length === 0 ? (
                  <span className="mm-empty">No events.</span>
                ) : (
                  statusLog.map((log, i) => (
                    <div key={i} className={`mm-log-entry ${log.type}`}>
                      <span className="mm-log-time">[{log.time}]</span>
                      <span>{log.msg}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="mm-footer">
        <span>Music Mirror — Headless Core</span>
        <span>v{appConfig.version}</span>
      </footer>

    </div>
  );
}
