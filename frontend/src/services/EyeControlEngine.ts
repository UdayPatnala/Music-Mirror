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

  // Smoothing states (Exponential Moving Average)
  private prevX: number = window.innerWidth / 2;
  private prevY: number = window.innerHeight / 2;
  private smoothingAlpha: number = 0.5;

  // Calibration coefficients (default linear map)
  private coeffsX: [number, number, number] = [0, window.innerWidth, 0];
  private coeffsY: [number, number, number] = [0, 0, window.innerHeight];
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
    // alpha range 0.1 (very smooth) to 0.9 (responsive)
    this.smoothingAlpha = Math.max(0.05, Math.min(0.95, alpha));
  }

  public setCalibration(points: CalibrationPoint[]) {
    if (!points || points.length < 5) return;
    
    // Fit linear/quadratic approximation mapping eye (u, v) -> screen (x, y)
    let sumTargetX = 0, sumTargetY = 0;
    let sumEyeX = 0, sumEyeY = 0;
    
    points.forEach(p => {
      sumTargetX += p.targetX;
      sumTargetY += p.targetY;
      sumEyeX += p.eyeX;
      sumEyeY += p.eyeY;
    });

    const avgTargetX = sumTargetX / points.length;
    const avgTargetY = sumTargetY / points.length;
    const avgEyeX = sumEyeX / points.length;
    const avgEyeY = sumEyeY / points.length;

    // Simple robust affine transform fit
    let numX = 0, denX = 0;
    let numY = 0, denY = 0;

    points.forEach(p => {
      numX += (p.eyeX - avgEyeX) * (p.targetX - avgTargetX);
      denX += (p.eyeX - avgEyeX) ** 2;

      numY += (p.eyeY - avgEyeY) * (p.targetY - avgTargetY);
      denY += (p.eyeY - avgEyeY) ** 2;
    });

    const scaleX = denX !== 0 ? numX / denX : window.innerWidth;
    const scaleY = denY !== 0 ? numY / denY : window.innerHeight;

    const offsetX = avgTargetX - scaleX * avgEyeX;
    const offsetY = avgTargetY - scaleY * avgEyeY;

    this.coeffsX = [offsetX, scaleX, 0];
    this.coeffsY = [offsetY, 0, scaleY];
    this.isCalibrated = true;
  }

  public async start(): Promise<boolean> {
    if (this.isRunning) return true;

    try {
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
      this.canvasElement.width = 160;
      this.canvasElement.height = 120;

      this.isRunning = true;
      this.isPaused = false;

      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      this.loop();
      GazeEventBus.publishStatus(true, 1.0, 'Eye Control active');
      return true;
    } catch (err) {
      console.warn('Eye Control camera error:', err);
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

  private loop = () => {
    if (!this.isRunning) return;

    if (!this.isPaused && this.videoElement && this.canvasElement) {
      const ctx = this.canvasElement.getContext('2d', { willReadFrequently: true });
      if (ctx && this.videoElement.readyState === 4) {
        ctx.drawImage(this.videoElement, 0, 0, 160, 120);
        const imgData = ctx.getImageData(0, 0, 160, 120);
        
        // Process pupil/eye center estimation from frame pixels
        const { eyeX, eyeY, confidence } = this.estimateEyeCenter(imgData);

        this.confidence = confidence;

        if (confidence < 0.45) {
          if (!this.isSuspended) {
            this.isSuspended = true;
            GazeEventBus.publishStatus(false, confidence, 'Low confidence — eye tracking suspended');
          }
        } else {
          if (this.isSuspended) {
            this.isSuspended = false;
            GazeEventBus.publishStatus(true, confidence, 'Confidence restored — eye tracking active');
          }

          // Map estimated eye coordinates to screen coordinates
          let rawX = 0;
          let rawY = 0;

          if (this.isCalibrated) {
            rawX = this.coeffsX[0] + this.coeffsX[1] * eyeX + this.coeffsX[2] * eyeY;
            rawY = this.coeffsY[0] + this.coeffsY[1] * eyeX + this.coeffsY[2] * eyeY;
          } else {
            // Default center relative mapping fallback
            rawX = (1.0 - eyeX) * window.innerWidth;
            rawY = eyeY * window.innerHeight;
          }

          // Bound within viewport
          rawX = Math.max(10, Math.min(window.innerWidth - 10, rawX));
          rawY = Math.max(10, Math.min(window.innerHeight - 10, rawY));

          // Exponential Moving Average (EMA) smoothing
          const filteredX = this.prevX * (1 - this.smoothingAlpha) + rawX * this.smoothingAlpha;
          const filteredY = this.prevY * (1 - this.smoothingAlpha) + rawY * this.smoothingAlpha;

          this.prevX = filteredX;
          this.prevY = filteredY;

          GazeEventBus.publishGaze(filteredX, filteredY, confidence);
        }
      }
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Fast pupil centroid estimation from frame luminance distribution
   */
  private estimateEyeCenter(imgData: ImageData): { eyeX: number; eyeY: number; confidence: number } {
    const data = imgData.data;
    const w = imgData.width;
    const h = imgData.height;

    let minDark = 255;
    let darkSumX = 0;
    let darkSumY = 0;
    let darkCount = 0;
    let totalBrightness = 0;

    // Focus analysis on upper central quadrant (where eyes are typically located in webcams)
    const startY = Math.floor(h * 0.15);
    const endY = Math.floor(h * 0.55);
    const startX = Math.floor(w * 0.15);
    const endX = Math.floor(w * 0.85);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const i = (y * w + x) * 4;
        const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        totalBrightness += lum;
        if (lum < minDark) minDark = lum;
      }
    }

    const darkThreshold = minDark + 22;

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const i = (y * w + x) * 4;
        const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        if (lum <= darkThreshold) {
          darkSumX += x;
          darkSumY += y;
          darkCount++;
        }
      }
    }

    if (darkCount === 0) {
      return { eyeX: 0.5, eyeY: 0.5, confidence: 0.2 };
    }

    const normEyeX = (darkSumX / darkCount) / w;
    const normEyeY = (darkSumY / darkCount) / h;

    // Confidence metric based on contrast ratio & eye region dark pixel clustering
    const avgLum = totalBrightness / ((endY - startY) * (endX - startX));
    const contrastRatio = (avgLum - minDark) / 255;
    const confidence = Math.min(1.0, Math.max(0.1, contrastRatio * 2.8));

    return { eyeX: normEyeX, eyeY: normEyeY, confidence };
  }
}
