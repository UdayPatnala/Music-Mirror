import { describe, it, expect } from 'vitest';
import { appVersionInfo, validateVersionIntegrity, getApplicationMode, getApplicationVersion } from '../appVersionInfo';
import type { AppMode, VersionStatus } from '../appVersionInfo';

describe('AppVersionInfo — data model', () => {
  it('exports a valid AppVersionInfo object', () => {
    expect(appVersionInfo).toBeDefined();
    expect(appVersionInfo.mode).toBeDefined();
    expect(appVersionInfo.initialVersion).toBeDefined();
    expect(appVersionInfo.currentVersion).toBeDefined();
    expect(appVersionInfo.versionHistory).toBeDefined();
    expect(appVersionInfo.internal).toBeDefined();
  });

  it('has V1 as the initial version with correct metadata', () => {
    const v1 = appVersionInfo.initialVersion;
    expect(v1.label).toBe('V1');
    expect(v1.isInitial).toBe(true);
    expect(v1.releaseDate).toBe('2026-04-10');
    expect(v1.status).toBe<VersionStatus>('STABLE');
    expect(v1.description.length).toBeGreaterThan(5);
  });

  it('has V2 as the current version', () => {
    const v2 = appVersionInfo.currentVersion;
    expect(v2.label).toBe('V2');
    expect(v2.isCurrent).toBe(true);
    expect(v2.isInitial).toBe(false);
  });

  it('mode is a valid AppMode', () => {
    const validModes: AppMode[] = ['BASELINE', 'DEVELOPER'];
    expect(validModes).toContain(appVersionInfo.mode);
  });

  it('version history contains at least V1 and V2, in order', () => {
    const labels = appVersionInfo.versionHistory.map(v => v.label);
    expect(labels).toContain('V1');
    expect(labels).toContain('V2');
    const v1Index = labels.indexOf('V1');
    const v2Index = labels.indexOf('V2');
    expect(v1Index).toBeLessThan(v2Index);
  });

  it('exactly one version record has isInitial=true', () => {
    const initials = appVersionInfo.versionHistory.filter(v => v.isInitial);
    expect(initials).toHaveLength(1);
    expect(initials[0].label).toBe('V1');
  });

  it('exactly one version record has isCurrent=true', () => {
    const currents = appVersionInfo.versionHistory.filter(v => v.isCurrent);
    expect(currents).toHaveLength(1);
  });

  it('internal semver is present and non-empty', () => {
    expect(appVersionInfo.internal.semver).toBeTruthy();
    expect(typeof appVersionInfo.internal.semver).toBe('string');
  });

  it('internal gitBranch is a string', () => {
    expect(typeof appVersionInfo.internal.gitBranch).toBe('string');
  });
});

describe('validateVersionIntegrity', () => {
  it('returns an object with valid:boolean and warnings:string[]', () => {
    const result = validateVersionIntegrity();
    expect(typeof result.valid).toBe('boolean');
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('returns valid:true in normal DEVELOPER+V2 mode (test environment)', () => {
    // In Vitest (no VITE_APP_MODE set), mode resolves to DEVELOPER and currentVersion is V2
    const result = validateVersionIntegrity();
    // DEVELOPER + V2 is a valid combination — no warnings expected
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });
});

describe('getApplicationMode & getApplicationVersion helpers', () => {
  it('getApplicationMode returns the active mode', () => {
    expect(['BASELINE', 'DEVELOPER']).toContain(getApplicationMode());
  });

  it('getApplicationVersion returns the current version label', () => {
    expect(getApplicationVersion()).toBe('V2');
  });
});

