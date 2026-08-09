import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { Camera as CameraIcon, CameraOff, Sun, Moon } from "lucide-react";

export interface DetectionResult {
  emotion: string;
  confidence: number;
  scores: [string, number][];
  source: string;
  landmarks?: { x: number; y: number }[];
  box?: { x: number; y: number; width: number; height: number };
  inferenceMs?: number;
}

interface CameraProps {
  onEmotion: (result: DetectionResult) => void;
  /** When true, loads landmark model and draws facial dots on a canvas overlay */
  showLandmarks?: boolean;
}

export default function Camera({ onEmotion, showLandmarks = false }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isDetectingRef = useRef(false);

  const [cameraState, setCameraState] = useState<"loading" | "requesting" | "active" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [lightingCondition, setLightingCondition] = useState<"good" | "low" | "high">("good");

  const emotionHistory = useRef<any[]>([]);
  const lastKnownEmotion = useRef<string | null>(null);
  const faceLostTimer = useRef<NodeJS.Timeout | null>(null);

  const analyzeLighting = (videoElement: HTMLVideoElement) => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
      canvasRef.current.width = 160;
      canvasRef.current.height = 120;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoElement, 0, 0, 160, 120);
    const imageData = ctx.getImageData(0, 0, 160, 120);
    const data = imageData.data;
    let r: number, g: number, b: number, avg: number;
    let colorSum = 0;

    for (let x = 0, len = data.length; x < len; x += 4) {
      r = data[x];
      g = data[x + 1];
      b = data[x + 2];
      avg = Math.floor((r + g + b) / 3);
      colorSum += avg;
    }

    const brightness = Math.floor(colorSum / (160 * 120));
    if (brightness < 45) {
      setLightingCondition("low");
    } else if (brightness > 210) {
      setLightingCondition("high");
    } else {
      setLightingCondition("good");
    }
  };

  /** Draw facial landmark dots + connections on the overlay canvas */
  const drawLandmarks = useCallback(
    (
      detections: faceapi.WithFaceLandmarks<
        { detection: faceapi.FaceDetection },
        faceapi.FaceLandmarks68
      > | null,
      videoEl: HTMLVideoElement
    ) => {
      const overlay = overlayCanvasRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext("2d");
      if (!ctx) return;

      // Match canvas size to video display size
      const { videoWidth, videoHeight } = videoEl;
      overlay.width = videoWidth || 640;
      overlay.height = videoHeight || 480;
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      if (!detections) return;

      const landmarks = detections.landmarks;
      const positions = landmarks.positions;
      const box = detections.detection.box;

      // ── Face bounding box ──
      ctx.strokeStyle = "rgba(212,175,55,0.55)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Corner accent marks
      const cLen = 14;
      ctx.strokeStyle = "#D4AF37";
      ctx.lineWidth = 2.5;
      const corners = [
        [box.x, box.y, cLen, 0, 0, cLen],
        [box.x + box.width, box.y, -cLen, 0, 0, cLen],
        [box.x, box.y + box.height, cLen, 0, 0, -cLen],
        [box.x + box.width, box.y + box.height, -cLen, 0, 0, -cLen],
      ] as const;
      corners.forEach(([cx, cy, dx1, , , dy2]) => {
        ctx.beginPath();
        ctx.moveTo(cx + dx1, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + dy2);
        ctx.stroke();
      });

      // ── Landmark regions ──
      const REGIONS: { indices: number[]; color: string; label: string }[] = [
        { indices: Array.from({ length: 17 }, (_, i) => i),                color: "rgba(45,212,191,0.8)",  label: "jawline" },
        { indices: Array.from({ length: 5 }, (_, i) => i + 17),            color: "rgba(99,102,241,0.8)",  label: "left_brow" },
        { indices: Array.from({ length: 5 }, (_, i) => i + 22),            color: "rgba(99,102,241,0.8)",  label: "right_brow" },
        { indices: Array.from({ length: 9 }, (_, i) => i + 27),            color: "rgba(139,92,246,0.8)",  label: "nose_bridge" },
        { indices: Array.from({ length: 4 }, (_, i) => i + 36),            color: "rgba(52,211,153,0.8)",  label: "left_eye" },
        { indices: Array.from({ length: 4 }, (_, i) => i + 42),            color: "rgba(52,211,153,0.8)",  label: "right_eye" },
        { indices: Array.from({ length: 12 }, (_, i) => i + 48),           color: "rgba(244,114,182,0.8)", label: "mouth" },
      ];

      // Draw connecting lines between region points
      REGIONS.forEach(({ indices, color }) => {
        if (indices.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.8;
        ctx.moveTo(positions[indices[0]].x, positions[indices[0]].y);
        indices.slice(1).forEach((idx) => ctx.lineTo(positions[idx].x, positions[idx].y));
        ctx.stroke();
      });

      // ── Dot for every landmark ──
      positions.forEach((pt, i) => {
        // Color by region
        let dotColor = "rgba(255,255,255,0.55)";
        if (i < 17)       dotColor = "rgba(45,212,191,0.9)";   // jaw (Teal)
        else if (i < 27)  dotColor = "rgba(99,102,241,0.9)";  // brows (Indigo)
        else if (i < 36)  dotColor = "rgba(139,92,246,0.9)";  // nose (Violet)
        else if (i < 48)  dotColor = "rgba(52,211,153,0.9)";  // eyes (Emerald)
        else               dotColor = "rgba(244,114,182,0.9)";  // mouth (Rose)

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();

        // Glow dot
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = dotColor.replace("0.9)", "0.15)");
        ctx.fill();
      });
    },
    []
  );

  const startCamera = async () => {
    try {
      setCameraState("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraState("active");
    } catch {
      setCameraState("error");
      setErrorMessage("Could not access camera. Please allow camera permissions.");
    }
  };

  const loadModels = useCallback(async () => {
    try {
      setCameraState("loading");
      const MODEL_URL = "/models";
      const toLoad = [
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ];
      if (showLandmarks) {
        toLoad.push(faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL));
      }
      await Promise.all(toLoad);
      await startCamera();
    } catch {
      setCameraState("error");
      setErrorMessage("Failed to load face detection AI models.");
    }
  }, [showLandmarks]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadModels();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      isDetectingRef.current = false;
      if (faceLostTimer.current) clearTimeout(faceLostTimer.current);
    };
  }, [loadModels]);

  const handleVideoPlay = () => {
    if (isDetectingRef.current) return;
    isDetectingRef.current = true;

    const detectLoop = async () => {
      if (!videoRef.current || !isDetectingRef.current) return;

      if (videoRef.current.readyState === 4) {
        analyzeLighting(videoRef.current);

        try {
          const t0 = performance.now();

          let detections: any;
          if (showLandmarks) {
            detections = await faceapi
              .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
              .withFaceLandmarks()
              .withFaceExpressions();
          } else {
            detections = await faceapi
              .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
              .withFaceExpressions();
          }

          const inferenceMs = Math.round(performance.now() - t0);

          if (detections && detections.expressions) {
            if (faceLostTimer.current) {
              clearTimeout(faceLostTimer.current);
              faceLostTimer.current = null;
            }

            emotionHistory.current.push(detections.expressions);
            if (emotionHistory.current.length > 5) {
              emotionHistory.current.shift();
            }

            const averagedScores: Record<string, number> = {};
            const keys = ["happy", "sad", "angry", "neutral", "surprised", "fearful", "disgusted"];

            keys.forEach((key) => {
              const sum = emotionHistory.current.reduce((acc: number, curr: any) => acc + (curr[key] || 0), 0);
              averagedScores[key] = sum / emotionHistory.current.length;
            });

            const sorted = Object.entries(averagedScores).sort((a, b) => b[1] - a[1]);
            const topEmotion = sorted[0][0];
            const confidence = sorted[0][1];

            lastKnownEmotion.current = topEmotion;

            // Draw landmark overlay if enabled
            if (showLandmarks && videoRef.current) {
              drawLandmarks(detections, videoRef.current);
            }

            const box = detections.detection?.box;
            const landmarks = showLandmarks
              ? detections.landmarks?.positions?.map((p: any) => ({ x: p.x, y: p.y }))
              : undefined;

            onEmotion({
              emotion: topEmotion,
              confidence,
              scores: sorted as [string, number][],
              source: "camera",
              landmarks,
              box: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : undefined,
              inferenceMs,
            });
          } else {
            if (showLandmarks && videoRef.current) {
              drawLandmarks(null, videoRef.current);
            }
            if (lastKnownEmotion.current && !faceLostTimer.current) {
              faceLostTimer.current = setTimeout(() => {
                lastKnownEmotion.current = null;
                emotionHistory.current = [];
              }, 2000);
            }
          }
        } catch {
          // Detection frame error tolerance
        }
      }

      setTimeout(detectLoop, 200);
    };

    detectLoop();
  };

  return (
    <div className="camera-container" style={{ position: "relative" }}>
      {cameraState === "loading" && (
        <div className="camera-overlay">
          <CameraIcon className="spinner" size={48} />
          <p>Loading AI Modules...</p>
        </div>
      )}

      {cameraState === "error" && (
        <div className="camera-overlay error">
          <CameraOff size={48} />
          <p>{errorMessage || "Camera access declined or unavailable."}</p>
          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button className="primary-btn" onClick={startCamera}>
              Retry Camera
            </button>
            <button
              className="secondary-btn"
              onClick={() =>
                onEmotion({ emotion: "neutral", confidence: 0.5, scores: [["neutral", 0.5]], source: "manual" })
              }
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                cursor: "pointer",
              }}
            >
              Continue without Camera
            </button>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onPlay={handleVideoPlay}
        className={cameraState === "active" ? "active" : ""}
        style={{ transform: "scaleX(-1)", width: "100%", display: "block" }}
      />

      {/* Landmark overlay canvas — mirrored to match video */}
      {showLandmarks && (
        <canvas
          ref={overlayCanvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            transform: "scaleX(-1)", // mirror to match video
          }}
        />
      )}

      {cameraState === "active" && (
        <div
          className="camera-indicators"
          style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            display: "flex",
            gap: "8px",
            flexDirection: "column",
          }}
        >
          <div
            className="camera-indicator"
            style={{
              background: "rgba(0,0,0,0.7)",
              padding: "4px 10px",
              borderRadius: "999px",
              fontSize: "0.72rem",
              color: "var(--text-2)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              className="live-dot"
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "var(--success)",
                boxShadow: "0 0 8px var(--success)",
                display: "inline-block",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
            {showLandmarks ? "68 Landmarks Active" : "Emotion Active"}
          </div>

          {lightingCondition === "low" && (
            <div
              className="lighting-indicator"
              style={{
                background: "rgba(239, 68, 68, 0.8)",
                padding: "4px 8px",
                borderRadius: "12px",
                fontSize: "0.75rem",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Moon size={14} /> Low Lighting Detected - Soft Smoothing Active
            </div>
          )}

          {lightingCondition === "high" && (
            <div
              className="lighting-indicator"
              style={{
                background: "rgba(245, 158, 11, 0.8)",
                padding: "4px 8px",
                borderRadius: "12px",
                fontSize: "0.75rem",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Sun size={14} /> High Lighting Exposure Detected
            </div>
          )}
        </div>
      )}
    </div>
  );
}
