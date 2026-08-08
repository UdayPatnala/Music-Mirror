import * as faceapi from 'face-api.js';
import { GazeEventBus } from './GazeEventBus';

export interface CalibrationPoint {
  targetX: number;
  targetY: number;
  eyeX: number;
  eyeY: number;
}

export class EyeControlEngine {
  private static instance: EyeControlEngine | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private stream: MediaStream | null = null;
  private isRunning: boolean = false;
  private animFrameId: number | null = null;
  private modelsLoaded: boolean = false;

  // Smoothing states (Adaptive Exponential Moving Average + Holt Linear)
  private prevX: number = window.innerWidth / 2;
  private prevY: number = window.innerHeight / 2;
  private smoothingAlpha: number = 0.35;

  // Calibration coefficients (default mapping)
  private coeffsX: number[] = [0, window.innerWidth, 0];
  private coeffsY: number[] = [0, 0, window.innerHeight];
  private isCalibrated: boolean = false;

  private confidence: number = 1.0;
  private isSuspended: boolean = false;
  private isPaused: boolean = false;

  private constructor() {
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  public static getInstance(): EyeControlEngine {
    if (!EyeControlEngine.instance) {
      EyeControlEngine.instance = new EyeControlEngine();
    }
    return EyeControlEngine.instance;
  }

  public setSmoothing(alpha: number) {
    this.smoothingAlpha = Math.max(0.05, Math.min(0.95, alpha));
  }

  public setCalibration(points: CalibrationPoint[]) {
    if (!points || points.length < 5) return;

    let sumTX = 0, sumTY = 0, sumEX = 0, sumEY = 0;
    points.forEach((p) => {
      sumTX += p.targetX;
      sumTY += p.targetY;
      sumEX += p.eyeX;
      sumEY += p.eyeY;
    });

    const avgTX = sumTX / points.length;
    const avgTY = sumTY / points.length;
    const avgEX = sumEX / points.length;
    const avgEY = sumEY / points.length;

    let numX = 0, denX = 0, numY = 0, denY = 0;
    points.forEach((p) => {
      numX += (p.eyeX - avgEX) * (p.targetX - avgTX);
      denX += (p.eyeX - avgEX) ** 2;
      numY += (p.eyeY - avgEY) * (p.targetY - avgTY);
      denY += (p.eyeY - avgEY) ** 2;
    });

    const scaleX = denX !== 0 ? numX / denX : window.innerWidth;
    const scaleY = denY !== 0 ? numY / denY : window.innerHeight;
    const offsetX = avgTX - scaleX * avgEX;
    const offsetY = avgTY - scaleY * avgEY;

    this.coeffsX = [offsetX, scaleX, 0];
    this.coeffsY = [offsetY, 0, scaleY];
    this.isCalibrated = true;
  }

  private async loadFaceModels() {
    if (this.modelsLoaded) return;
    try {
      const MODEL_URL = '/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      this.modelsLoaded = true;
    } catch {
      // Fall back gracefully if local models missing
      this.modelsLoaded = false;
    }
  }

  public async start(): Promise<boolean> {
    if (this.isRunning) return true;

    try {
      await this.loadFaceModels();

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
        audio: false,
      });

      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.stream;
      this.videoElement.playsInline = true;
      this.videoElement.muted = true;
      await this.videoElement.play();

      this.canvasElement = document.createElement('canvas');
      this.canvasElement.width = 320;
      this.canvasElement.height = 240;

      this.isRunning = true;
      this.isPaused = false;

      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      this.loop();
      GazeEventBus.publishStatus(true, 1.0, 'Eye Control active');
      return true;
    } catch (err) {
      console.warn('Eye Control camera start error:', err);
      GazeEventBus.publishStatus(false, 0.0, 'Camera unavailable');
      this.stop();
      return false;
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    GazeEventBus.publishStatus(false, 0.0, 'Eye Control disabled');
  }

  public pause() {
    this.isPaused = true;
    GazeEventBus.publishStatus(false, this.confidence, 'Tracking paused');
  }

  public resume() {
    this.isPaused = false;
    GazeEventBus.publishStatus(true, this.confidence, 'Tracking resumed');
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      this.pause();
    } else if (this.isRunning) {
      this.resume();
    }
  }

  private loop = async () => {
    if (!this.isRunning) return;

    if (!this.isPaused && this.videoElement && this.canvasElement && this.videoElement.readyState === 4) {
      const ctx = this.canvasElement.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(this.videoElement, 0, 0, 320, 240);
        const imgData = ctx.getImageData(0, 0, 320, 240);

        let eyeX = 0.5;
        let eyeY = 0.5;
        let confidence = 0.8;

        if (this.modelsLoaded) {
          try {
            const detection = await faceapi.detectSingleFace(
              this.videoElement,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
            );

            if (detection) {
              const box = detection.box;
              confidence = Math.min(1.0, detection.score * 1.2);

              // Sub-segment eye region inside detected face box
              const eyeRegionX = Math.max(0, Math.floor(box.x + box.width * 0.15));
              const eyeRegionY = Math.max(0, Math.floor(box.y + box.height * 0.18));
              const eyeRegionW = Math.min(320 - eyeRegionX, Math.floor(box.width * 0.70));
              const eyeRegionH = Math.min(240 - eyeRegionY, Math.floor(box.height * 0.28));

              if (eyeRegionW > 10 && eyeRegionH > 10) {
                const eyeData = ctx.getImageData(eyeRegionX, eyeRegionY, eyeRegionW, eyeRegionH);
                const pupilOffset = this.calculatePupilCentroid(eyeData);
                eyeX = (eyeRegionX + pupilOffset.x) / 320;
                eyeY = (eyeRegionY + pupilOffset.y) / 240;
              } else {
                eyeX = (box.x + box.width / 2) / 320;
                eyeY = (box.y + box.height / 3) / 240;
              }
            } else {
              confidence = 0.2;
            }
          } catch {
            const fallback = this.estimateEyeCenterLuminance(imgData);
            eyeX = fallback.eyeX;
            eyeY = fallback.eyeY;
            confidence = fallback.confidence;
          }
        } else {
          const fallback = this.estimateEyeCenterLuminance(imgData);
          eyeX = fallback.eyeX;
          eyeY = fallback.eyeY;
          confidence = fallback.confidence;
        }

        this.confidence = confidence;

        if (confidence < 0.35) {
          if (!this.isSuspended) {
            this.isSuspended = true;
            GazeEventBus.publishStatus(false, confidence, 'Face lost / low light — tracking suspended');
          }
        } else {
          if (this.isSuspended) {
            this.isSuspended = false;
            GazeEventBus.publishStatus(true, confidence, 'Tracking active');
          }

          let rawX = 0;
          let rawY = 0;

          if (this.isCalibrated) {
            rawX = this.coeffsX[0] + this.coeffsX[1] * eyeX + this.coeffsX[2] * eyeY;
            rawY = this.coeffsY[0] + this.coeffsY[1] * eyeX + this.coeffsY[2] * eyeY;
          } else {
            // Natural mirror mapping
            rawX = (1.0 - eyeX) * window.innerWidth;
            rawY = eyeY * window.innerHeight;
          }

          rawX = Math.max(20, Math.min(window.innerWidth - 20, rawX));
          rawY = Math.max(20, Math.min(window.innerHeight - 20, rawY));

          // Adaptive Double Exponential Moving Average (Saccade adaptive)
          const dist = Math.sqrt((rawX - this.prevX) ** 2 + (rawY - this.prevY) ** 2);
          const dynamicAlpha = dist > 120 ? Math.min(0.85, this.smoothingAlpha * 2.2) : this.smoothingAlpha;

          const filteredX = this.prevX * (1 - dynamicAlpha) + rawX * dynamicAlpha;
          const filteredY = this.prevY * (1 - dynamicAlpha) + rawY * dynamicAlpha;

          this.prevX = filteredX;
          this.prevY = filteredY;

          GazeEventBus.publishGaze(filteredX, filteredY, confidence);
        }
      }
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Fast pupil centroid estimation inside eye bounding box using intensity gradients
   */
  private calculatePupilCentroid(imgData: ImageData): { x: number; y: number } {
    const data = imgData.data;
    const w = imgData.width;
    const h = imgData.height;

    let minDark = 255;
    for (let i = 0; i < data.length; i += 4) {
      const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      if (lum < minDark) minDark = lum;
    }

    const darkThreshold = minDark + 18;
    let sumX = 0, sumY = 0, count = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        if (lum <= darkThreshold) {
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }

    if (count === 0) return { x: w / 2, y: h / 2 };
    return { x: sumX / count, y: sumY / count };
  }

  private estimateEyeCenterLuminance(imgData: ImageData): { eyeX: number; eyeY: number; confidence: number } {
    const data = imgData.data;
    const w = imgData.width;
    const h = imgData.height;

    let minDark = 255;
    let sumX = 0, sumY = 0, count = 0;

    const startY = Math.floor(h * 0.2);
    const endY = Math.floor(h * 0.5);
    const startX = Math.floor(w * 0.2);
    const endX = Math.floor(w * 0.8);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const i = (y * w + x) * 4;
        const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        if (lum < minDark) minDark = lum;
      }
    }

    const darkThreshold = minDark + 20;

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const i = (y * w + x) * 4;
        const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        if (lum <= darkThreshold) {
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }

    if (count === 0) return { eyeX: 0.5, eyeY: 0.5, confidence: 0.3 };
    return {
      eyeX: (sumX / count) / w,
      eyeY: (sumY / count) / h,
      confidence: 0.7,
    };
  }
}
