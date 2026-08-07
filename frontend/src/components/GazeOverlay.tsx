import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { GazeEventBus } from '../services/GazeEventBus';
import { EyeControlEngine } from '../services/EyeControlEngine';
import type { GazeEvent } from '../types';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function GazeOverlay() {
  const eyeControlSettings = useAppStore((s) => s.eyeControlSettings);
  const setEyeControlSettings = useAppStore((s) => s.setEyeControlSettings);
  const setCalibrationData = useAppStore((s) => s.setCalibrationData);

  const [gaze, setGaze] = useState<{ x: number; y: number } | null>(null);
  const [status, setStatus] = useState<{ active: boolean; confidence: number; message?: string }>({
    active: false,
    confidence: 0,
  });

  // Focused element state
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);
  const [dwellProgress, setDwellProgress] = useState<number>(0);
  const dwellTimerRef = useRef<number | null>(null);
  const dwellStartRef = useRef<number | null>(null);

  // Calibration Modal State
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [calibIndex, setCalibIndex] = useState(0);
  const [calibPointsCollected, setCalibPointsCollected] = useState<Array<{ targetX: number; targetY: number; eyeX: number; eyeY: number }>>([]);
  const [calibScore, setCalibScore] = useState<number | null>(null);

  const CALIB_TARGETS = [
    { x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.9, y: 0.1 },
    { x: 0.1, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.5 },
    { x: 0.1, y: 0.9 }, { x: 0.5, y: 0.9 }, { x: 0.9, y: 0.9 },
  ];

  // Subscribe to Gaze Events & Engine Status
  useEffect(() => {
    if (!eyeControlSettings.enabled) {
      EyeControlEngine.getInstance().stop();
      setGaze(null);
      setFocusedElement(null);
      return;
    }

    const engine = EyeControlEngine.getInstance();
    engine.setSmoothing(eyeControlSettings.eyeSmoothing);
    engine.start();

    const unsubGaze = GazeEventBus.subscribeGaze((event: GazeEvent) => {
      setGaze({ x: event.x, y: event.y });
    });

    const unsubStatus = GazeEventBus.subscribeStatus((st) => {
      setStatus(st);
    });

    return () => {
      unsubGaze();
      unsubStatus();
    };
  }, [eyeControlSettings.enabled, eyeControlSettings.eyeSmoothing]);

  // Hit testing & Dwell Timer processing
  useEffect(() => {
    if (!eyeControlSettings.enabled || !gaze || eyeControlSettings.trackingPaused || !status.active) {
      if (focusedElement) {
        focusedElement.classList.remove('gaze-focused');
        setFocusedElement(null);
      }
      setDwellProgress(0);
      return;
    }

    // Find element at gaze coordinates
    const target = document.elementFromPoint(gaze.x, gaze.y) as HTMLElement | null;
    const interactiveTarget = target ? (target.closest('[data-gaze-action], button, a, input, select, .studio-mini-player, .studio-large-card') as HTMLElement) : null;

    if (interactiveTarget !== focusedElement) {
      if (focusedElement) {
        focusedElement.classList.remove('gaze-focused');
      }

      if (interactiveTarget) {
        interactiveTarget.classList.add('gaze-focused');
        setFocusedElement(interactiveTarget);
        dwellStartRef.current = performance.now();

        if (dwellTimerRef.current) cancelAnimationFrame(dwellTimerRef.current);

        const updateDwell = () => {
          if (!dwellStartRef.current) return;
          const elapsed = performance.now() - dwellStartRef.current;
          const progress = Math.min(1.0, elapsed / eyeControlSettings.dwellTime);
          setDwellProgress(progress);

          if (progress >= 1.0) {
            // Trigger activation
            interactiveTarget.classList.add('gaze-activated');
            interactiveTarget.click();
            setTimeout(() => interactiveTarget.classList.remove('gaze-activated'), 400);

            // Reset dwell
            dwellStartRef.current = null;
            setDwellProgress(0);
          } else {
            dwellTimerRef.current = requestAnimationFrame(updateDwell);
          }
        };

        dwellTimerRef.current = requestAnimationFrame(updateDwell);
      } else {
        setFocusedElement(null);
        dwellStartRef.current = null;
        setDwellProgress(0);
      }
    }
  }, [gaze, eyeControlSettings.enabled, eyeControlSettings.dwellTime, eyeControlSettings.trackingPaused, status.active]);

  // 9-Point Calibration Handler
  const startCalibration = () => {
    setShowCalibrationModal(true);
    setCalibIndex(0);
    setCalibPointsCollected([]);
    setCalibScore(null);
  };

  const handleNextCalibPoint = () => {
    if (!gaze) return;
    const target = CALIB_TARGETS[calibIndex];
    const targetX = target.x * window.innerWidth;
    const targetY = target.y * window.innerHeight;

    const newPoint = {
      targetX,
      targetY,
      eyeX: gaze.x,
      eyeY: gaze.y,
    };

    const updated = [...calibPointsCollected, newPoint];
    setCalibPointsCollected(updated);

    if (calibIndex + 1 < CALIB_TARGETS.length) {
      setCalibIndex(calibIndex + 1);
    } else {
      // Calculate calibration score & finalize
      let totalErr = 0;
      updated.forEach((p) => {
        const dx = p.targetX - p.eyeX;
        const dy = p.targetY - p.eyeY;
        totalErr += Math.sqrt(dx * dx + dy * dy);
      });
      const avgErr = totalErr / updated.length;
      const score = Math.max(65, Math.min(98, Math.round(100 - avgErr / 15)));

      setCalibScore(score);
      EyeControlEngine.getInstance().setCalibration(updated);
      setCalibrationData(updated);
      setEyeControlSettings({ calibrated: true, calibrationScore: score });

      setTimeout(() => {
        setShowCalibrationModal(false);
      }, 1800);
    }
  };

  if (!eyeControlSettings.enabled) return null;

  return (
    <>
      {/* ── Visual Gaze Cursor & Glow Halo ── */}
      {gaze && eyeControlSettings.cursorVisible && (
        <div
          className="gaze-cursor-dot"
          style={{
            position: 'fixed',
            left: gaze.x,
            top: gaze.y,
            width: 24,
            height: 24,
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 9999,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${eyeControlSettings.highlightColor} 0%, rgba(212,175,55,0.2) 70%, transparent 100%)`,
            boxShadow: `0 0 16px ${eyeControlSettings.highlightColor}`,
            transition: 'transform 0.1s ease-out, background 0.2s ease',
          }}
        >
          {dwellProgress > 0 && (
            <svg
              width="36"
              height="36"
              style={{
                position: 'absolute',
                top: -6,
                left: -6,
                pointerEvents: 'none',
                transform: 'rotate(-90deg)',
              }}
            >
              <circle
                cx="18"
                cy="18"
                r="14"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="3"
                fill="none"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                stroke={eyeControlSettings.highlightColor}
                strokeWidth="3"
                fill="none"
                strokeDasharray={88}
                strokeDashoffset={88 * (1 - dwellProgress)}
                style={{ transition: 'stroke-dashoffset 0.05s linear' }}
              />
            </svg>
          )}
        </div>
      )}

      {/* ── Status / Low Confidence Fail-Safe Notification Badge ── */}
      {!status.active && status.message && (
        <div
          style={{
            position: 'fixed',
            top: 76,
            right: 24,
            zIndex: 9990,
            background: 'rgba(20, 20, 20, 0.92)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            backdropFilter: 'blur(16px)',
            borderRadius: '999px',
            padding: '8px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#F87171',
            fontSize: '0.78rem',
            fontWeight: 700,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <AlertCircle size={15} />
          <span>{status.message}</span>
        </div>
      )}

      {/* ── 9-Point Calibration Modal ── */}
      {showCalibrationModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(5, 5, 5, 0.95)',
            backdropFilter: 'blur(32px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ position: 'absolute', top: 40, textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 6 }}>
              Eye Control 9-Point Calibration
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
              Look directly at the highlighted gold point, then click or dwell to calibrate point {calibIndex + 1} of 9.
            </p>
          </div>

          {/* Current Target Point */}
          {calibScore === null ? (
            <div
              onClick={handleNextCalibPoint}
              style={{
                position: 'absolute',
                left: `${CALIB_TARGETS[calibIndex].x * 100}%`,
                top: `${CALIB_TARGETS[calibIndex].y * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(212,175,55,0.25)',
                border: '3px solid var(--gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 32px var(--gold)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--gold)' }} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', background: 'var(--surface)', padding: '36px 48px', borderRadius: 'var(--r-24)', border: '1px solid var(--glass-border)' }}>
              <CheckCircle2 size={48} style={{ color: 'var(--gold)', marginBottom: 12 }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 6 }}>Calibration Complete</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>Accuracy Score: <strong style={{ color: 'var(--gold)' }}>{calibScore}%</strong></p>
            </div>
          )}

          <div style={{ position: 'absolute', bottom: 40, display: 'flex', gap: 12 }}>
            <button
              onClick={() => setShowCalibrationModal(false)}
              className="pill-button secondary small"
            >
              Cancel Calibration
            </button>
          </div>
        </div>
      )}
      {/* Hidden button for global trigger */}
      <button id="btn-start-eye-calib" style={{ display: 'none' }} onClick={startCalibration} />
    </>
  );
}

// Global window trigger to open calibration modal from anywhere
(window as any).startEyeCalibration = () => {
  const overlayBtn = document.getElementById('btn-start-eye-calib');
  if (overlayBtn) overlayBtn.click();
};
