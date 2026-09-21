/**
 * Music Mirror — Consent Record Model
 *
 * Where application-level consent is genuinely required, store only the
 * minimum record necessary per spec §17:
 *
 *   purpose | decision | timestamp | policyVersion
 *
 * Storage: sessionStorage only.
 * Consent does not persist across browser sessions unless the user has
 * explicitly opted in to persistent storage (not currently implemented).
 *
 * Do not store raw personal data to prove consent occurred.
 * Do not re-request consent unless the purpose or policy has changed.
 */

export type ConsentDecision = 'GRANTED' | 'DENIED' | 'WITHDRAWN';

export interface ConsentRecord {
  /** What the consent covers — must be human-readable and specific. */
  purpose: string;
  /** The user's decision. */
  decision: ConsentDecision;
  /** ISO 8601 timestamp when the decision was recorded. */
  timestamp: string;
  /** Version of the privacy policy/terms that was in effect at decision time. */
  policyVersion: string;
}

// Current policy version — bump when processing purposes or data flows change materially.
export const CURRENT_POLICY_VERSION = '2.06.02.0';

const STORAGE_PREFIX = 'mm_consent_';

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

/**
 * Record a consent decision.
 * Uses sessionStorage — does not persist across browser sessions.
 */
export function recordConsent(purpose: string, decision: ConsentDecision): ConsentRecord {
  const record: ConsentRecord = {
    purpose,
    decision,
    timestamp: new Date().toISOString(),
    policyVersion: CURRENT_POLICY_VERSION,
  };
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${purpose}`, JSON.stringify(record));
  } catch {
    // sessionStorage unavailable (private browsing restriction, etc.) — non-fatal.
  }
  return record;
}

/**
 * Retrieve the most recent consent record for a given purpose.
 * Returns null if no record exists for this session.
 */
export function getConsentRecord(purpose: string): ConsentRecord | null {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${purpose}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    // If policy version has changed, treat as no valid consent.
    if (parsed.policyVersion !== CURRENT_POLICY_VERSION) {
      sessionStorage.removeItem(`${STORAGE_PREFIX}${purpose}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Check if there is a current GRANTED consent for a purpose.
 */
export function hasConsent(purpose: string): boolean {
  const record = getConsentRecord(purpose);
  return record !== null && record.decision === 'GRANTED';
}

/**
 * Withdraw consent for a purpose.
 * Removes the stored record and records a WITHDRAWN decision.
 */
export function withdrawConsent(purpose: string): void {
  // Remove existing record
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${purpose}`);
  } catch { /* non-fatal */ }
  // Record the withdrawal (so callers can detect it was actively withdrawn vs. never set)
  recordConsent(purpose, 'WITHDRAWN');
}

/**
 * Clear all consent records for this session.
 * Called when the user resets permissions.
 */
export function clearAllConsent(): void {
  try {
    // Collect keys first to avoid mutation during iteration
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        keys.push(k);
      }
    }
    keys.forEach(k => sessionStorage.removeItem(k));
  } catch { /* non-fatal */ }
}

// ---------------------------------------------------------------------------
// Well-known purpose identifiers
// ---------------------------------------------------------------------------

export const CONSENT_PURPOSES = {
  CAMERA_EMOTION_DETECTION: 'camera.emotion_detection',
  MICROPHONE_INPUT: 'microphone.input',
  LOCATION_CONTEXT: 'location.context',
} as const;

export type ConsentPurpose = typeof CONSENT_PURPOSES[keyof typeof CONSENT_PURPOSES];
