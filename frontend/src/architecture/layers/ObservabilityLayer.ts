import type { ApplicationError } from '../types/domain';

export class LoggerService {
  private static instance: LoggerService | null = null;
  private perfMarkers: Map<string, number> = new Map();
  private errorLog: ApplicationError[] = [];

  private constructor() {}

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  public info(layer: string, message: string, meta?: Record<string, unknown>): void {
    console.log(`[${layer}] INFO: ${message}`, meta ? meta : '');
  }

  public warn(layer: string, message: string, meta?: Record<string, unknown>): void {
    console.warn(`[${layer}] WARN: ${message}`, meta ? meta : '');
  }

  public error(err: ApplicationError): void {
    console.error(`[${err.layer}] ERROR (${err.code}): ${err.message}`, err);
    this.errorLog.push(err);
    if (this.errorLog.length > 50) this.errorLog.shift();
  }

  public startPerfMarker(markerName: string): void {
    this.perfMarkers.set(markerName, performance.now());
  }

  public endPerfMarker(markerName: string): number {
    const start = this.perfMarkers.get(markerName);
    if (!start) return 0;
    const duration = performance.now() - start;
    this.perfMarkers.delete(markerName);
    this.info('PERFORMANCE', `Marker [${markerName}] took ${duration.toFixed(2)}ms`);
    return duration;
  }

  public getRecentErrors(): ApplicationError[] {
    return [...this.errorLog];
  }
}

export const logger = LoggerService.getInstance();
