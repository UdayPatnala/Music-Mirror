import { useEffect, useRef } from "react";
import * as faceapi from "face-api.js";

export default function Camera({ onEmotion }) {
  const videoRef = useRef(null);

  useEffect(() => {
    let intervalId;
    let videoEl;

    const start = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceExpressionNet.loadFromUri("/models");

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      videoEl = videoRef.current;
      if (!videoEl) return;

      videoEl.srcObject = stream;

      intervalId = setInterval(async () => {
        const result = await faceapi
          .detectSingleFace(
            videoEl,
            new faceapi.TinyFaceDetectorOptions()
          )
          .withFaceExpressions();

        if (result?.expressions) {
          const emotion = Object.entries(result.expressions).reduce(
            (a, b) => (a[1] > b[1] ? a : b)
          )[0];
          onEmotion(emotion);
        }
      }, 2000);
    };

    start();

    return () => {
      clearInterval(intervalId);
      if (videoEl?.srcObject) {
        videoEl.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [onEmotion]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      width="320"
      style={{ borderRadius: "12px" }}
    />
  );
}
