/**
 * ConsentRecord — Tests (Spec §17, §30)
 *
 * Covers:
 * - Record creation and retrieval
 * - Policy version validation (stale records rejected)
 * - hasConsent() truth table
 * - withdrawConsent() state machine
 * - clearAllConsent()
 * - sessionStorage unavailability (private browsing)
 * - Multiple concurrent purpose tracking
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  recordConsent,
  getConsentRecord,
  hasConsent,
  withdrawConsent,
  clearAllConsent,
  CURRENT_POLICY_VERSION,
  CONSENT_PURPOSES,
} from '../../permissions/ConsentRecord';

// ---------------------------------------------------------------------------
// Setup — use a fresh sessionStorage mock per test
// ---------------------------------------------------------------------------

const _sessionStore: Record<string, string> = {};

beforeEach(() => {
  Object.keys(_sessionStore).forEach(k => delete _sessionStore[k]);

  Object.defineProperty(global, 'sessionStorage', {
    value: {
      getItem: (k: string) => _sessionStore[k] ?? null,
      setItem: (k: string, v: string) => { _sessionStore[k] = v; },
      removeItem: (k: string) => { delete _sessionStore[k]; },
      clear: () => { Object.keys(_sessionStore).forEach(k => delete _sessionStore[k]); },
      get length() { return Object.keys(_sessionStore).length; },
      key: (i: number) => Object.keys(_sessionStore)[i] ?? null,
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Record creation
// ---------------------------------------------------------------------------

describe('ConsentRecord — record creation', () => {
  it('recordConsent returns a valid ConsentRecord', () => {
    const record = recordConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION, 'GRANTED');
    expect(record.purpose).toBe(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION);
    expect(record.decision).toBe('GRANTED');
    expect(record.policyVersion).toBe(CURRENT_POLICY_VERSION);
    expect(typeof record.timestamp).toBe('string');
    expect(() => new Date(record.timestamp)).not.toThrow();
  });

  it('timestamp is a valid ISO 8601 string', () => {
    const record = recordConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION, 'GRANTED');
    const d = new Date(record.timestamp);
    expect(isNaN(d.getTime())).toBe(false);
  });

  it('stores the record to sessionStorage', () => {
    recordConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION, 'GRANTED');
    const retrieved = getConsentRecord(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.decision).toBe('GRANTED');
  });
});

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

describe('ConsentRecord — retrieval', () => {
  it('getConsentRecord returns null when no record exists', () => {
    expect(getConsentRecord('nonexistent.purpose')).toBeNull();
  });

  it('returns the stored record for a known purpose', () => {
    recordConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION, 'GRANTED');
    const r = getConsentRecord(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION);
    expect(r).not.toBeNull();
    expect(r!.purpose).toBe(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION);
  });

  it('returns null for a different purpose when only one is recorded', () => {
    recordConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION, 'GRANTED');
    expect(getConsentRecord(CONSENT_PURPOSES.MICROPHONE_INPUT)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Policy version validation
// ---------------------------------------------------------------------------

describe('ConsentRecord — policy version validation', () => {
  it('rejects a record with a stale policy version', () => {
    // Manually inject a stale record into sessionStorage
    const staleRecord = {
      purpose: CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION,
      decision: 'GRANTED',
      timestamp: new Date().toISOString(),
      policyVersion: '0.00.00.0', // Old version
    };
    _sessionStore[`mm_consent_${CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION}`] = JSON.stringify(staleRecord);

    const retrieved = getConsentRecord(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION);
    // Should be treated as no valid consent
    expect(retrieved).toBeNull();
  });

  it('accepts a record with the current policy version', () => {
    const record = recordConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION, 'GRANTED');
    expect(record.policyVersion).toBe(CURRENT_POLICY_VERSION);
    const retrieved = getConsentRecord(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION);
    expect(retrieved).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// hasConsent()
// ---------------------------------------------------------------------------

describe('ConsentRecord — hasConsent()', () => {
  it('returns false when no consent record exists', () => {
    expect(hasConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION)).toBe(false);
  });

  it('returns true after GRANTED consent is recorded', () => {
    recordConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION, 'GRANTED');
    expect(hasConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION)).toBe(true);
  });

  it('returns false for DENIED consent', () => {
    recordConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION, 'DENIED');
    expect(hasConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION)).toBe(false);
  });

  it('returns false for WITHDRAWN consent', () => {
    recordConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION, 'WITHDRAWN');
    expect(hasConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION)).toBe(false);
  });

  it('returns false for a different purpose even if another is GRANTED', () => {
    recordConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION, 'GRANTED');
    expect(hasConsent(CONSENT_PURPOSES.MICROPHONE_INPUT)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// withdrawConsent()
// ---------------------------------------------------------------------------

describe('ConsentRecord — withdrawConsent()', () => {
  it('sets decision to WITHDRAWN after a GRANTED record', () => {
    recordConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION, 'GRANTED');
    expect(hasConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION)).toBe(true);

    withdrawConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION);
    expect(hasConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION)).toBe(false);
  });

  it('WITHDRAWN record is retrievable (so callers can detect active withdrawal vs. never-set)', () => {
    recordConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION, 'GRANTED');
    withdrawConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION);
    const record = getConsentRecord(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION);
    expect(record).not.toBeNull();
    expect(record!.decision).toBe('WITHDRAWN');
  });

  it('calling withdrawConsent on a purpose with no prior record does not crash', () => {
    expect(() => withdrawConsent('never.recorded.purpose')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// clearAllConsent()
// ---------------------------------------------------------------------------

describe('ConsentRecord — clearAllConsent()', () => {
  it('removes all mm_consent_ keys from sessionStorage', () => {
    recordConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION, 'GRANTED');
    recordConsent(CONSENT_PURPOSES.MICROPHONE_INPUT, 'DENIED');
    expect(hasConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION)).toBe(true);

    clearAllConsent();

    expect(getConsentRecord(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION)).toBeNull();
    expect(getConsentRecord(CONSENT_PURPOSES.MICROPHONE_INPUT)).toBeNull();
  });

  it('does not affect non-mm_consent_ keys', () => {
    _sessionStore['other_app_key'] = 'other_value';
    recordConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION, 'GRANTED');
    clearAllConsent();
    expect(_sessionStore['other_app_key']).toBe('other_value');
  });
});

// ---------------------------------------------------------------------------
// Multiple purposes tracked independently
// ---------------------------------------------------------------------------

describe('ConsentRecord — multiple purposes', () => {
  it('tracks camera and microphone consent independently', () => {
    recordConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION, 'GRANTED');
    recordConsent(CONSENT_PURPOSES.MICROPHONE_INPUT, 'DENIED');

    expect(hasConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION)).toBe(true);
    expect(hasConsent(CONSENT_PURPOSES.MICROPHONE_INPUT)).toBe(false);
  });

  it('withdrawing one purpose does not affect others', () => {
    recordConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION, 'GRANTED');
    recordConsent(CONSENT_PURPOSES.MICROPHONE_INPUT, 'GRANTED');

    withdrawConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION);

    expect(hasConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION)).toBe(false);
    expect(hasConsent(CONSENT_PURPOSES.MICROPHONE_INPUT)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// sessionStorage unavailable (private browsing)
// ---------------------------------------------------------------------------

describe('ConsentRecord — sessionStorage unavailable', () => {
  it('does not crash when sessionStorage throws on setItem', () => {
    Object.defineProperty(global, 'sessionStorage', {
      value: {
        getItem: () => null,
        setItem: () => { throw new Error('QuotaExceededError'); },
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null,
      },
      writable: true,
      configurable: true,
    });

    expect(() => recordConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION, 'GRANTED')).not.toThrow();
  });

  it('returns null when sessionStorage getItem throws', () => {
    Object.defineProperty(global, 'sessionStorage', {
      value: {
        getItem: () => { throw new Error('SecurityError'); },
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null,
      },
      writable: true,
      configurable: true,
    });

    expect(getConsentRecord(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION)).toBeNull();
  });

  it('hasConsent returns false when storage is inaccessible', () => {
    Object.defineProperty(global, 'sessionStorage', {
      value: {
        getItem: () => { throw new Error('SecurityError'); },
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null,
      },
      writable: true,
      configurable: true,
    });

    expect(hasConsent(CONSENT_PURPOSES.CAMERA_EMOTION_DETECTION)).toBe(false);
  });
});
