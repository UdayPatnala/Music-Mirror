import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, Pause, SkipForward, Volume2, VolumeX, AlertCircle, Sparkles } from 'lucide-react';
import { sessionOrchestrator } from '../architecture/orchestrator/SessionOrchestrator';
import type { PlaybackState } from '../architecture/types/domain';
import { useAppStore } from '../store/useAppStore';

export default function GlobalPlayerHost() {
  const location = useLocation();
  const navigate = useNavigate();
  const [playbackState, setPlaybackState] = useState<PlaybackState>(() => sessionOrchestrator.getPlaybackState());

  useEffect(() => {
    const unsubscribe = sessionOrchestrator.subscribe((newState) => {
      setPlaybackState(newState);
    });
    return () => unsubscribe();
  }, []);

  const isRoom = location.pathname === '/room';
  if (isRoom) return null; // Room screen has its own built-in studio stage!

  const { currentCandidate, isPlaying, volume, isMuted, autoplayBlocked, sessionState, activeMood, attributionText } = playbackState;
  const storeSong = useAppStore.getState().currentSong;

  if (!currentCandidate && !storeSong && sessionState === 'IDLE') return null;

  const title = currentCandidate?.title || storeSong?.title || storeSong?.name || 'Music Mirror Audio';
  const artist = currentCandidate?.artist || currentCandidate?.artists?.[0] || storeSong?.artist || 'AI Recommended';
  const albumArt = currentCandidate?.artworkUrl || currentCandidate?.albumArtUrl;
  const providerId = currentCandidate?.providerId || 'jamendo';

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (autoplayBlocked) {
      sessionOrchestrator.enablePlayback();
    } else {
      sessionOrchestrator.togglePlayPause();
    }
  };

  const handleSkipNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    sessionOrchestrator.skipNext();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    sessionOrchestrator.setVolume(val);
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    sessionOrchestrator.setMute(!isMuted);
  };

  const handleCardClick = () => {
    if (!isRoom) {
      navigate('/room');
    }
  };

  return (
    <aside
      aria-label="Music Mirror Active Player"
      className={`player-global-host ${isRoom ? 'state-room' : 'state-floating'}`}
      onClick={handleCardClick}
      style={{ cursor: isRoom ? 'default' : 'pointer' }}
    >
      {/* Autoplay Blocked Alert Bar */}
      {autoplayBlocked && (
        <div
          role="alert"
          style={{
            background: 'linear-gradient(135deg, #d97706, #b45309)',
            color: '#ffffff',
            padding: '10px 16px',
            borderRadius: '8px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>Browser blocked auto-audio playback. Click button to activate!</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              sessionOrchestrator.enablePlayback();
            }}
            style={{
              background: '#ffffff',
              color: '#92400e',
              border: 'none',
              borderRadius: '999px',
              padding: '6px 14px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Enable Audio
          </button>
        </div>
      )}

      <div className="player-bar-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        {/* Track Metadata */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 8,
              background: '#1e293b',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {albumArt ? (
              <img src={albumArt} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Sparkles size={24} style={{ color: '#6366f1' }} />
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <h4 className="truncate" style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
              {title}
            </h4>
            <p className="truncate" style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
              {artist}
            </p>
            <span style={{ fontSize: '0.7rem', color: '#6366f1', textTransform: 'capitalize', fontWeight: 600 }}>
              Mood: {activeMood} • {sessionState}
            </span>
          </div>
        </div>

        {/* Primary Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            aria-label={isPlaying ? 'Pause music' : 'Play music'}
            onClick={handleTogglePlay}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
            }}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
          </button>

          <button
            aria-label="Skip to next track"
            onClick={handleSkipNext}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 8,
              borderRadius: '50%',
            }}
          >
            <SkipForward size={20} />
          </button>
        </div>

        {/* Volume & Provider Attribution */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            aria-label={isMuted ? 'Unmute volume' : 'Mute volume'}
            onClick={handleToggleMute}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            aria-label="Volume slider"
            style={{ width: 80, accentColor: '#6366f1', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap' }}>
            {attributionText || (providerId === 'youtube' ? 'Licensed via YouTube Embed' : 'Jamendo Creative Commons')}
          </span>
        </div>
      </div>
    </aside>
  );
}
