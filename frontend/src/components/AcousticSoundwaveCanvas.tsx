import React, { useRef, useEffect } from 'react';

interface AcousticSoundwaveCanvasProps {
  isPlaying: boolean;
  valence: number;      // 0.0 (sad) to 1.0 (happy)
  energy: number;       // 0.0 (calm) to 1.0 (intense)
  tempo: number;        // BPM (e.g. 60 - 180)
  accentColor?: string; // Hex or CSS color
  mode?: 'major' | 'minor';
  height?: number;
}

export const AcousticSoundwaveCanvas: React.FC<AcousticSoundwaveCanvasProps> = ({
  isPlaying,
  valence,
  energy,
  tempo,
  accentColor = '#6366f1',
  mode = 'major',
  height = 90,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(canvas);

    const render = () => {
      const width = canvas.getBoundingClientRect().width;
      ctx.clearRect(0, 0, width, height);

      // Phase progression based on BPM & energy
      const effectiveBpm = Math.max(50, Math.min(200, tempo || 100));
      const bpmFactor = effectiveBpm / 60;
      const speed = isPlaying
        ? (0.02 + energy * 0.03) * bpmFactor
        : 0.008; // Gentle breathing pulse when paused/idle
      phaseRef.current += speed;
      const phase = phaseRef.current;

      const midY = height / 2;
      const baseAmp = isPlaying
        ? 12 + energy * 24
        : 6; // Low amplitude idle breathing

      // Harmonic frequencies
      const freq1 = 0.015 + (1 - valence) * 0.008;
      const freq2 = 0.028 + energy * 0.012;
      const freq3 = 0.045 + (mode === 'major' ? 0.01 : 0.005);

      // Layer 1: Ambient Background Aura Wave
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 4) {
        const y = midY + Math.sin(x * freq1 + phase * 0.8) * (baseAmp * 0.85);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      const grad1 = ctx.createLinearGradient(0, 0, width, height);
      grad1.addColorStop(0, mode === 'major' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(99, 102, 241, 0.08)');
      grad1.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = grad1;
      ctx.fill();

      // Layer 2: Main Resonant Soundwave
      ctx.beginPath();
      for (let x = 0; x <= width; x += 2) {
        const y =
          midY +
          Math.sin(x * freq2 + phase) * baseAmp +
          Math.cos(x * freq1 - phase * 0.5) * (baseAmp * 0.35);
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = isPlaying ? 2.2 : 1.2;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = isPlaying ? 12 : 4;
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      // Layer 3: Overtone Shimmer Ripple
      if (isPlaying) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 3) {
          const y =
            midY +
            Math.sin(x * freq3 + phase * 1.6) * (baseAmp * 0.45) * valence;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.strokeStyle = mode === 'major' ? 'rgba(255, 255, 255, 0.45)' : 'rgba(168, 85, 247, 0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [isPlaying, valence, energy, tempo, accentColor, mode, height]);

  return (
    <div style={{ width: '100%', height, position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-sm)' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: `${height}px`,
          display: 'block',
          background: 'transparent',
        }}
      />
    </div>
  );
};

export default AcousticSoundwaveCanvas;
