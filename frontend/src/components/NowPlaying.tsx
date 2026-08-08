import { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, Volume2, VolumeX, Sparkles, AlertCircle } from 'lucide-react';
import { sessionOrchestrator } from '../architecture/orchestrator/SessionOrchestrator';
import type { PlaybackState } from '../architecture/types/domain';

export default function NowPlaying() {
  const [playbackState, setPlaybackState] = useState<PlaybackState>(() => sessionOrchestrator.getPlaybackState());

  useEffect(() => {
    const unsubscribe = sessionOrchestrator.subscribe((newState) => {
      setPlaybackState(newState);
    });
    return () => unsubscribe();
  }, []);

  const { currentCandidate, isPlaying, isMuted, autoplayBlocked, sessionState, activeMood, attributionText } = playbackState;

  const title = currentCandidate?.title || 'Discovering Music...';
  const artist = currentCandidate?.artist || currentCandidate?.artists[0] || 'MusicMirror Engine';
  const albumArt = currentCandidate?.artworkUrl || currentCandidate?.albumArtUrl;
  const genre = currentCandidate?.genre || 'Ambient';
  const language = currentCandidate?.language || 'Universal';

  const getStatusText = (): string => {
    switch (sessionState) {
      case 'SEARCHING':
        return 'Finding a match...';
      case 'PREPARING':
        return 'Preparing audio playback...';
      case 'PLAYING':
        return `Music matched to your ${activeMood} mood`;
      case 'PAUSED':
        return 'Playback paused';
      case 'NO_PLAYABLE_MUSIC':
        return 'No playable music found. Switched to fallback.';
      default:
        return `Adapting to your mood (${activeMood})`;
    }
  };

  return (
    <div
      className="now-playing-card"
      style={{
        background: 'linear-gradient(135deg, rgba(18, 20, 26, 0.90), rgba(26, 29, 38, 0.95))',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '24px',
        color: '#ffffff',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Autoplay Alert Bar */}
      {autoplayBlocked && (
        <div
          role="alert"
          style={{
            background: 'linear-gradient(135deg, #d97706, #b45309)',
            color: '#ffffff',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} />
            <span>Click button below to enable browser audio!</span>
          </div>
          <button
            onClick={() => sessionOrchestrator.enablePlayback()}
            style={{
              background: '#ffffff',
              color: '#92400e',
              border: 'none',
              borderRadius: '999px',
              padding: '6px 16px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Enable Audio
          </button>
        </div>
      )}

      {/* Album Artwork Frame */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          maxHeight: 240,
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #1e1b4b, #311b92)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
        }}
      >
        {albumArt ? (
          <img src={albumArt} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ textAlign: 'center', padding: '16px' }}>
            <Sparkles size={48} style={{ color: '#818cf8', marginBottom: '8px' }} />
            <p style={{ fontSize: '0.85rem', color: '#a5b4fc', margin: 0 }}>{getStatusText()}</p>
          </div>
        )}
      </div>

      {/* Metadata & Status */}
      <div style={{ marginBottom: '20px' }}>
        <span
          style={{
            display: 'inline-block',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#818cf8',
            marginBottom: '4px',
          }}
        >
          {getStatusText()}
        </span>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }} className="truncate">
          {title}
        </h3>
        <p style={{ fontSize: '0.95rem', color: '#94a3b8', margin: '0 0 12px 0' }} className="truncate">
          {artist}
        </p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
            {genre}
          </span>
          <span style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
            {language}
          </span>
        </div>
      </div>

      {/* Player Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <button
          aria-label={isPlaying ? 'Pause music' : 'Play music'}
          onClick={() => (autoplayBlocked ? sessionOrchestrator.enablePlayback() : sessionOrchestrator.togglePlayPause())}
          style={{
            flex: 1,
            height: 48,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            border: 'none',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
          }}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <button
          aria-label="Skip to next track"
          onClick={() => sessionOrchestrator.skipNext()}
          style={{
            height: 48,
            padding: '0 20px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#f8fafc',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <SkipForward size={18} />
          <span>Skip</span>
        </button>

        <button
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          onClick={() => sessionOrchestrator.setMute(!isMuted)}
          style={{
            width: 48,
            height: 48,
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* Attribution */}
      <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>
        {attributionText || 'MusicMirror Privacy-Preserving Automatic Discovery'}
      </div>
    </div>
  );
}
