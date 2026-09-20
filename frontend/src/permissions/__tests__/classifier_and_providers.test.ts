/**
 * DataClassifier & ProviderRegistry — Tests (Spec §13, §14, §31, §34)
 *
 * Verifies:
 * - All known data fields have classifications
 * - SENSITIVE_CONTEXT fields are never marked as persistable
 * - TEMPORARY_DATA fields are never marked as persistable
 * - Retention policies are defined for every DataClass
 * - Provider registry completeness and data minimization
 * - No unregistered providers can be silently used
 * - Privacy audit utilities (getFieldsByClass, getProvidersTransmittingData)
 */

import { describe, it, expect } from 'vitest';
import {
  DataClass,
  MM_DATA_CLASSIFICATIONS,
  classifyField,
  getRetentionPolicy,
  mustNotPersist,
  requiresConsentForTransmission,
  getFieldsByClass,
} from '../../permissions/DataClassifier';

import {
  getAllProviders,
  getActiveProviders,
  getProvider,
  getProvidersTransmittingData,
  getProvidersByCategory,
  getProvidersWithUnknownRetention,
  isProviderRegistered,
} from '../../permissions/ProviderRegistry';

// ---------------------------------------------------------------------------
// DataClassifier — classification map completeness
// ---------------------------------------------------------------------------

describe('DataClassifier — classification map', () => {
  it('has at least one entry per DataClass', () => {
    const classes = new Set(Object.values(MM_DATA_CLASSIFICATIONS));
    // We should have most DataClass values covered
    expect(classes.has(DataClass.SENSITIVE_CONTEXT)).toBe(true);
    expect(classes.has(DataClass.PUBLIC)).toBe(true);
    expect(classes.has(DataClass.USER_DATA)).toBe(true);
    expect(classes.has(DataClass.TEMPORARY_DATA)).toBe(true);
  });

  it('classifyField returns the correct class for known fields', () => {
    expect(classifyField('camera.raw_frame')).toBe(DataClass.SENSITIVE_CONTEXT);
    expect(classifyField('track.title')).toBe(DataClass.PUBLIC);
    expect(classifyField('user.email')).toBe(DataClass.PERSONAL_DATA);
    expect(classifyField('user.listening_history')).toBe(DataClass.USER_DATA);
    expect(classifyField('session.active_emotion_id')).toBe(DataClass.TEMPORARY_DATA);
    expect(classifyField('discovery.cache_entry')).toBe(DataClass.PROVIDER_DATA);
  });

  it('classifyField returns null for unknown fields', () => {
    expect(classifyField('unknown.field.xyz')).toBeNull();
  });

  it('camera raw frame is SENSITIVE_CONTEXT', () => {
    expect(classifyField('camera.raw_frame')).toBe(DataClass.SENSITIVE_CONTEXT);
    expect(classifyField('camera.pixel_data')).toBe(DataClass.SENSITIVE_CONTEXT);
    expect(classifyField('camera.landmark_positions')).toBe(DataClass.SENSITIVE_CONTEXT);
  });

  it('inferred emotion is DERIVED_DATA (not SENSITIVE_CONTEXT, but still protected)', () => {
    expect(classifyField('camera.inferred_emotion')).toBe(DataClass.DERIVED_DATA);
    expect(classifyField('camera.confidence_score')).toBe(DataClass.DERIVED_DATA);
  });

  it('user identity fields are PERSONAL_DATA', () => {
    expect(classifyField('user.id')).toBe(DataClass.PERSONAL_DATA);
    expect(classifyField('user.email')).toBe(DataClass.PERSONAL_DATA);
    expect(classifyField('user.name')).toBe(DataClass.PERSONAL_DATA);
  });
});

// ---------------------------------------------------------------------------
// DataClassifier — retention policies
// ---------------------------------------------------------------------------

describe('DataClassifier — retention policies', () => {
  it('every DataClass has a defined retention policy', () => {
    const allClasses = Object.values(DataClass);
    allClasses.forEach(cls => {
      const policy = getRetentionPolicy(cls as DataClass);
      expect(policy).toBeDefined();
      expect(typeof policy.policy).toBe('string');
      expect(policy.policy.length).toBeGreaterThan(10);
    });
  });

  it('SENSITIVE_CONTEXT data has maxAgeSeconds === 0 (must not be stored)', () => {
    const policy = getRetentionPolicy(DataClass.SENSITIVE_CONTEXT);
    expect(policy.maxAgeSeconds).toBe(0);
    expect(policy.storage).toBe('none');
  });

  it('TEMPORARY_DATA has a bounded maxAgeSeconds', () => {
    const policy = getRetentionPolicy(DataClass.TEMPORARY_DATA);
    expect(policy.maxAgeSeconds).toBeGreaterThan(0);
    expect(policy.maxAgeSeconds).toBeLessThanOrEqual(600); // At most 10 minutes
  });

  it('PUBLIC data has no zero-retention restriction', () => {
    const policy = getRetentionPolicy(DataClass.PUBLIC);
    expect(policy.maxAgeSeconds).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// mustNotPersist()
// ---------------------------------------------------------------------------

describe('DataClassifier — mustNotPersist()', () => {
  it('SENSITIVE_CONTEXT must not be persisted', () => {
    expect(mustNotPersist(DataClass.SENSITIVE_CONTEXT)).toBe(true);
  });

  it('TEMPORARY_DATA must not be persisted', () => {
    expect(mustNotPersist(DataClass.TEMPORARY_DATA)).toBe(true);
  });

  it('PUBLIC data may be persisted', () => {
    expect(mustNotPersist(DataClass.PUBLIC)).toBe(false);
  });

  it('USER_DATA may be persisted (with user control)', () => {
    expect(mustNotPersist(DataClass.USER_DATA)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// requiresConsentForTransmission()
// ---------------------------------------------------------------------------

describe('DataClassifier — requiresConsentForTransmission()', () => {
  it('SENSITIVE_CONTEXT requires consent for transmission', () => {
    expect(requiresConsentForTransmission(DataClass.SENSITIVE_CONTEXT)).toBe(true);
  });

  it('PERSONAL_DATA requires consent for transmission', () => {
    expect(requiresConsentForTransmission(DataClass.PERSONAL_DATA)).toBe(true);
  });

  it('USER_DATA requires consent for transmission', () => {
    expect(requiresConsentForTransmission(DataClass.USER_DATA)).toBe(true);
  });

  it('PUBLIC data does not require explicit consent for transmission', () => {
    expect(requiresConsentForTransmission(DataClass.PUBLIC)).toBe(false);
  });

  it('INTERNAL data does not require explicit consent for transmission', () => {
    expect(requiresConsentForTransmission(DataClass.INTERNAL)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getFieldsByClass()
// ---------------------------------------------------------------------------

describe('DataClassifier — getFieldsByClass()', () => {
  it('returns at least one field for SENSITIVE_CONTEXT', () => {
    const fields = getFieldsByClass(DataClass.SENSITIVE_CONTEXT);
    expect(fields.length).toBeGreaterThan(0);
    expect(fields).toContain('camera.raw_frame');
  });

  it('returns at least one field for PUBLIC', () => {
    const fields = getFieldsByClass(DataClass.PUBLIC);
    expect(fields.length).toBeGreaterThan(0);
    expect(fields).toContain('track.title');
  });

  it('all returned fields are valid keys in MM_DATA_CLASSIFICATIONS', () => {
    const fields = getFieldsByClass(DataClass.USER_DATA);
    fields.forEach(f => {
      expect(MM_DATA_CLASSIFICATIONS[f]).toBe(DataClass.USER_DATA);
    });
  });
});

// ---------------------------------------------------------------------------
// ProviderRegistry — completeness
// ---------------------------------------------------------------------------

describe('ProviderRegistry — registry completeness', () => {
  it('has at least one active provider', () => {
    expect(getActiveProviders().length).toBeGreaterThan(0);
  });

  it('every provider has a non-empty id and name', () => {
    getAllProviders().forEach(p => {
      expect(p.id.length).toBeGreaterThan(0);
      expect(p.name.length).toBeGreaterThan(0);
    });
  });

  it('every provider has a specific purpose description', () => {
    getAllProviders().forEach(p => {
      expect(p.purpose.length).toBeGreaterThan(20);
    });
  });

  it('every provider has a defined failureBehavior', () => {
    getAllProviders().forEach(p => {
      expect(p.failureBehavior).toBeTruthy();
    });
  });

  it('every provider has a defined userControl level', () => {
    getAllProviders().forEach(p => {
      expect(p.userControl).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// ProviderRegistry — lookup
// ---------------------------------------------------------------------------

describe('ProviderRegistry — provider lookup', () => {
  it('getProvider returns the correct provider by id', () => {
    const yt = getProvider('youtube_api');
    expect(yt).not.toBeNull();
    expect(yt!.name).toContain('YouTube');
  });

  it('getProvider returns null for unknown provider', () => {
    expect(getProvider('nonexistent_provider_xyz')).toBeNull();
  });

  it('isProviderRegistered returns true for known providers', () => {
    expect(isProviderRegistered('youtube_api')).toBe(true);
    expect(isProviderRegistered('mm_backend')).toBe(true);
    expect(isProviderRegistered('face_api_js')).toBe(true);
  });

  it('isProviderRegistered returns false for unknown providers', () => {
    expect(isProviderRegistered('random_third_party')).toBe(false);
    expect(isProviderRegistered('spotify')).toBe(false); // Not implemented
  });
});

// ---------------------------------------------------------------------------
// ProviderRegistry — data minimization audit (spec §13, §31)
// ---------------------------------------------------------------------------

describe('ProviderRegistry — data minimization', () => {
  it('face-api.js sends NO data externally (local only)', () => {
    const faceApi = getProvider('face_api_js');
    expect(faceApi).not.toBeNull();
    expect(faceApi!.dataSent.length).toBe(0);
  });

  it('mm_backend only sends non-personally-identifying data', () => {
    const backend = getProvider('mm_backend');
    expect(backend).not.toBeNull();
    // None of the dataSent fields should contain raw camera data or personal identifiers
    const sentData = backend!.dataSent.join(' ').toLowerCase();
    expect(sentData).not.toContain('camera');
    expect(sentData).not.toContain('frame');
    expect(sentData).not.toContain('email');
    expect(sentData).not.toContain('name');
  });

  it('getProvidersTransmittingData only returns active providers with dataSent', () => {
    const transmitting = getProvidersTransmittingData();
    transmitting.forEach(p => {
      expect(p.active).toBe(true);
      expect(p.dataSent.length).toBeGreaterThan(0);
    });
  });

  it('getProvidersWithUnknownRetention returns providers without known retention policies', () => {
    const unknown = getProvidersWithUnknownRetention();
    unknown.forEach(p => {
      expect(p.retentionKnown).toBe(false);
      expect(p.active).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// ProviderRegistry — category filtering
// ---------------------------------------------------------------------------

describe('ProviderRegistry — category filtering', () => {
  it('MUSIC_PROVIDER category contains YouTube providers', () => {
    const musicProviders = getProvidersByCategory('MUSIC_PROVIDER');
    expect(musicProviders.length).toBeGreaterThan(0);
    const ids = musicProviders.map(p => p.id);
    expect(ids).toContain('youtube_api');
    expect(ids).toContain('youtube_iframe');
  });

  it('AI_LLM_PROVIDER category contains face-api.js', () => {
    const aiProviders = getProvidersByCategory('AI_LLM_PROVIDER');
    expect(aiProviders.map(p => p.id)).toContain('face_api_js');
  });

  it('no ANALYTICS_PROVIDER is active (none implemented)', () => {
    const analytics = getProvidersByCategory('ANALYTICS_PROVIDER').filter(p => p.active);
    expect(analytics.length).toBe(0);
  });

  it('face-api.js requires OPT_IN user control (camera explicit consent)', () => {
    const faceApi = getProvider('face_api_js');
    expect(faceApi!.userControl).toBe('OPT_IN');
  });
});

// ---------------------------------------------------------------------------
// Privacy audit — camera data flow (spec §6, §31)
// ---------------------------------------------------------------------------

describe('Privacy audit — camera data flow', () => {
  it('raw camera frames are classified as SENSITIVE_CONTEXT', () => {
    expect(classifyField('camera.raw_frame')).toBe(DataClass.SENSITIVE_CONTEXT);
  });

  it('camera raw frames must not be persisted', () => {
    expect(mustNotPersist(DataClass.SENSITIVE_CONTEXT)).toBe(true);
  });

  it('the AI provider for camera (face-api.js) sends no data externally', () => {
    const faceApi = getProvider('face_api_js');
    expect(faceApi!.dataSent.length).toBe(0);
  });

  it('inferred emotion (DERIVED_DATA) has bounded retention', () => {
    const policy = getRetentionPolicy(DataClass.DERIVED_DATA);
    expect(policy.maxAgeSeconds).toBeLessThanOrEqual(3600); // Max 1h
  });
});
