/**
 * PlaybackStateMachine
 * Tracks the full lifecycle of a YouTube search → playback attempt.
 * Used by YouTubeDiscoveryService and MoodRoom to drive UX messages and
 * recovery logic.
 */

export type PlaybackMachineState =
  | 'IDLE'
  | 'SEARCHING'
  | 'RANKING'
  | 'VALIDATING'
  | 'PLAYER_LOADING'
  | 'READY'
  | 'PLAYING'
  | 'BUFFERING'
  | 'RECOVERING'
  | 'FAILED'
  | 'NO_RESULTS';

/** Human-readable UX label shown in the search button / status strip */
export const STATE_MESSAGES: Record<PlaybackMachineState, string> = {
  IDLE: '',
  SEARCHING: 'Searching YouTube…',
  RANKING: 'Finding the best video…',
  VALIDATING: 'Checking video availability…',
  PLAYER_LOADING: 'Loading player…',
  READY: 'Ready to play',
  PLAYING: 'Playing',
  BUFFERING: 'Buffering…',
  RECOVERING: 'Finding another video…',
  FAILED: 'No playable video found',
  NO_RESULTS: 'No results found on YouTube',
};

/** Whether the machine is considered "busy" (show loading UI) */
export const STATE_IS_BUSY: Record<PlaybackMachineState, boolean> = {
  IDLE: false,
  SEARCHING: true,
  RANKING: true,
  VALIDATING: true,
  PLAYER_LOADING: true,
  READY: false,
  PLAYING: false,
  BUFFERING: true,
  RECOVERING: true,
  FAILED: false,
  NO_RESULTS: false,
};

export class PlaybackStateMachine {
  private state: PlaybackMachineState = 'IDLE';
  private listeners: Set<(state: PlaybackMachineState, msg: string) => void> = new Set();

  public getState(): PlaybackMachineState {
    return this.state;
  }

  public getMessage(): string {
    return STATE_MESSAGES[this.state];
  }

  public isBusy(): boolean {
    return STATE_IS_BUSY[this.state];
  }

  public transition(next: PlaybackMachineState): void {
    if (this.state === next) return;
    this.state = next;
    const msg = STATE_MESSAGES[next];
    this.listeners.forEach((l) => l(next, msg));
  }

  public subscribe(listener: (state: PlaybackMachineState, msg: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public reset(): void {
    this.transition('IDLE');
  }
}
