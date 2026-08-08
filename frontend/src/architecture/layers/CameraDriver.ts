/**
 * MusicMirror Camera Abstraction & Driver
 * Privacy-Preserving Camera Stream Management & Lighting Analysis
 */

import { logger } from './ObservabilityLayer';
import type { EmotionAvailabilityStatus } from '../types/domain';

export interface CameraDriverConfig {
  idealWidth: number;
  idealHeight: number;
  facingMode: 'user' | 'environment';
}

export type LightingCondition = 'good' | 'low' | 'high';

export class CameraDriver {
  private static instance: CameraDriver | null = null;
  private stream: MediaStream | null = null;
  private status: EmotionAvailabilityStatus = 'unavailable';
  private lightingCondition: LightingCondition = 'good';
  private config: CameraDriverConfig = {
    idealWidth: 640,
    idealHeight: 480,
    facingMode: 'user',
  };

  private listeners: Set<(status: EmotionAvailabilityStatus, stream: MediaStream | null) => void> = new Set();

  private constructor() {}

  public static getInstance(): CameraDriver {
    if (!CameraDriver.instance) {
      CameraDriver.instance = new CameraDriver();
    }
    return CameraDriver.instance;
  }

  public getStatus(): EmotionAvailabilityStatus {
    return this.status;
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public getLightingCondition(): LightingCondition {
    return this.lightingCondition;
  }

  public subscribe(listener: (status: EmotionAvailabilityStatus, stream: MediaStream | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.status, this.stream));
  }

  /**
   * Safe stream initialization with error handling for permissions & unavailable hardware
   */
  public async startCamera(videoElement?: HTMLVideoElement): Promise<MediaStream | null> {
    if (this.stream) {
      this.status = 'active';
      this.notifyListeners();
      return this.stream;
    }

    this.status = 'initializing';
    this.notifyListeners();
    logger.startPerfMarker('CameraStartup');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser mediaDevices API not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: this.config.idealWidth },
          height: { ideal: this.config.idealHeight },
          facingMode: this.config.facingMode,
        },
        audio: false,
      });

      this.stream = stream;
      this.status = 'active';

      if (videoElement) {
        videoElement.srcObject = stream;
        await videoElement.play().catch(() => {});
      }

      const startupLatency = logger.endPerfMarker('CameraStartup');
      logger.info('CameraDriver', `Camera stream active (startup latency: ${startupLatency.toFixed(2)} ms)`);
      this.notifyListeners();
      return stream;
    } catch (err: unknown) {
      const errorMsg = String(err);
      if (errorMsg.includes('NotAllowedError') || errorMsg.includes('Permission denied')) {
        this.status = 'permission_denied';
        logger.warn('CameraDriver', 'Camera permission denied by user', { errorMsg });
      } else {
        this.status = 'error';
        logger.error({
          code: 'CAMERA_INIT_FAILED',
          layer: 'Emotion',
          message: 'Failed to initialize camera stream',
          recoverable: true,
          details: { error: errorMsg },
          timestamp: Date.now(),
        });
      }
      this.notifyListeners();
      return null;
    }
  }

  /**
   * Stop camera stream and release all MediaStreamTracks immediately
   */
  public stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        track.stop();
        logger.info('CameraDriver', `Stopped media track [${track.label}]`);
      });
      this.stream = null;
    }
    this.status = 'unavailable';
    this.notifyListeners();
  }

  public dispose(): void {
    this.stopCamera();
    this.listeners.clear();
  }

  /**
   * Analyze canvas frame brightness for low/high lighting exposure feedback
   */
  public analyzeLighting(videoElement: HTMLVideoElement, canvasElement?: HTMLCanvasElement): LightingCondition {
    if (!videoElement || videoElement.readyState < 2) return this.lightingCondition;

    const canvas = canvasElement || document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;

    const ctx = canvas.getContext('2d');
    if (!ctx) return this.lightingCondition;

    ctx.drawImage(videoElement, 0, 0, 160, 120);
    const imageData = ctx.getImageData(0, 0, 160, 120);
    const data = imageData.data;
    let colorSum = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      colorSum += (r + g + b) / 3;
    }

    const brightness = Math.floor(colorSum / (160 * 120));
    if (brightness < 45) {
      this.lightingCondition = 'low';
    } else if (brightness > 210) {
      this.lightingCondition = 'high';
    } else {
      this.lightingCondition = 'good';
    }

    return this.lightingCondition;
  }
}

export const cameraDriver = CameraDriver.getInstance();
