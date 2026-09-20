import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateTransmission,
  assertCanTransmit,
  sanitizeTransmissionPayload,
  transmitSafely,
  PrivacyViolationError,
  UnapprovedProviderError,
  ConsentRequiredError,
  getTransmissionAuditLog,
  clearTransmissionAuditLog,
} from '../TransmissionGate';
import { recordConsent, withdrawConsent, clearAllConsent } from '../ConsentRecord';
import { DataClass } from '../DataClassifier';

describe('TransmissionGate (Spec §15 Data Transmission Enforcer)', () => {
  beforeEach(() => {
    clearAllConsent();
    clearTransmissionAuditLog();
  });

  describe('Destination Provider Verification', () => {
    it('blocks transmission to unknown/unregistered providers', () => {
      const evaluation = evaluateTransmission({
        destinationProviderId: 'unauthorized_analytics_co',
        fieldKeys: ['system.app_version'],
      });

      expect(evaluation.allowed).toBe(false);
      expect(evaluation.reason).toContain('not registered');
      expect(() => {
        assertCanTransmit({
          destinationProviderId: 'unauthorized_analytics_co',
          fieldKeys: ['system.app_version'],
        });
      }).toThrow(UnapprovedProviderError);
    });

    it('permits transmission to registered providers when fields are benign', () => {
      const evaluation = evaluateTransmission({
        destinationProviderId: 'mm_backend',
        fieldKeys: ['system.app_version', 'system.health_status'],
      });

      expect(evaluation.allowed).toBe(true);
      expect(evaluation.blockedFields).toHaveLength(0);
      expect(evaluation.allowedFields).toEqual(['system.app_version', 'system.health_status']);
    });
  });

  describe('SENSITIVE_CONTEXT Architectural Prohibition', () => {
    it('strictly blocks transmission of camera.raw_frame', () => {
      const evaluation = evaluateTransmission({
        destinationProviderId: 'mm_backend',
        fieldKeys: ['camera.raw_frame'],
      });

      expect(evaluation.allowed).toBe(false);
      expect(evaluation.violationClass).toBe(DataClass.SENSITIVE_CONTEXT);
      expect(evaluation.blockedFields).toContain('camera.raw_frame');

      expect(() => {
        assertCanTransmit({
          destinationProviderId: 'mm_backend',
          fieldKeys: ['camera.raw_frame'],
        });
      }).toThrow(PrivacyViolationError);
    });

    it('strictly blocks transmission of camera.landmark_positions even with registered provider', () => {
      expect(() => {
        assertCanTransmit({
          destinationProviderId: 'youtube_api',
          fieldKeys: ['camera.landmark_positions'],
        });
      }).toThrow(PrivacyViolationError);
    });

    it('blocks batch transmission if ANY field contains SENSITIVE_CONTEXT', () => {
      const evaluation = evaluateTransmission({
        destinationProviderId: 'mm_backend',
        fieldKeys: ['system.app_version', 'camera.raw_frame', 'system.health_status'],
      });

      expect(evaluation.allowed).toBe(false);
      expect(evaluation.violationClass).toBe(DataClass.SENSITIVE_CONTEXT);
    });
  });

  describe('Consent-Gated Transmission', () => {
    it('blocks USER_DATA transmission when consent is not granted', () => {
      const evaluation = evaluateTransmission({
        destinationProviderId: 'mm_backend',
        fieldKeys: ['playback.volume_percent'],
        purpose: 'sync_user_volume',
      });

      expect(evaluation.allowed).toBe(false);
      expect(evaluation.requiresConsent).toBe(true);
      expect(evaluation.blockedFields).toContain('playback.volume_percent');

      expect(() => {
        assertCanTransmit({
          destinationProviderId: 'mm_backend',
          fieldKeys: ['playback.volume_percent'],
          purpose: 'sync_user_volume',
        });
      }).toThrow(ConsentRequiredError);
    });

    it('allows USER_DATA transmission when explicit consent is granted', () => {
      recordConsent('sync_user_volume', 'GRANTED');

      const evaluation = evaluateTransmission({
        destinationProviderId: 'mm_backend',
        fieldKeys: ['playback.volume_percent'],
        purpose: 'sync_user_volume',
      });

      expect(evaluation.allowed).toBe(true);
      expect(evaluation.allowedFields).toContain('playback.volume_percent');
      expect(() => {
        assertCanTransmit({
          destinationProviderId: 'mm_backend',
          fieldKeys: ['playback.volume_percent'],
          purpose: 'sync_user_volume',
        });
      }).not.toThrow();
    });

    it('immediately blocks transmission after consent is withdrawn', () => {
      recordConsent('sync_user_volume', 'GRANTED');
      expect(evaluateTransmission({
        destinationProviderId: 'mm_backend',
        fieldKeys: ['playback.volume_percent'],
        purpose: 'sync_user_volume',
      }).allowed).toBe(true);

      withdrawConsent('sync_user_volume');

      expect(evaluateTransmission({
        destinationProviderId: 'mm_backend',
        fieldKeys: ['playback.volume_percent'],
        purpose: 'sync_user_volume',
      }).allowed).toBe(false);
    });
  });

  describe('Unclassified Fields', () => {
    it('blocks unregistered fields by default as unreviewed privacy risks', () => {
      const evaluation = evaluateTransmission({
        destinationProviderId: 'mm_backend',
        fieldKeys: ['unclassified.unknown_telemetry_metric'],
      });

      expect(evaluation.allowed).toBe(false);
      expect(evaluation.blockedFields).toContain('unclassified.unknown_telemetry_metric');
    });
  });

  describe('Payload Sanitization', () => {
    it('filters out sensitive or unconsented keys while preserving allowed keys', () => {
      recordConsent('store_prefs', 'GRANTED');

      const payload = {
        'system.app_version': '2.04.04.0',
        'system.health_status': 'OK',
        'camera.raw_frame': 'base64_raw_bytes...',
        'playback.volume_percent': 85,
        'unregistered.field': 'malicious_probe',
      };

      // Purpose grants 'store_prefs', so fields without matching purpose get stripped
      const sanitized = sanitizeTransmissionPayload(
        payload,
        'mm_backend',
        'store_prefs'
      );

      expect(sanitized['system.app_version']).toBe('2.04.04.0');
      expect(sanitized['system.health_status']).toBe('OK');
      expect(sanitized['camera.raw_frame']).toBeUndefined();
      expect(sanitized['unregistered.field']).toBeUndefined();
    });
  });

  describe('transmitSafely Wrapper', () => {
    it('executes the send function when checks pass', async () => {
      let executed = false;
      const result = await transmitSafely(
        {
          destinationProviderId: 'mm_backend',
          fieldKeys: ['system.app_version'],
        },
        async () => {
          executed = true;
          return { status: 200, ok: true };
        }
      );

      expect(executed).toBe(true);
      expect(result).toEqual({ status: 200, ok: true });
    });

    it('rejects without calling the send function when checks fail', async () => {
      let executed = false;
      await expect(
        transmitSafely(
          {
            destinationProviderId: 'mm_backend',
            fieldKeys: ['camera.raw_frame'],
          },
          async () => {
            executed = true;
            return { ok: true };
          }
        )
      ).rejects.toThrow(PrivacyViolationError);

      expect(executed).toBe(false);
    });
  });

  describe('Zero-PII Audit Logging', () => {
    it('records transmission attempts with field keys only and zero payload values', () => {
      evaluateTransmission({
        destinationProviderId: 'mm_backend',
        fieldKeys: ['system.app_version'],
      });

      const auditLog = getTransmissionAuditLog();
      expect(auditLog.length).toBe(1);
      expect(auditLog[0].destinationProviderId).toBe('mm_backend');
      expect(auditLog[0].allowed).toBe(true);
      expect(auditLog[0].allowedCount).toBe(1);
      expect(auditLog[0].blockedCount).toBe(0);

      // Verify no PII is stored
      expect(auditLog[0]).not.toHaveProperty('payload');
      expect(auditLog[0]).not.toHaveProperty('userId');
    });
  });
});
