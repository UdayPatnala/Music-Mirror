/**
 * AppVersionInfo — Single Authoritative Version & Mode Data Model
 *
 * User-facing version information is separated from developer/diagnostic metadata.
 * Mode is determined by deployment (VITE_APP_MODE environment variable), not by user toggle.
 *
 * Production (v1-production branch):  VITE_APP_MODE=BASELINE  → mode: 'BASELINE'
 * Preview/dev (main branch):          VITE_APP_MODE=DEVELOPER → mode: 'DEVELOPER'
 * Fallback:                           inferred from import.meta.env.MODE
 *
 * Usage:
 *   import { appVersionInfo } from '../config/appVersionInfo';
 *   appVersionInfo.mode            // 'BASELINE' | 'DEVELOPER'
 *   appVersionInfo.currentVersion  // VersionRecord
 *   appVersionInfo.initialVersion  // VersionRecord (always V1)
 */

export type AppMode = 'BASELINE' | 'DEVELOPER';
export type VersionStatus = 'STABLE' | 'DEVELOPMENT' | 'DEPRECATED';

export interface VersionRecord {
  /** Short label: 'V1', 'V2', 'V3' */
  label: string;
  /** ISO date string: '2026-04-10' */
  releaseDate: string;
  status: VersionStatus;
  /** One-line description shown to users */
  description: string;
  /** True only for the original first public release */
  isInitial: boolean;
  /** True only for the version currently running */
  isCurrent: boolean;
}

export interface AppVersionInfo {
  // ── User-facing ───────────────────────────────────────────────────────
  mode: AppMode;
  initialVersion: VersionRecord;
  currentVersion: VersionRecord;
  /** Full ordered history from first to current release */
  versionHistory: VersionRecord[];

  // ── Developer-facing (not shown in normal UI) ──────────────────────────
  internal: {
    /** 4-tier semver: '2.06.05.0' */
    semver: string;
    gitBranch: string;
    buildTimestamp: string;
    environment: string;
  };
}

// ─── Mode resolution ─────────────────────────────────────────────────────────

function resolveMode(): AppMode {
  const envMode = (import.meta.env?.VITE_APP_MODE as string | undefined);
  if (envMode === 'BASELINE') return 'BASELINE';
  if (envMode === 'DEVELOPER') return 'DEVELOPER';
  // Fallback: production Vite builds default to BASELINE; dev server to DEVELOPER
  return import.meta.env?.MODE === 'production' ? 'BASELINE' : 'DEVELOPER';
}

// ─── Canonical version records ────────────────────────────────────────────────

const V1_RECORD: VersionRecord = {
  label: 'V1',
  releaseDate: '2026-04-10',
  status: 'STABLE',
  description: 'Original Baseline — B.Tech CSE Final Year Project Academic Submission',
  isInitial: true,
  isCurrent: false,
};

const V2_RECORD: VersionRecord = {
  label: 'V2',
  releaseDate: '2026-09-19',
  status: 'DEVELOPMENT',
  description: 'Developer Mode — Headless Core, Multi-Provider Architecture, Acoustic DSP',
  isInitial: false,
  isCurrent: true,
};

// ─── Exported singleton ───────────────────────────────────────────────────────

const _mode = resolveMode();

export const appVersionInfo: AppVersionInfo = {
  mode: _mode,
  initialVersion: V1_RECORD,
  currentVersion: V2_RECORD,
  versionHistory: [V1_RECORD, V2_RECORD],
  internal: {
    semver: (import.meta.env?.VITE_APP_SEMVER as string | undefined) ?? '2.06.05.1',
    gitBranch: (import.meta.env?.VITE_GIT_BRANCH as string | undefined) ?? 'main',
    buildTimestamp: (import.meta.env?.VITE_BUILD_TIMESTAMP as string | undefined) ?? '',
    environment: (import.meta.env?.MODE as string | undefined) ?? 'development',
  },
};

// ─── Integrity validation ─────────────────────────────────────────────────────

/**
 * Validates that mode/version combination is consistent.
 * Call at startup to detect deployment misconfiguration.
 *
 * Valid combinations:
 *   BASELINE + V1 (STABLE)   → production serving original baseline
 *   DEVELOPER + V2+ (any)    → development/preview serving current work
 *
 * Invalid (misconfiguration):
 *   BASELINE + V2 (any)      → wrong branch serving wrong mode
 *   DEVELOPER + V1 (STABLE)  → V1 source running as developer mode
 */
export function validateVersionIntegrity(): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (appVersionInfo.mode === 'BASELINE' && appVersionInfo.currentVersion.label !== 'V1') {
    warnings.push(
      `Mode is BASELINE but currentVersion is ${appVersionInfo.currentVersion.label} — expected V1. Check deployment branch configuration.`
    );
  }
  if (appVersionInfo.mode === 'DEVELOPER' && appVersionInfo.currentVersion.status === 'STABLE' && appVersionInfo.currentVersion.label === 'V1') {
    warnings.push(
      'Mode is DEVELOPER but currentVersion is V1 (STABLE) — V1 source should not run in developer mode.'
    );
  }

  return { valid: warnings.length === 0, warnings };
}
