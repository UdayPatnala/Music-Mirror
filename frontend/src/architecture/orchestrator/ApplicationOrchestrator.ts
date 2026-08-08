/**
 * Application Orchestrator (STAGE 06 Rebuild)
 * Connects the complete continuous real-time emotion-to-music discovery and playback loop
 */

import type { EmotionState, UserPreference, MusicIntent, MusicCandidate, PlaybackState, LatencyBreakdown } from '../types/domain';
import { emotionInference } from '../layers/EmotionLayer';
import { intentMapper } from '../layers/MusicIntentLayer';
import { discoveryEngine } from '../layers/DiscoveryLayer';
import { sessionOrchestrator } from './SessionOrchestrator';
import { YouTubeProviderAdapter } from '../layers/ProviderAdapterLayer/YouTubeProviderAdapter';
import { JamendoProviderAdapter } from '../layers/ProviderAdapterLayer/JamendoProviderAdapter';
import { RoyaltyFreeFallbackAdapter } from '../layers/ProviderAdapterLayer/RoyaltyFreeFallbackAdapter';
import { logger } from '../layers/ObservabilityLayer';

export class ApplicationOrchestrator {
  private static instance: ApplicationOrchestrator | null = null;
  private isInitialized: boolean = false;
  private loopInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {}

  public static getInstance(): ApplicationOrchestrator {
    if (!ApplicationOrchestrator.instance) {
      ApplicationOrchestrator.instance = new ApplicationOrchestrator();
    }
    return ApplicationOrchestrator.instance;
  }

  public initialize(): void {
    if (this.isInitialized) return;

    // Register primary & fallback provider adapters
    discoveryEngine.registerProvider(new YouTubeProviderAdapter());
    discoveryEngine.registerProvider(new JamendoProviderAdapter());
    discoveryEngine.registerProvider(new RoyaltyFreeFallbackAdapter());

    this.isInitialized = true;
    logger.info('ApplicationOrchestrator', 'Orchestration pipeline initialized with multi-provider strategy');
  }

  /**
   * Continuous Real-Time Loop Entry Point: Camera Frame -> Emotion -> Intent -> Discovery -> Playback
   */
  public async processFrameObservation(
    rawEmotion: string,
    confidence: number,
    preference?: Partial<UserPreference>
  ): Promise<PlaybackState> {
    this.initialize();
    return await sessionOrchestrator.handleEmotionObservation(rawEmotion, confidence, preference);
  }

  public startRealTimeLoop(
    getLatestFrameInference: () => { rawEmotion: string; confidence: number },
    preference?: Partial<UserPreference>,
    intervalMs: number = 2000
  ): void {
    this.stopRealTimeLoop();
    logger.info('ApplicationOrchestrator', `Starting real-time orchestration loop (interval=${intervalMs}ms)`);

    this.loopInterval = setInterval(async () => {
      try {
        const { rawEmotion, confidence } = getLatestFrameInference();
        await this.processFrameObservation(rawEmotion, confidence, preference);
      } catch (err) {
        logger.warn('ApplicationOrchestrator', `Error in real-time loop iteration: ${String(err)}`);
      }
    }, intervalMs);
  }

  public stopRealTimeLoop(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
      logger.info('ApplicationOrchestrator', 'Stopped real-time orchestration loop');
    }
  }

  public getLatencyBreakdown(): LatencyBreakdown {
    return sessionOrchestrator.getLatencyBreakdown();
  }

  /**
   * Execute complete end-to-end pipeline (Legacy / One-Shot API)
   */
  public async executePipeline(
    rawEmotion: string,
    confidence: number,
    preference: UserPreference
  ): Promise<{ emotion: EmotionState; intent: MusicIntent; queue: MusicCandidate[] }> {
    logger.startPerfMarker('PipelineExecution');

    this.initialize();

    const emotionState = emotionInference.processFrameInference(rawEmotion, confidence);
    const intent = intentMapper.mapIntent(emotionState, preference);
    let candidates = await discoveryEngine.discoverCandidates(intent, 15);

    if (!candidates || candidates.length === 0) {
      logger.warn('ApplicationOrchestrator', 'Discovery returned empty queue. Applying fallback candidate queue');
      const fallbackIntent = intentMapper.mapIntent(emotionInference.getFallbackState(), preference);
      candidates = await discoveryEngine.discoverCandidates(fallbackIntent, 10);
    }

    logger.endPerfMarker('PipelineExecution');

    return {
      emotion: emotionState,
      intent,
      queue: candidates,
    };
  }
}

export const orchestrator = ApplicationOrchestrator.getInstance();
