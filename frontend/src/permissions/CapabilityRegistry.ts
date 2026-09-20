/**
 * Music Mirror — Centralized Capability Registry
 *
 * All device/browser capability access must go through this registry.
 * No component may call navigator.mediaDevices, Notification.requestPermission,
 * or any similar browser API directly without first passing through here.
 *
 * Design:
 *   - Minimum access: request only when genuinely required.
 *   - Minimum retention: do not cache granted state beyond the session.
 *   - Maximum transparency: every state transition is observable.
 *   - Permission dark patterns are explicitly prohibited (see spec §28).
 *
 * State machine per capability:
 *
 *   NOT_REQUESTED
 *       ↓ request()
 *   REQUESTING
 *       ↓ success        ↓ denied         ↓ blocked        ↓ unavailable
 *   GRANTED           DENIED           BLOCKED          UNAVAILABLE
 *       ↓ external revoke or device loss
 *   REVOKED / ERROR
 */

export type CapabilityId =
  | 'CAMERA'
  | 'MICROPHONE'
  | 'NOTIFICATIONS'
  | 'LOCAL_STORAGE';

export type CapabilityState =
  | 'NOT_REQUESTED'
  | 'REQUESTING'
  | 'GRANTED'
  | 'DENIED'
  | 'BLOCKED'
  | 'UNAVAILABLE'
  | 'REVOKED'
  | 'ERROR';

export interface CapabilityStatus {
  id: CapabilityId;
  state: CapabilityState;
  /** ISO timestamp of last state change */
  lastUpdatedAt: string;
  /** Human-readable reason for current state (if known) */
  reason: string | null;
}

export type CapabilityListener = (status: CapabilityStatus) => void;

// ---------------------------------------------------------------------------
// Internal state store
// ---------------------------------------------------------------------------

const _states = new Map<CapabilityId, CapabilityStatus>();
const _listeners = new Map<CapabilityId, Set<CapabilityListener>>();

function _now(): string {
  return new Date().toISOString();
}

function _initCapability(id: CapabilityId): CapabilityStatus {
  if (!_states.has(id)) {
    _states.set(id, {
      id,
      state: 'NOT_REQUESTED',
      lastUpdatedAt: _now(),
      reason: null,
    });
  }
  return _states.get(id)!;
}

function _set(id: CapabilityId, patch: Partial<CapabilityStatus>): CapabilityStatus {
  const current = _initCapability(id);
  const updated: CapabilityStatus = {
    ...current,
    ...patch,
    id,
    lastUpdatedAt: _now(),
  };
  _states.set(id, updated);
  // Notify all listeners
  const listeners = _listeners.get(id);
  if (listeners) {
    listeners.forEach(fn => {
      try { fn(updated); } catch { /* listener errors must not break the registry */ }
    });
  }
  return updated;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the current capability status without triggering any permission request.
 */
export function getState(id: CapabilityId): CapabilityStatus {
  return { ..._initCapability(id) };
}

/**
 * Returns true only if the capability is in GRANTED state.
 */
export function isGranted(id: CapabilityId): boolean {
  return _initCapability(id).state === 'GRANTED';
}

/**
 * Returns false if the browser/device cannot support this capability at all.
 */
export function isAvailable(id: CapabilityId): boolean {
  switch (id) {
    case 'CAMERA':
      return typeof navigator !== 'undefined' &&
        typeof navigator.mediaDevices?.getUserMedia === 'function';
    case 'MICROPHONE':
      return typeof navigator !== 'undefined' &&
        typeof navigator.mediaDevices?.getUserMedia === 'function';
    case 'NOTIFICATIONS':
      return typeof Notification !== 'undefined';
    case 'LOCAL_STORAGE':
      try {
        localStorage.setItem('__mm_test__', '1');
        localStorage.removeItem('__mm_test__');
        return true;
      } catch {
        return false;
      }
    default:
      return false;
  }
}

/**
 * Request a capability.
 *
 * This is the ONLY place where a browser permission prompt may be triggered.
 * The caller is responsible for first displaying purpose information to the user
 * and obtaining application-level consent before calling this function.
 *
 * Returns the resulting CapabilityStatus.
 */
export async function requestCapability(
  id: CapabilityId,
  constraints?: MediaStreamConstraints
): Promise<CapabilityStatus> {
  const current = _initCapability(id);

  // Already granted — do not re-request.
  if (current.state === 'GRANTED') {
    return { ...current };
  }

  // Blocked means the browser has permanently denied access. Do not re-request.
  if (current.state === 'BLOCKED') {
    return { ...current };
  }

  // Not available in this environment.
  if (!isAvailable(id)) {
    return _set(id, { state: 'UNAVAILABLE', reason: 'Capability not supported in this browser/environment.' });
  }

  _set(id, { state: 'REQUESTING', reason: null });

  try {
    switch (id) {
      case 'CAMERA': {
        const stream = await navigator.mediaDevices.getUserMedia(
          constraints || { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } }
        );
        // Stop the probe stream immediately — actual usage is by the consumer.
        stream.getTracks().forEach(t => t.stop());
        return _set(id, { state: 'GRANTED', reason: null });
      }

      case 'MICROPHONE': {
        const stream = await navigator.mediaDevices.getUserMedia(
          constraints || { audio: true }
        );
        stream.getTracks().forEach(t => t.stop());
        return _set(id, { state: 'GRANTED', reason: null });
      }

      case 'NOTIFICATIONS': {
        const result = await Notification.requestPermission();
        if (result === 'granted') {
          return _set(id, { state: 'GRANTED', reason: null });
        } else if (result === 'denied') {
          return _set(id, { state: 'BLOCKED', reason: 'User denied notification permission.' });
        } else {
          // 'default' — dismissed without decision
          return _set(id, { state: 'DENIED', reason: 'Permission request dismissed.' });
        }
      }

      case 'LOCAL_STORAGE': {
        if (isAvailable('LOCAL_STORAGE')) {
          return _set(id, { state: 'GRANTED', reason: null });
        }
        return _set(id, { state: 'UNAVAILABLE', reason: 'localStorage not accessible.' });
      }

      default:
        return _set(id, { state: 'UNAVAILABLE', reason: 'Unknown capability.' });
    }
  } catch (err: any) {
    const message: string = err?.message || 'Unknown error';
    // NotAllowedError means user denied or browser blocked
    if (err?.name === 'NotAllowedError') {
      // Check if it was already denied (blocked) vs. user actively denied now
      const query = id === 'CAMERA' ? 'camera' : id === 'MICROPHONE' ? 'microphone' : null;
      if (query && typeof navigator.permissions?.query === 'function') {
        try {
          const perm = await navigator.permissions.query({ name: query as PermissionName });
          if (perm.state === 'denied') {
            return _set(id, { state: 'BLOCKED', reason: 'Browser/OS has blocked this permission. Check browser settings.' });
          }
        } catch { /* permissions API not available */ }
      }
      return _set(id, { state: 'DENIED', reason: 'User denied permission.' });
    }
    if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
      return _set(id, { state: 'UNAVAILABLE', reason: 'Required device not found.' });
    }
    return _set(id, { state: 'ERROR', reason: message });
  }
}

/**
 * Mark a capability as revoked (e.g. detected via Permissions API change event).
 * This does NOT call any browser API — it only updates internal state.
 */
export function markRevoked(id: CapabilityId, reason?: string): CapabilityStatus {
  return _set(id, { state: 'REVOKED', reason: reason || 'Permission revoked externally.' });
}

/**
 * Mark a capability as errored (e.g. device disconnected mid-session).
 */
export function markError(id: CapabilityId, reason: string): CapabilityStatus {
  return _set(id, { state: 'ERROR', reason });
}

/**
 * Returns human-readable guidance for how the user can revoke this capability
 * in browser settings (used when programmatic revocation is not possible).
 */
export function revokeGuidance(id: CapabilityId): string {
  const base = 'To revoke access, open your browser settings:';
  switch (id) {
    case 'CAMERA':
      return `${base} Settings > Privacy and Security > Site Settings > Camera`;
    case 'MICROPHONE':
      return `${base} Settings > Privacy and Security > Site Settings > Microphone`;
    case 'NOTIFICATIONS':
      return `${base} Settings > Privacy and Security > Site Settings > Notifications`;
    case 'LOCAL_STORAGE':
      return `${base} Settings > Privacy and Security > Clear browsing data > Cookies and site data`;
    default:
      return `${base} Settings > Privacy and Security > Site Settings`;
  }
}

/**
 * Subscribe to capability state changes.
 * Returns an unsubscribe function.
 */
export function subscribe(id: CapabilityId, listener: CapabilityListener): () => void {
  if (!_listeners.has(id)) {
    _listeners.set(id, new Set());
  }
  _listeners.get(id)!.add(listener);
  return () => {
    _listeners.get(id)?.delete(listener);
  };
}

/**
 * Install a Permissions API change watcher for a capability.
 * When the browser revokes permission externally, marks the capability as REVOKED.
 * Safe to call multiple times — no-ops if already watching or API unavailable.
 */
const _watched = new Set<CapabilityId>();

export function watchExternalRevocation(id: CapabilityId): void {
  if (_watched.has(id)) return;
  if (typeof navigator.permissions?.query !== 'function') return;

  const permName = id === 'CAMERA' ? 'camera' : id === 'MICROPHONE' ? 'microphone' : null;
  if (!permName) return;

  navigator.permissions.query({ name: permName as PermissionName }).then(result => {
    _watched.add(id);
    result.addEventListener('change', () => {
      if (result.state === 'denied' && isGranted(id)) {
        markRevoked(id, 'Permission revoked by browser or OS settings.');
      }
    });
  }).catch(() => { /* Permissions API not available */ });
}

/**
 * Reset a capability to NOT_REQUESTED state.
 * Intended for testing only. Do not call in production flows.
 */
export function _resetForTest(id: CapabilityId): void {
  _states.delete(id);
  _watched.delete(id);
}
