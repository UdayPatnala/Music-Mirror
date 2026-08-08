/**
 * MusicMirror Session Orchestrator & Playback Engine (STAGE 06 Implementation)
 * Connects EmotionEngine, MusicIntentEngine, DiscoveryEngine, and PlaybackEngine
 * into a single continuous real-time orchestration loop with low-latency fast-paths,
 * predictive prefetching, explicit transition decisions, and session trace telemetry.
 */

import type {
  UserPreference,
  MusicIntent,
  MusicCandidate,
  PlaybackState,
  PlaybackEvent,
  SessionState,
  TransitionDecisionType,
  FeedbackEvent,
  LatencyBreakdown,
} from '../types/domain';
import type { PlaybackProvider } from '../layers/PlaybackLayer/PlaybackProvider';
import { YouTubePlaybackAdapter } from '../layers/PlaybackLayer/YouTubePlaybackAdapter';
import { HTML5AudioPlaybackAdapter } from '../layers/PlaybackLayer/HTML5AudioPlaybackAdapter';
import { emotionInference } from '../layers/EmotionLayer';
import { intentMapper } from '../layers/MusicIntentLayer';
import { discoveryEngine } from '../layers/DiscoveryLayer';
import { orchestrator } from './ApplicationOrchestrator';
import { logger, sessionTrace } from '../layers/ObservabilityLayer';
import { personalizationEngine } from '../layers/PersonalizationLayer/PersonalizationEngine';

export class SessionOrchestrator {
  private static instance: SessionOrchestrator | null = null;

  private state: SessionState = 'IDLE';
  private sessionToken: number = 0;
  private currentIntent: MusicIntent | null = null;
  private currentTrack: MusicCandidate | null = null;
  private nextTrackCandidate: MusicCandidate | null = null;
  private queue: MusicCandidate[] = [];
  private history: string[] = []; // Max 20 track IDs
  private maxHistoryLength: number = 20;

  private activeProvider: PlaybackProvider | null = null;
  private providers: Map<string, PlaybackProvider> = new Map();

  private volumeLevel: number = 70;
  private muted: boolean = false;
  private autoplayBlocked: boolean = false;
  private activeBroadeningLevel: number = 0;
  private activeError: string | null = null;

  private retryCount: number = 0;
  private maxRetriesPerTrack: number = 1;

  private listeners: Set<(state: PlaybackState) => void> = new Set();
  private feedbackListeners: Set<(event: FeedbackEvent) => void> = new Set();
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): SessionOrchestrator {
    if (!SessionOrchestrator.instance) {
      SessionOrchestrator.instance = new SessionOrchestrator();
    }
    return SessionOrchestrator.instance;
  }

  public resetState(): void {
    this.currentTrack = null;
    this.currentIntent = null;
    this.nextTrackCandidate = null;
    this.queue = [];
    this.history = [];
    this.state = 'IDLE';
    this.sessionToken = 0;
    this.autoplayBlocked = false;
    this.activeBroadeningLevel = 0;
    this.activeError = null;
    if (this.activeProvider) {
      this.activeProvider.stop();
    }
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    logger.startPerfMarker('SessionOrchestratorInit');
    sessionTrace.logEvent('sessionStart', this.sessionToken);

    // Ensure discovery engine providers are registered
    orchestrator.initialize();

    // Register playback providers
    const ytAdapter = new YouTubePlaybackAdapter();
    const html5Adapter = new HTML5AudioPlaybackAdapter();

    await ytAdapter.initialize();
    await html5Adapter.initialize();

    this.providers.set('youtube', ytAdapter);
    this.providers.set('jamendo', html5Adapter);
    this.providers.set('royalty_free_fallback', html5Adapter);
    this.providers.set('html5_audio', html5Adapter);

    this.activeProvider = ytAdapter;
    this.subscribeToProviderEvents(ytAdapter);
    this.subscribeToProviderEvents(html5Adapter);

    this.isInitialized = true;
    this.setState('IDLE');
    logger.endPerfMarker('SessionOrchestratorInit');
    logger.info('SessionOrchestrator', 'Session Orchestrator initialized successfully');
  }

  public getState(): SessionState {
    return this.state;
  }

  public getPlaybackState(): PlaybackState {
    const providerState = this.activeProvider?.getPlaybackState();
    return {
      currentCandidate: this.currentTrack,
      nextCandidate: this.nextTrackCandidate,
      isPlaying: this.state === 'PLAYING',
      isPaused: this.state === 'PAUSED',
      isBuffering: this.state === 'BUFFERING',
      progressPercent: providerState?.progressPercent || 0,
      currentTimeSeconds: providerState?.currentTimeSeconds || 0,
      durationSeconds: providerState?.durationSeconds || (this.currentTrack?.duration || 180),
      volume: this.volumeLevel,
      isMuted: this.muted,
      providerId: this.activeProvider?.getProviderId() || 'youtube',
      activeMood: this.currentIntent?.emotion.normalizedEmotion || 'neutral',
      queue: this.queue,
      sessionState: this.state,
      sessionToken: this.sessionToken,
      autoplayBlocked: this.autoplayBlocked,
      broadeningLevel: this.activeBroadeningLevel,
      history: this.history,
      error: this.activeError,
      attributionText: this.currentTrack?.attributionText || null,
    };
  }

  public getLatencyBreakdown(): LatencyBreakdown {
    return sessionTrace.getLatencyBreakdown();
  }

  /**
   * Main Entry Point: Emotion / Preference Input -> Real-Time Orchestration Loop
   */
  public async handleEmotionObservation(
    rawEmotion: string,
    confidence: number,
    preference?: Partial<UserPreference>
  ): Promise<PlaybackState> {
    await this.initialize();
    logger.startPerfMarker('SessionPipelineExecution');

    const sanitizedPref: UserPreference = {
      name: preference?.name || 'Guest User',
      email: preference?.email || 'guest@musicmirror.ai',
      preferredGenres: preference?.preferredGenres || ['Telugu Pop', 'Synthpop'],
      preferredLanguages: preference?.preferredLanguages || ['Telugu', 'English'],
      musicGoal: preference?.musicGoal || 'match',
    };

    sessionTrace.logEvent('cameraReady', this.sessionToken);

    // 1. Cold-Start Fast Path: Low confidence (< 0.50) generates immediate broad neutral intent
    let emotionState = emotionInference.processFrameInference(rawEmotion, confidence);
    if (confidence < 0.50 && !this.currentTrack) {
      logger.info('SessionOrchestrator', 'Cold Start Fast Path: Low initial confidence. Generating immediate neutral intent.');
      emotionState = emotionInference.getFallbackState();
    }

    sessionTrace.logEvent('emotionStable', this.sessionToken, { normalizedEmotion: emotionState.normalizedEmotion, confidence });

    // 2. Music Intent Layer & Secondary Prefetch Intent Set Generation
    const prefetchSet = intentMapper.generatePrefetchIntentSet(emotionState, sanitizedPref);
    const newIntent = prefetchSet.primaryIntent;
    sessionTrace.logEvent('intentCreated', this.sessionToken, { intentId: newIntent.intentId, valenceTarget: newIntent.valenceTarget });

    // 3. Evaluate Transition Policy Model
    const transitionDecision = this.evaluateTransitionPolicy(this.currentIntent, newIntent);
    logger.info('SessionOrchestrator', `Transition Decision Policy -> [${transitionDecision}]`);

    if (transitionDecision === 'KEEP_CURRENT' || transitionDecision === 'NO_CHANGE') {
      logger.info('SessionOrchestrator', 'Keeping current track playing. Executing background prefetch.');
      // Execute background prefetch for secondary candidate intents
      discoveryEngine.prefetch(prefetchSet.secondaryPrefetchIntents).catch(() => {});
      logger.endPerfMarker('SessionPipelineExecution');
      return this.getPlaybackState();
    }

    this.currentIntent = newIntent;

    // Trigger secondary candidate prefetching concurrently
    if (prefetchSet.secondaryPrefetchIntents.length > 0) {
      sessionTrace.logEvent('prefetchStart', this.sessionToken, { secondaryCount: prefetchSet.secondaryPrefetchIntents.length });
      discoveryEngine.prefetch(prefetchSet.secondaryPrefetchIntents).catch(() => {});
    }

    return await this.orchestrateSessionForIntent(newIntent, sanitizedPref, transitionDecision);
  }

  /**
   * Orchestrate session for a confirmed MusicIntent with 5-level candidate broadening & cache fast path
   */
  public async orchestrateSessionForIntent(
    intent: MusicIntent,
    preference: UserPreference,
    transitionPolicy: TransitionDecisionType = 'SWITCH_WHEN_READY'
  ): Promise<PlaybackState> {
    this.sessionToken++;
    const token = this.sessionToken;

    sessionTrace.logEvent('discoveryStart', token, { intentId: intent.intentId });
    this.setState('SEARCHING');

    let candidates: MusicCandidate[] = [];
    let broadeningLevel = 0;

    // 5-Level Broadening Policy Loop with Cache Fast-Path
    for (broadeningLevel = 0; broadeningLevel <= 4; broadeningLevel++) {
      if (token !== this.sessionToken) return this.getPlaybackState();

      candidates = await this.discoverCandidatesForLevel(intent, preference, broadeningLevel);
      const eligible = candidates.filter((c) => this.isCandidatePlayable(c) && !this.isInRecentHistory(c.id));

      if (eligible.length > 0) {
        candidates = eligible;
        this.activeBroadeningLevel = broadeningLevel;
        logger.info('SessionOrchestrator', `Found ${eligible.length} candidates at broadening level ${broadeningLevel}`);
        break;
      }
    }

    if (token !== this.sessionToken) return this.getPlaybackState();

    if (!candidates || candidates.length === 0) {
      logger.warn('SessionOrchestrator', 'All 5 candidate broadening levels returned no playable candidates');
      sessionTrace.logEvent('fallback', token, { reason: 'ALL_BROADENING_LEVELS_EXHAUSTED' });
      this.setState('NO_PLAYABLE_MUSIC');
      return this.getPlaybackState();
    }

    sessionTrace.logEvent('candidateReady', token, { count: candidates.length, primaryId: candidates[0].id });

    // Candidate Selection & Queueing
    const selected = candidates[0];
    this.queue = candidates.slice(1);
    this.nextTrackCandidate = this.queue.length > 0 ? this.queue[0] : null;

    // Apply Transition Decision
    if (transitionPolicy === 'PREPARE_NEXT' && this.currentTrack && this.state === 'PLAYING') {
      logger.info('SessionOrchestrator', `Preparing next track [${selected.title}] without interrupting current playing track.`);
      sessionTrace.logEvent('playbackPrepare', token, { preparedId: selected.id });
      this.activeProvider?.prepare(selected).catch(() => {});
      return this.getPlaybackState();
    }

    // Start Playback
    await this.startPlaybackForCandidate(selected, token);
    logger.endPerfMarker('SessionPipelineExecution');

    return this.getPlaybackState();
  }

  /**
   * Transition Decision Model Evaluator
   */
  public evaluateTransitionPolicy(oldIntent: MusicIntent | null, newIntent: MusicIntent): TransitionDecisionType {
    if (!this.currentTrack || !oldIntent) return 'SWITCH_NOW_ONLY_IF_NECESSARY';

    if (oldIntent.emotion.normalizedEmotion === newIntent.emotion.normalizedEmotion) {
      const valenceDelta = Math.abs(oldIntent.valenceTarget - newIntent.valenceTarget);
      const energyDelta = Math.abs(oldIntent.energyTarget - newIntent.energyTarget);

      if (valenceDelta <= 0.15 && energyDelta <= 0.15) {
        return 'NO_CHANGE';
      }
      if (valenceDelta <= 0.30 && energyDelta <= 0.30) {
        return 'KEEP_CURRENT';
      }
      return 'PREPARE_NEXT';
    }

    // Emotion shift detected
    const strongIncompatiblePairs: Array<[string, string]> = [
      ['happy', 'sad'],
      ['sad', 'happy'],
      ['happy', 'angry'],
      ['neutral', 'angry'],
    ];

    const isStronglyIncompatible = strongIncompatiblePairs.some(
      ([a, b]) => oldIntent.emotion.normalizedEmotion === a && newIntent.emotion.normalizedEmotion === b
    );

    if (isStronglyIncompatible && newIntent.confidence >= 0.75) {
      return 'SWITCH_NOW_ONLY_IF_NECESSARY';
    }

    return 'PREPARE_NEXT';
  }

  /**
   * One-Step User Gesture Autoplay Enablement
   */
  public async enablePlayback(): Promise<void> {
    logger.info('SessionOrchestrator', 'User gesture enabled playback');
    this.autoplayBlocked = false;

    if (this.currentTrack && this.activeProvider) {
      try {
        await this.activeProvider.play();
        this.setState('PLAYING');
        sessionTrace.logEvent('firstAudio', this.sessionToken, { trackId: this.currentTrack.id });
      } catch (err) {
        logger.warn('SessionOrchestrator', `Playback enable attempt failed: ${String(err)}`);
      }
    }
  }

  public togglePlayPause(): void {
    if (this.state === 'PLAYING') {
      this.activeProvider?.pause();
      this.setState('PAUSED');
    } else if (this.state === 'PAUSED' || this.state === 'IDLE') {
      if (this.autoplayBlocked) {
        this.enablePlayback();
      } else {
        this.activeProvider?.resume();
        this.setState('PLAYING');
      }
    }
  }

  public async skipNext(): Promise<void> {
    logger.info('SessionOrchestrator', 'User skipped to next track');
    if (this.currentTrack) {
      this.emitFeedbackEvent('trackSkipped', this.currentTrack.id);
      sessionTrace.logEvent('trackSkip', this.sessionToken, { trackId: this.currentTrack.id });
    }

    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.nextTrackCandidate = this.queue.length > 0 ? this.queue[0] : null;
      this.sessionToken++;
      await this.startPlaybackForCandidate(next, this.sessionToken);
    } else if (this.currentIntent) {
      this.activeBroadeningLevel = Math.min(4, this.activeBroadeningLevel + 1);
      await this.orchestrateSessionForIntent(this.currentIntent, {
        name: 'User',
        email: 'user@musicmirror.ai',
        preferredGenres: [],
        preferredLanguages: [],
        musicGoal: 'match',
      });
    }
  }

  public setVolume(volumePercent: number): void {
    this.volumeLevel = Math.max(0, Math.min(100, volumePercent));
    this.activeProvider?.setVolume(this.volumeLevel);
    this.notifyListeners();
  }

  public setMute(mute: boolean): void {
    this.muted = mute;
    this.activeProvider?.setMute(mute);
    this.notifyListeners();
  }

  public subscribe(listener: (state: PlaybackState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeFeedback(listener: (event: FeedbackEvent) => void): () => void {
    this.feedbackListeners.add(listener);
    return () => this.feedbackListeners.delete(listener);
  }

  /**
   * Internal Candidate Start & Recovery Flow
   */
  private async startPlaybackForCandidate(candidate: MusicCandidate, token: number): Promise<void> {
    if (token !== this.sessionToken) {
      logger.info('SessionOrchestrator', `Ignoring playback request for stale token [${token}]`);
      return;
    }

    sessionTrace.logEvent('playbackPrepare', token, { candidateId: candidate.id });
    this.setState('PREPARING');
    this.selectProviderForCandidate(candidate);

    try {
      await this.activeProvider!.load(candidate);

      if (token !== this.sessionToken) return;

      this.currentTrack = candidate;
      this.addToHistory(candidate.id);
      this.retryCount = 0;

      // Prepare next candidate in background for music continuity
      if (this.nextTrackCandidate && this.activeProvider) {
        this.activeProvider.prepare(this.nextTrackCandidate).catch(() => {});
      }

      try {
        await this.activeProvider!.play();
        this.setState('PLAYING');
        sessionTrace.logEvent('firstAudio', token, { trackId: candidate.id });
        sessionTrace.logEvent('trackStart', token, { trackId: candidate.id });
        this.emitFeedbackEvent('trackPlayed', candidate.id);
      } catch {
        // Autoplay Policy Restriction
        logger.warn('SessionOrchestrator', 'Browser Autoplay policy blocked initial playback');
        this.autoplayBlocked = true;
        this.setState('PAUSED');
      }
    } catch (err) {
      logger.warn('SessionOrchestrator', `Failed to load candidate [${candidate.title}]: ${String(err)}. Initiating recovery.`);
      sessionTrace.logEvent('error', token, { candidateId: candidate.id, error: String(err) });
      await this.executePlaybackRecovery(candidate, token);
    }
  }

  /**
   * Bounded Playback Recovery Pipeline
   */
  private async executePlaybackRecovery(failedCandidate: MusicCandidate, token: number): Promise<void> {
    if (token !== this.sessionToken) return;

    if (this.retryCount < this.maxRetriesPerTrack) {
      this.retryCount++;
      logger.info('SessionOrchestrator', `Recovery Step 1: Retrying track [${failedCandidate.title}] (attempt ${this.retryCount})`);
      await this.startPlaybackForCandidate(failedCandidate, token);
      return;
    }

    // Mark candidate unplayable
    failedCandidate.playbackCapability = 'unavailable';
    failedCandidate.status = 'restricted';
    logger.warn('SessionOrchestrator', `Recovery Step 2: Marked candidate [${failedCandidate.id}] UNPLAYABLE.`);

    if (this.queue.length > 0) {
      const nextCandidate = this.queue.shift()!;
      logger.info('SessionOrchestrator', `Recovery Step 3: Advancing to next candidate [${nextCandidate.title}]`);
      await this.startPlaybackForCandidate(nextCandidate, token);
    } else {
      logger.warn('SessionOrchestrator', 'Recovery Step 4: Queue exhausted. Falling back to offline catalog.');
      sessionTrace.logEvent('fallback', token, { reason: 'OFFLINE_CATALOG_FALLBACK' });
      this.setState('NO_PLAYABLE_MUSIC');
    }
  }

  /**
   * 5-Level Candidate Broadening Discovery Implementation
   */
  private async discoverCandidatesForLevel(
    intent: MusicIntent,
    preference: UserPreference,
    level: number
  ): Promise<MusicCandidate[]> {
    switch (level) {
      case 0:
        return await discoveryEngine.discoverCandidates(intent, 15);
      case 1:
        const relaxedIntent = { ...intent, priorityGenres: [], priorityLanguages: [] };
        return await discoveryEngine.discoverCandidates(relaxedIntent, 15);
      case 2:
        const broadenedIntent = { ...intent, specificity: 'broad' as const };
        return await discoveryEngine.discoverCandidates(broadenedIntent, 15);
      case 3:
        const neutralIntent = intentMapper.mapIntent(emotionInference.getFallbackState(), preference);
        return await discoveryEngine.discoverCandidates(neutralIntent, 10);
      case 4:
      default:
        const fallbackProvider = discoveryEngine.getProvider('royalty_free_fallback');
        return fallbackProvider ? await fallbackProvider.searchCandidates(intent, {} as any, 10) : [];
    }
  }

  private selectProviderForCandidate(candidate: MusicCandidate): void {
    const targetProviderId = candidate.providerId;
    const provider = this.providers.get(targetProviderId) || this.providers.get('youtube');

    if (provider && provider !== this.activeProvider) {
      this.activeProvider = provider;
      logger.info('SessionOrchestrator', `Switched active playback provider to [${provider.getProviderId()}]`);
    }
  }

  private isCandidatePlayable(candidate: MusicCandidate): boolean {
    return candidate.playbackCapability !== 'unavailable' && candidate.status === 'available';
  }

  private isInRecentHistory(trackId: string): boolean {
    return this.history.includes(trackId);
  }

  private addToHistory(trackId: string): void {
    this.history.push(trackId);
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }
  }

  private subscribeToProviderEvents(provider: PlaybackProvider): void {
    provider.subscribe((event: PlaybackEvent) => {
      if (event.type === 'ended') {
        logger.info('SessionOrchestrator', 'Track ended naturally. Advancing queue.');
        if (this.currentTrack) {
          this.emitFeedbackEvent('trackCompleted', this.currentTrack.id);
          sessionTrace.logEvent('trackEnd', this.sessionToken, { trackId: this.currentTrack.id });
        }
        this.skipNext();
      } else if (event.type === 'error') {
        logger.warn('SessionOrchestrator', `Provider error event received: ${event.error}`);
        if (this.currentTrack) {
          this.executePlaybackRecovery(this.currentTrack, this.sessionToken);
        }
      }
      this.notifyListeners();
    });
  }

  private setState(newState: SessionState): void {
    this.state = newState;
    logger.info('SessionOrchestrator', `Session State -> [${newState}]`);
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const state = this.getPlaybackState();
    this.listeners.forEach((listener) => listener(state));
  }

  private emitFeedbackEvent(type: FeedbackEvent['type'], candidateId: string): void {
    const event: FeedbackEvent = {
      type,
      candidateId,
      durationSeconds: this.currentTrack?.duration || 180,
      emotion: this.currentIntent?.emotion.normalizedEmotion || 'neutral',
      timestamp: Date.now(),
    };
    this.feedbackListeners.forEach((listener) => listener(event));

    // Convert playback events to PersonalizationEngine feedback
    if (this.currentTrack) {
      const feedbackTypeMap: Record<FeedbackEvent['type'], any> = {
        trackPlayed: 'COMPLETED',
        trackSkipped: 'SKIP',
        trackCompleted: 'COMPLETED',
        manualSelection: 'MANUAL_SELECTION',
        repeat: 'REPLAY',
      };

      personalizationEngine.recordFeedback({
        type: feedbackTypeMap[type] || 'COMPLETED',
        candidateId,
        artist: this.currentTrack.artist || this.currentTrack.artists[0] || '',
        genre: this.currentTrack.genre || '',
        language: this.currentTrack.language || '',
        valence: this.currentTrack.musicAttributes.valence,
        energy: this.currentTrack.musicAttributes.energy,
        playbackDurationSeconds: this.currentTrack.duration,
        completionRatio: type === 'trackSkipped' ? 0.20 : 1.0,
      });
    }
  }
}

export const sessionOrchestrator = SessionOrchestrator.getInstance();
