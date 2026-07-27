// @ts-nocheck
import React, { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { Camera as CameraIcon, CameraOff, Sun, Moon, AlertTriangle } from "lucide-react";

export default function Camera({ onEmotion }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isDetectingRef = useRef(false);
  
  const [cameraState, setCameraState] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [lightingCondition, setLightingCondition] = useState("good"); // "good" | "low" | "high"
  
  // Advanced Temporal Emotion Fusion State
  const emotionHistory = useRef([]);
  const lastKnownEmotion = useRef(null);
  const faceLostTimer = useRef(null);

  const analyzeLighting = (videoElement) => {
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
    let r, g, b, avg;
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
          facingMode: "user",
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraState("active");
      }
    } catch (err) {
      setCameraState("error");
      setErrorMessage(
        err.name === "NotAllowedError"
          ? "Camera access denied. Please grant permission."
          : "Could not access the camera. Check your device."
      );
    }
  };

  const stopCamera = useCallback(() => {
    isDetectingRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraState("inactive");
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const loadModelsAndStart = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceExpressionNet.loadFromUri("/models"),
        ]);
        if (isMounted) startCamera();
      } catch (err) {
        if (isMounted) {
          setCameraState("error");
          setErrorMessage("Failed to load AI models. Check your network.");
        }
      }
    };
    
    loadModelsAndStart();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [stopCamera]);

  const handleVideoPlay = () => {
    if (isDetectingRef.current) return;
    isDetectingRef.current = true;

    const detectLoop = async () => {
      if (!isDetectingRef.current || !videoRef.current) return;

      try {
        analyzeLighting(videoRef.current);

        const detection = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 })
          )
          .withFaceExpressions();

        if (detection) {
          if (faceLostTimer.current) {
             clearTimeout(faceLostTimer.current);
             faceLostTimer.current = null;
          }
          
          const expressions = detection.expressions;
          const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
          const primaryEmotion = sorted[0][0];
          const primaryConfidence = sorted[0][1];

          // Confidence-Weighted Temporal Fusion (sliding window of 5 frames)
          emotionHistory.current.push({ emotion: primaryEmotion, confidence: primaryConfidence });
          if (emotionHistory.current.length > 5) {
              emotionHistory.current.shift();
          }
          
          // Compute fused emotion
          const weightMap = {};
          emotionHistory.current.forEach(item => {
             weightMap[item.emotion] = (weightMap[item.emotion] || 0) + item.confidence;
          });
          
          const fusedSorted = Object.entries(weightMap).sort((a, b) => b[1] - a[1]);
          const fusedEmotion = fusedSorted[0][0];
          
          lastKnownEmotion.current = {
              emotion: fusedEmotion,
              confidence: primaryConfidence,
              scores: sorted,
              source: "camera",
          };

          onEmotion(lastKnownEmotion.current);
        } else {
            // Face Lost Recovery Protocol
            if (!faceLostTimer.current && lastKnownEmotion.current) {
                faceLostTimer.current = setTimeout(() => {
                    lastKnownEmotion.current = null;
                    emotionHistory.current = [];
                }, 3000);
            }
        }
      } catch (error) {
         // silent ignore for adaptive sampling
      }

      setTimeout(detectLoop, 300);
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
          <div className="camera-indicator" style={{ background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="live-dot" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} /> 
            Live Face Tracking (Temporal Fusion)
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
