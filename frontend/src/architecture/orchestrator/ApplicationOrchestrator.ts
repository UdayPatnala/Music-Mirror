import type { EmotionState, UserPreference, MusicIntent, MusicCandidate } from '../types/domain';
import { emotionInference } from '../layers/EmotionLayer';
import { intentMapper } from '../layers/MusicIntentLayer';
import { discoveryEngine } from '../layers/DiscoveryLayer';
import { YouTubeProviderAdapter } from '../layers/ProviderAdapterLayer/YouTubeProviderAdapter';
import { logger } from '../layers/ObservabilityLayer';

export class ApplicationOrchestrator {
  private static instance: ApplicationOrchestrator | null = null;
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): ApplicationOrchestrator {
    if (!ApplicationOrchestrator.instance) {
      ApplicationOrchestrator.instance = new ApplicationOrchestrator();
    }
    return ApplicationOrchestrator.instance;
  }

  public initialize(): void {
    if (this.isInitialized) return;

    // Register primary provider adapters
    discoveryEngine.registerProvider(new YouTubeProviderAdapter());

    this.isInitialized = true;
    logger.info('ApplicationOrchestrator', 'Orchestration pipeline initialized');
  }

  /**
   * Execute complete end-to-end pipeline: Emotion -> Intent -> Candidate Discovery -> Queue
   */
  public async executePipeline(
    rawEmotion: string,
    confidence: number,
    preference: UserPreference
  ): Promise<{ emotion: EmotionState; intent: MusicIntent; queue: MusicCandidate[] }> {
    logger.startPerfMarker('PipelineExecution');

    this.initialize();

    // 1. Emotion Inference Layer
    const emotionState = emotionInference.processFrameInference(rawEmotion, confidence);

    // 2. Music Intent Layer
    const intent = intentMapper.mapIntent(emotionState, preference);

    // 3. Discovery Layer
    let candidates = await discoveryEngine.discoverCandidates(intent, 15);

    // Graceful Degradation: Fall back to neutral candidate pool if discovery returned empty
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
