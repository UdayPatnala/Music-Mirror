/**
 * YouTubeRecoveryEngine
 * Manages the automated fallback ladder for YouTube playback.
 * Workflow:
 *   1. Given a pool of ranked candidates, attempts each one sequentially.
 *   2. When a candidate fails (IFrame error, embedding disabled), skips to the next.
 *   3. If all pool candidates are exhausted without a successful play, emits FAILED.
 *   4. Respects a max-attempt limit to prevent infinite loops.
 *
 * Usage:
 *   const engine = new YouTubeRecoveryEngine(candidates, onCandidateSelected, onExhausted);
 *   engine.start();                 // try candidate[0]
 *   engine.reportFailure();         // triggers fallback to candidate[1]
 *   engine.reportSuccess();         // stops recovery cycle
 */

import type { YouTubeCandidate } from './YouTubeDiscoveryService';

export interface RecoveryEngineCallbacks {
  /** Called whenever the engine selects a new candidate to try */
  onCandidateSelected: (candidate: YouTubeCandidate, attemptIndex: number) => void;
  /** Called when all candidates have been exhausted without a successful play */
  onExhausted: () => void;
  /** Called when recovery enters "recovering" state (for UX message update) */
  onRecovering?: (attemptIndex: number, remainingCount: number) => void;
}

const MAX_ATTEMPTS = 10; // Safety cap — never try more than 10 candidates

export class YouTubeRecoveryEngine {
  private candidates: YouTubeCandidate[];
  private callbacks: RecoveryEngineCallbacks;
  private currentIndex: number = 0;
  private isActive: boolean = false;
  private attemptCount: number = 0;

  constructor(candidates: YouTubeCandidate[], callbacks: RecoveryEngineCallbacks) {
    this.candidates = candidates;
    this.callbacks = callbacks;
  }

  /** Replace candidate pool (e.g., after a query expansion fetch) */
  public setCandidates(candidates: YouTubeCandidate[]): void {
    this.candidates = candidates;
    this.currentIndex = 0;
    this.attemptCount = 0;
  }

  /** Start: attempt the first candidate */
  public start(): void {
    this.currentIndex = 0;
    this.attemptCount = 0;
    this.isActive = true;
    this.tryCurrentCandidate();
  }

  /** Stop (e.g., user started a new search) */
  public stop(): void {
    this.isActive = false;
  }

  /** Called by caller when current candidate succeeded */
  public reportSuccess(): void {
    this.isActive = false;
  }

  /**
   * Called by caller when current candidate failed (IFrame error or validation fail).
   * Advances to next candidate with a short debounce (sub-3s UX requirement).
   */
  public reportFailure(): void {
    if (!this.isActive) return;

    const remaining = this.candidates.length - (this.currentIndex + 1);
    this.callbacks.onRecovering?.(this.attemptCount, remaining);

    // Brief debounce before attempting next — feels responsive, not instant-flip
    setTimeout(() => {
      if (!this.isActive) return;
      this.currentIndex++;
      this.tryCurrentCandidate();
    }, 800);
  }

  /** Current candidate (for reference) */
  public getCurrentCandidate(): YouTubeCandidate | null {
    return this.candidates[this.currentIndex] ?? null;
  }

  public getRemainingCount(): number {
    return Math.max(0, this.candidates.length - this.currentIndex - 1);
  }

  private tryCurrentCandidate(): void {
    if (!this.isActive) return;
    this.attemptCount++;

    if (this.attemptCount > MAX_ATTEMPTS) {
      console.warn('[YouTubeRecoveryEngine] Max attempt limit reached. Emitting exhausted.');
      this.isActive = false;
      this.callbacks.onExhausted();
      return;
    }

    const candidate = this.candidates[this.currentIndex];
    if (!candidate) {
      this.isActive = false;
      this.callbacks.onExhausted();
      return;
    }

    this.callbacks.onCandidateSelected(candidate, this.attemptCount - 1);
  }
}
