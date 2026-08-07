import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { Camera as CameraIcon, CameraOff, Sun, Moon } from "lucide-react";

export interface DetectionResult {
  emotion: string;
  confidence: number;
  scores: [string, number][];
  source: string;
}

interface CameraProps {
  onEmotion: (result: DetectionResult) => void;
}

export default function Camera({ onEmotion }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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

  const startCamera = async () => {
    try {
      setCameraState("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraState("active");
    } catch (err: any) {
      setCameraState("error");
      setErrorMessage("Could not access camera. Please allow camera permissions.");
    }
  };

  const loadModels = useCallback(async () => {
    try {
      setCameraState("loading");
      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);
      await startCamera();
    } catch (err) {
      setCameraState("error");
      setErrorMessage("Failed to load face detection AI models.");
    }
  }, []);

  useEffect(() => {
    loadModels();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
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
          const detections = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

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
            const keys: string[] = ["happy", "sad", "angry", "neutral", "surprised", "fearful", "disgusted"];

            keys.forEach((key) => {
              const sum = emotionHistory.current.reduce((acc, curr) => acc + (curr[key] || 0), 0);
              averagedScores[key] = sum / emotionHistory.current.length;
            });

            const sorted = Object.entries(averagedScores).sort((a, b) => b[1] - a[1]);
            const topEmotion = sorted[0][0];
            const confidence = sorted[0][1];

            lastKnownEmotion.current = topEmotion;

            onEmotion({
              emotion: topEmotion,
              confidence,
              scores: sorted as [string, number][],
              source: "camera"
            });
          } else {
            if (lastKnownEmotion.current && !faceLostTimer.current) {
              faceLostTimer.current = setTimeout(() => {
                lastKnownEmotion.current = null;
                emotionHistory.current = [];
              }, 2000);
            }
          }
        } catch (e) {
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
          <p>{errorMessage}</p>
          <button className="primary-btn mt-4" onClick={startCamera}>
            Retry
          </button>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onPlay={handleVideoPlay}
        className={cameraState === "active" ? "active" : ""}
      />

      {cameraState === "active" && (
        <div className="camera-indicators" style={{ position: "absolute", bottom: "12px", left: "12px", display: "flex", gap: "8px", flexDirection: "column" }}>
          <div className="camera-indicator" style={{ background: "rgba(0,0,0,0.7)", padding: "4px 10px", borderRadius: "999px", fontSize: "0.72rem", color: "var(--text-2)", display: "flex", alignItems: "center", gap: "6px", backdropFilter: "blur(8px)" }}>
            <span className="live-dot" style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 8px var(--success)", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
            Emotion Active
          </div>

          {lightingCondition === "low" && (
            <div className="lighting-indicator" style={{ background: "rgba(239, 68, 68, 0.8)", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", color: "#fff", display: "flex", alignItems: "center", gap: "4px" }}>
              <Moon size={14} /> Low Lighting Detected - Soft Smoothing Active
            </div>
          )}

          {lightingCondition === "high" && (
            <div className="lighting-indicator" style={{ background: "rgba(245, 158, 11, 0.8)", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", color: "#fff", display: "flex", alignItems: "center", gap: "4px" }}>
              <Sun size={14} /> High Lighting Exposure Detected
            </div>
          )}
        </div>
      )}
    </div>
  );
}
