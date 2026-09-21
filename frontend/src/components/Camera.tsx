/**
 * Music Mirror — Camera Component
 *
 * Privacy requirements (spec §5, §6):
 *   - Camera access is NOT requested automatically on mount.
 *   - The user must explicitly click "Enable Camera" after reading the purpose disclosure.
 *   - Processing is local only (face-api.js runs in-browser).
 *   - Raw frames are not stored or transmitted.
 *   - Stream is stopped on component unmount or user-initiated disable.
 *   - No decorative overlays, landmark canvas, or animations.
 *
 * Data flow:
 *   User click -> CapabilityRegistry.requestCapability('CAMERA')
 *     -> getUserMedia (browser prompt)
 *     -> face-api.js local inference (TinyFaceDetector + FaceExpressionNet)
 *     -> extract {emotion, confidence} signal
 *     -> discard frame
 *     -> callback to parent
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import {
  requestCapability,
  markError,
  watchExternalRevocation,
  getState,
} from '../permissions/CapabilityRegistry';
import {
  recordConsent,
  hasConsent,
  withdrawConsent,
  CONSENT_PURPOSES,
} from '../permissions/ConsentRecord';

export interface DetectionResult {
  /** Dominant detected emotion label */
  emotion: string;
  /** Confidence of the dominant emotion (0.0 – 1.0) */
  confidence: number;
  /** All emotion scores, sorted descending by confidence */
  scores: [string, number][];
  /** 'camera' — indicates this came from the camera inference pipeline */
  source: 'camera';
  /** Inference latency in milliseconds (for diagnostic logging) */
  inferenceMs: number;
}

interface CameraProps {
  /** Called each time a new emotion is inferred from the camera feed. */
  onEmotion: (result: DetectionResult) => void;
}

// Emotion labels that face-api.js reports
const EMOTION_KEYS = ['happy', 'sad', 'angry', 'neutral', 'surprised', 'fearful', 'disgusted'] as const;

// How many frames to average for stable readings
const SMOOTHING_WINDOW = 5;

// Detection interval — 200ms (~5 fps) is sufficient for emotion inference
const DETECTION_INTERVAL_MS = 200;

type CameraPhase =
  | 'NOT_REQUESTED'   // Waiting for user to explicitly enable
  | 'LOADING_MODELS'  // Downloading face-api.js models
  | 'REQUESTING'      // Browser permission prompt shown
  | 'ACTIVE'          // Streaming and detecting
  | 'DENIED'          // User denied (this session)
  | 'BLOCKED'         // Browser/OS blocked — show settings guidance
  | 'UNAVAILABLE'     // Device not found or API not supported
  | 'ERROR';          // Unexpected error

export default function Camera({ onEmotion }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isDetectingRef = useRef(false);
  const emotionHistoryRef = useRef<Record<string, number>[]>([]);

  const [phase, setPhase] = useState<CameraPhase>('NOT_REQUESTED');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Cleanup: stop stream and detection on unmount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      isDetectingRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Detection loop
  // ---------------------------------------------------------------------------

  const handleVideoPlay = useCallback(() => {
    if (isDetectingRef.current) return;
    isDetectingRef.current = true;

    const detectLoop = async () => {
      if (!videoRef.current || !isDetectingRef.current) return;

      if (videoRef.current.readyState >= 2) {
        try {
          const t0 = performance.now();

          const detection = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

          const inferenceMs = Math.round(performance.now() - t0);

          if (detection?.expressions) {
            // Accumulate into smoothing buffer
            const frame: Record<string, number> = {};
            EMOTION_KEYS.forEach(k => {
              frame[k] = (detection.expressions as any)[k] ?? 0;
            });
            emotionHistoryRef.current.push(frame);
            if (emotionHistoryRef.current.length > SMOOTHING_WINDOW) {
              emotionHistoryRef.current.shift();
            }

            // Average across window
            const averaged: Record<string, number> = {};
            EMOTION_KEYS.forEach(k => {
              const sum = emotionHistoryRef.current.reduce((acc, f) => acc + (f[k] ?? 0), 0);
              averaged[k] = sum / emotionHistoryRef.current.length;
            });

            const sorted = Object.entries(averaged).sort((a, b) => b[1] - a[1]) as [string, number][];

            onEmotion({
              emotion: sorted[0][0],
              confidence: sorted[0][1],
              scores: sorted,
              source: 'camera',
              inferenceMs,
            });
          }
          // If no face detected, do not call onEmotion — preserve the last known value in parent.
        } catch {
          // Detection frame errors are tolerated — retry on next interval.
        }
      }

      setTimeout(detectLoop, DETECTION_INTERVAL_MS);
    };

    detectLoop();
  }, [onEmotion]);

  // ---------------------------------------------------------------------------
  // Enable: load models -> request permission -> start stream
  // ---------------------------------------------------------------------------

  const handleEnable = useCallback(async () => {
    // Record application-level consent before triggering browser prompt
    recordConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION, 'GRANTED');

    setPhase('LOADING_MODELS');
    setErrorMessage(null);
    emotionHistoryRef.current = [];

    try {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
    } catch {
      setPhase('ERROR');
      setErrorMessage('Failed to load local face detection models. Check that /models is accessible.');
      return;
    }

    setPhase('REQUESTING');

    const capStatus = await requestCapability('CAMERA');

    if (capStatus.state !== 'GRANTED') {
      if (capStatus.state === 'BLOCKED') {
        setPhase('BLOCKED');
        setErrorMessage(capStatus.reason);
      } else if (capStatus.state === 'UNAVAILABLE') {
        setPhase('UNAVAILABLE');
        setErrorMessage(capStatus.reason);
      } else {
        setPhase('DENIED');
        setErrorMessage(capStatus.reason);
      }
      return;
    }

    // Now open the actual stream (separate from probe in CapabilityRegistry)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      watchExternalRevocation('CAMERA');
      setPhase('ACTIVE');
    } catch (err: any) {
      markError('CAMERA', err?.message || 'Stream open failed');
      setPhase('ERROR');
      setErrorMessage('Camera stream could not be opened.');
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Ensure video element receives stream immediately upon phase becoming ACTIVE
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (phase === 'ACTIVE' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {
        // Autoplay policy fallback
      });
    }
  }, [phase]);

  // ---------------------------------------------------------------------------
  // Disable: stop stream, clear detection, record withdrawal
  // ---------------------------------------------------------------------------

  const handleDisable = useCallback(() => {
    isDetectingRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    withdrawConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION);
    setPhase('NOT_REQUESTED');
    setErrorMessage(null);
    emotionHistoryRef.current = [];
  }, []);

  // ---------------------------------------------------------------------------
  // Check if consent was previously given in this session (resume without re-prompting)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // If the user had granted consent earlier in this session and the capability
    // was previously GRANTED, we could re-activate. For now, always start fresh
    // on mount — the user must explicitly re-enable.
    // This is intentional: no hidden re-activation.
    const priorState = getState('CAMERA');
    const priorConsent = hasConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION);
    if (priorState.state === 'GRANTED' && priorConsent) {
      // Silently resume is allowed within the same session if both are valid
      // Disabled intentionally for transparency — user sees the gate each time.
      // Uncomment below to enable auto-resume:
      // handleEnable();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const s: React.CSSProperties = {
    fontFamily: 'inherit',
    fontSize: '13px',
  };

  return (
    <div style={{ ...s, display: 'flex', flexDirection: 'column', gap: '8px' }}>

      {/* NOT REQUESTED — show purpose disclosure and enable button */}
      {phase === 'NOT_REQUESTED' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Camera — Facial Emotion Detection</p>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <p style={{ margin: '0 0 4px 0' }}><strong>Purpose:</strong> Detect facial expression to assist emotion selection.</p>
            <p style={{ margin: '0 0 4px 0' }}><strong>Processing:</strong> Local only. Runs entirely in your browser.</p>
            <p style={{ margin: '0 0 4px 0' }}><strong>Data:</strong> No video frames are stored or transmitted. Only the inferred emotion label and confidence score are used.</p>
            <p style={{ margin: '0 0 4px 0' }}><strong>Optional:</strong> Camera is not required. You can select emotions manually below.</p>
          </div>
          <button onClick={handleEnable} className="btn-primary" style={{ alignSelf: 'flex-start', fontSize: '12px', padding: '6px 14px' }}>
            Enable Camera
          </button>
        </div>
      )}

      {/* LOADING MODELS */}
      {phase === 'LOADING_MODELS' && (
        <div style={{ padding: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Loading face detection models...
        </div>
      )}

      {/* REQUESTING — browser prompt is showing */}
      {phase === 'REQUESTING' && (
        <div style={{ padding: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Waiting for camera permission...
        </div>
      )}

      {/* ACTIVE — stream running */}
      {phase === 'ACTIVE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Camera active — local processing only</span>
            <button onClick={handleDisable} className="btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }}>
              Disable Camera
            </button>
          </div>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            onPlay={handleVideoPlay}
            style={{ width: '100%', height: '240px', objectFit: 'cover', display: 'block', transform: 'scaleX(-1)', borderRadius: 'var(--radius-sm)', background: '#000' }}
          />
        </div>
      )}

      {/* DENIED — user said no */}
      {phase === 'DENIED' && (
        <div style={{ padding: '10px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span>Camera access was denied. You can continue without camera — select emotions manually below.</span>
          <button onClick={() => setPhase('NOT_REQUESTED')} className="btn-secondary" style={{ alignSelf: 'flex-start', fontSize: '11px', padding: '4px 10px' }}>
            Try Again
          </button>
        </div>
      )}

      {/* BLOCKED — browser/OS has blocked access */}
      {phase === 'BLOCKED' && (
        <div style={{ padding: '10px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span>Camera is blocked by your browser or OS.</span>
          <span style={{ color: 'var(--text-muted)' }}>To enable: Settings &gt; Privacy and Security &gt; Site Settings &gt; Camera</span>
        </div>
      )}

      {/* UNAVAILABLE — hardware not present */}
      {phase === 'UNAVAILABLE' && (
        <div style={{ padding: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          No camera device found. Continue with manual emotion selection.
        </div>
      )}

      {/* ERROR */}
      {phase === 'ERROR' && (
        <div style={{ padding: '10px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span>Camera error: {errorMessage || 'Unexpected failure.'}</span>
          <button onClick={() => { setPhase('NOT_REQUESTED'); setErrorMessage(null); }} className="btn-secondary" style={{ alignSelf: 'flex-start', fontSize: '11px', padding: '4px 10px' }}>
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
