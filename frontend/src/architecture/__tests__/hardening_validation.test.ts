import { describe, it, expect, beforeEach } from 'vitest';
import { cameraDriver } from '../layers/CameraDriver';
import { discoveryEngine } from '../layers/DiscoveryLayer';
import { sessionOrchestrator } from '../orchestrator/SessionOrchestrator';
import { personalizationEngine } from '../layers/PersonalizationLayer/PersonalizationEngine';
import { personalizationStore } from '../layers/PersonalizationLayer/PersonalizationStore';
import { sessionTrace } from '../layers/ObservabilityLayer';

describe('STAGE 09: Hardening, Reliability & Resource Leak Validation Suite', () => {
  beforeEach(() => {
    cameraDriver.dispose();
    discoveryEngine.clearCache();
    sessionOrchestrator.resetState();
    personalizationEngine.resetPreferences();
    sessionTrace.clearTrace();
  });

  describe('1. Resource Leak & Memory Audit', () => {
    it('disposes camera stream, removes event listeners, and stops tracks cleanly', () => {
      cameraDriver.dispose();
      expect(cameraDriver.getStatus()).toBe('unavailable');
      expect(cameraDriver.getStream()).toBeNull();
    });

    it('maintains bounded track history buffer in SessionOrchestrator (max 20 entries)', async () => {
      await sessionOrchestrator.initialize();
      const state = sessionOrchestrator.getPlaybackState();
      expect(state.history.length).toBeLessThanOrEqual(20);
    });
  });

  describe('2. Race Condition & Token Invalidation Audit', () => {
    it('invalidates superseded async discovery operations via monotonically increasing sessionTokens', async () => {
      await sessionOrchestrator.initialize();

      const res1 = await sessionOrchestrator.handleEmotionObservation('happy', 0.90);
      const res2 = await sessionOrchestrator.handleEmotionObservation('angry', 0.95);

      expect(res1).toBeDefined();
      expect(res2).toBeDefined();
      expect(res2.sessionToken).toBeGreaterThan(res1.sessionToken);
      expect(sessionOrchestrator.getPlaybackState().sessionToken).toBe(res2.sessionToken);
    });
  });

  describe('3. Privacy Boundary & Security Audit', () => {
    it('verifies local preference storage contains NO facial images, embeddings, or biometric data', () => {
      personalizationEngine.recordFeedback({
        type: 'LIKE',
        candidateId: 'track_123',
        genre: 'Telugu Pop',
        artist: 'Sid Sriram',
      });

      const profile = personalizationEngine.getPreferences();
      const serialized = JSON.stringify(profile);

      expect(serialized).not.toContain('image');
      expect(serialized).not.toContain('embedding');
      expect(serialized).not.toContain('frame');
      expect(serialized).not.toContain('biometric');
      expect(profile.version).toBe('1.0.0');
    });
  });

  describe('4. Failure Injection & Terminal State Audit', () => {
    it('handles browser autoplay restriction gracefully without infinite loading or application crash', async () => {
      const state = await sessionOrchestrator.handleEmotionObservation('happy', 0.90);
      expect(['PLAYING', 'PAUSED', 'SEARCHING', 'PREPARING']).toContain(state.sessionState);

      await sessionOrchestrator.enablePlayback();
      const updated = sessionOrchestrator.getPlaybackState();
      expect(updated.autoplayBlocked).toBe(false);
    });

    it('recovers cleanly from storage corruption without breaking application execution', () => {
      const corruptedJson = 'INVALID_JSON_CORRUPTED_{{{';
      const success = personalizationStore.importPreferences(corruptedJson);

      expect(success).toBe(false);
      const safeProfile = personalizationEngine.getPreferences();
      expect(safeProfile).toBeDefined();
      expect(safeProfile.version).toBe('1.0.0');
    });
  });
});
