/**
 * MusicMirror Observability & Error Layer
 * Structured Logging & Performance Instrumentation
 */

import type { ApplicationError, ErrorSeverity } from '../domain/types';

export class AppLogger {
  private static instance: AppLogger;
  private logs: ApplicationError[] = [];
  private performanceMarks: Map<string, number> = new Map();

  public static getInstance(): AppLogger {
    if (!AppLogger.instance) {
      AppLogger.instance = new AppLogger();
    }
    return AppLogger.instance;
  }

  public info(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[MusicMirror INFO] ${message}`, context ?? '');
    }
  }

  public warn(message: string, layer: ApplicationError['layer'], context?: Record<string, unknown>): void {
    const error: ApplicationError = {
      code: 'WARNING',
      severity: 'warning',
      message,
      layer,
      timestamp: Date.now(),
      recoverable: true,
      context,
    };
    this.logs.push(error);
    console.warn(`[MusicMirror WARN][${layer}] ${message}`, context ?? '');
  }

  public error(
    message: string,
    layer: ApplicationError['layer'],
    severity: ErrorSeverity = 'degraded',
    code = 'APP_ERROR',
    context?: Record<string, unknown>
  ): ApplicationError {
    const appError: ApplicationError = {
      code,
      severity,
      message,
      layer,
      timestamp: Date.now(),
      recoverable: severity !== 'fatal',
      context,
    };
    this.logs.push(appError);
    console.error(`[MusicMirror ERROR][${layer}][${severity}] ${message}`, context ?? '');
    return appError;
  }

  public startPerformanceMark(label: string): void {
    this.performanceMarks.set(label, performance.now());
  }

  public endPerformanceMark(label: string): number {
    const startTime = this.performanceMarks.get(label);
    if (!startTime) return 0;
    const duration = performance.now() - startTime;
    this.performanceMarks.delete(label);
    this.info(`[Perf Instrumentation] ${label}: ${duration.toFixed(2)} ms`);
    return duration;
  }

  public getRecentLogs(): ApplicationError[] {
    return [...this.logs].slice(-50);
  }
}

export const logger = AppLogger.getInstance();
