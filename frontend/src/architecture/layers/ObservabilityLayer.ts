import type { ApplicationError, SessionTraceEvent, LatencyBreakdown } from '../types/domain';

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

export class SessionTraceLogger {
  private static instance: SessionTraceLogger | null = null;
  private traceEvents: SessionTraceEvent[] = [];
  private eventTimestamps: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): SessionTraceLogger {
    if (!SessionTraceLogger.instance) {
      SessionTraceLogger.instance = new SessionTraceLogger();
    }
    return SessionTraceLogger.instance;
  }

  public logEvent(
    eventName: SessionTraceEvent['eventName'],
    sessionGeneration: number,
    meta?: Record<string, unknown>
  ): void {
    const now = performance.now();
    this.eventTimestamps.set(eventName, now);

    const trace: SessionTraceEvent = {
      eventName,
      sessionGeneration,
      timestamp: Date.now(),
      latencyMs: Math.round(now),
      meta,
    };

    this.traceEvents.push(trace);
    if (this.traceEvents.length > 100) this.traceEvents.shift();

    LoggerService.getInstance().info('SessionTrace', `[Gen ${sessionGeneration}] Event -> ${eventName}`, meta);
  }

  public getTraceEvents(): SessionTraceEvent[] {
    return [...this.traceEvents];
  }

  public getLatencyBreakdown(): LatencyBreakdown {
    const getDelta = (startEvt: string, endEvt: string): number => {
      const t1 = this.eventTimestamps.get(startEvt);
      const t2 = this.eventTimestamps.get(endEvt);
      return t1 && t2 && t2 >= t1 ? Math.round(t2 - t1) : 0;
    };

    return {
      tCameraReadyToFirstEmotionMs: getDelta('cameraReady', 'emotionStable'),
      tEmotionToStableStateMs: getDelta('emotionStable', 'emotionStable'),
      tStableStateToIntentMs: getDelta('emotionStable', 'intentCreated'),
      tIntentToSearchStartMs: getDelta('intentCreated', 'discoveryStart'),
      tSearchStartToCandidateReadyMs: getDelta('discoveryStart', 'candidateReady'),
      tCandidateReadyToPlaybackPrepareMs: getDelta('candidateReady', 'playbackPrepare'),
      tPlaybackPrepareToFirstAudioMs: getDelta('playbackPrepare', 'firstAudio'),
      tTotalEmotionToFirstAudioMs: getDelta('emotionStable', 'firstAudio'),
    };
  }

  public clearTrace(): void {
    this.traceEvents = [];
    this.eventTimestamps.clear();
  }
}

export const logger = LoggerService.getInstance();
export const sessionTrace = SessionTraceLogger.getInstance();
