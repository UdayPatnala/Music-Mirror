import type { GazeEvent } from '../types';

type GazeListener = (event: GazeEvent) => void;
type StatusListener = (status: { active: boolean; confidence: number; message?: string }) => void;

class GazeEventBusService {
  private gazeListeners: Set<GazeListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();

  public subscribeGaze(listener: GazeListener): () => void {
    this.gazeListeners.add(listener);
    return () => {
      this.gazeListeners.delete(listener);
    };
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public publishGaze(x: number, y: number, confidence: number): void {
    const event: GazeEvent = {
      x,
      y,
      confidence,
      timestamp: performance.now(),
    };
    this.gazeListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Gaze listener error:', err);
      }
    });
  }

  public publishStatus(active: boolean, confidence: number, message?: string): void {
    this.statusListeners.forEach((listener) => {
      try {
        listener({ active, confidence, message });
      } catch (err) {
        console.error('Status listener error:', err);
      }
    });
  }
}

export const GazeEventBus = new GazeEventBusService();
