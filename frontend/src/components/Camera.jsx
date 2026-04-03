import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

function getCameraErrorMessage(error) {
  if (error?.message === "UNSUPPORTED_CAMERA") {
    return "This browser does not support webcam access.";
  }

  if (error?.name === "NotAllowedError") {
    return "Camera access was denied. Allow permission and refresh the page.";
  }

  if (error?.name === "NotFoundError") {
    return "No camera was found on this device.";
  }

  return "The camera could not be started. Check browser permissions and model files.";
}

export default function Camera({ onEmotion }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isDetectingRef = useRef(false);
  const [cameraState, setCameraState] = useState("loading");
  const [cameraMessage, setCameraMessage] = useState(
    "Loading face detection models..."
  );

  useEffect(() => {
    let intervalId;
    let isCancelled = false;

    const start = async () => {
      try {
        setCameraState("loading");
        setCameraMessage("Loading face detection models...");

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceExpressionNet.loadFromUri("/models"),
        ]);

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("UNSUPPORTED_CAMERA");
        }

        setCameraMessage("Waiting for camera access...");

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const videoEl = videoRef.current;
        if (!videoEl) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        videoEl.srcObject = stream;
        await videoEl.play();

        if (isCancelled) return;

        setCameraState("ready");
        setCameraMessage("Camera is live.");

        intervalId = window.setInterval(async () => {
          if (isDetectingRef.current || videoEl.readyState < 2) {
            return;
          }

          isDetectingRef.current = true;

          try {
            const result = await faceapi
              .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
              .withFaceExpressions();

            if (result?.expressions) {
              const emotion = Object.entries(result.expressions).reduce(
                (highest, entry) => (entry[1] > highest[1] ? entry : highest)
              )[0];

              onEmotion(emotion);
            }
          } catch (error) {
            console.error("Emotion detection error:", error);
          } finally {
            isDetectingRef.current = false;
          }
        }, 2000);
      } catch (error) {
        if (isCancelled) return;

        console.error("Camera startup error:", error);
        setCameraState("error");
        setCameraMessage(getCameraErrorMessage(error));
      }
    };

    start();

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      isDetectingRef.current = false;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [onEmotion]);

  return (
    <section className="camera-section" aria-live="polite">
      <div className="camera-wrapper">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="camera-video"
        />

        {cameraState === "loading" && (
          <div className="camera-loader">{cameraMessage}</div>
        )}

        {cameraState === "error" && (
          <div className="camera-loader camera-error">{cameraMessage}</div>
        )}

        {cameraState === "ready" && <div className="scan-frame" />}
      </div>

      <p className={`camera-status ${cameraState === "error" ? "error" : ""}`}>
        {cameraState === "ready"
          ? "Keep your face centered and hold still for a moment."
          : cameraMessage}
      </p>
    </section>
  );
}
