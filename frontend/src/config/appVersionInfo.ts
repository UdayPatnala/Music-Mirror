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
  /** Brand identity name: 'Emotune' | 'Emoflow' */
  name: string;
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

export interface AppDeploymentUrls {
  baselineUrl: string;
  developerUrl: string;
}

export const deploymentUrls: AppDeploymentUrls = {
  baselineUrl: (import.meta.env?.VITE_BASELINE_URL as string | undefined) || 'https://music-mirror-aos.vercel.app',
  developerUrl: (import.meta.env?.VITE_DEVELOPER_URL as string | undefined) || (typeof window !== 'undefined' ? window.location.origin : 'https://music-mirror-dev.vercel.app'),
};

export interface AppVersionInfo {
  // ── User-facing ───────────────────────────────────────────────────────
  mode: AppMode;
  initialVersion: VersionRecord;
  currentVersion: VersionRecord;
  /** Full ordered history from first to current release */
  versionHistory: VersionRecord[];
  /** Authoritative cross-deployment target URLs */
  deploymentUrls: AppDeploymentUrls;

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
  // Check URL query parameter first if in browser
  if (typeof window !== 'undefined' && window.location?.search) {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode')?.toUpperCase();
    if (modeParam === 'BASELINE') return 'BASELINE';
    if (modeParam === 'DEVELOPER') return 'DEVELOPER';
  }

  const envMode = (import.meta.env?.VITE_APP_MODE as string | undefined);
  if (envMode === 'BASELINE') return 'BASELINE';
  if (envMode === 'DEVELOPER') return 'DEVELOPER';

  // In production browser without explicit mode parameter, default to BASELINE per specification
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    if (host.includes('music-mirror-aos.vercel.app')) {
      return 'BASELINE';
    }
  }

  return 'DEVELOPER';
}

// ─── Canonical version records ────────────────────────────────────────────────

const V1_RECORD: VersionRecord = {
  label: 'V1',
  name: 'Emotune',
  releaseDate: '2026-04-10',
  status: 'STABLE',
  description: 'Emotune — Facial Emotion-Based Music Recommendation System',
  isInitial: true,
  isCurrent: false,
};

const V2_RECORD: VersionRecord = {
  label: 'V2',
  name: 'Emoflow',
  releaseDate: '2026-09-19',
  status: 'DEVELOPMENT',
  description: 'Emoflow — Adaptive Emotion-Aware Music Discovery & Playback System',
  isInitial: false,
  isCurrent: true,
};

// ─── Reactive mode subscription ───────────────────────────────────────────────

type ModeChangeListener = (mode: AppMode) => void;
const modeListeners = new Set<ModeChangeListener>();

export function subscribeToModeChange(listener: ModeChangeListener): () => void {
  modeListeners.add(listener);
  return () => {
    modeListeners.delete(listener);
  };
}

export function setApplicationMode(newMode: AppMode): void {
  appVersionInfo.mode = newMode;
  appVersionInfo.currentVersion = newMode === 'BASELINE' ? { ...V1_RECORD, isCurrent: true } : { ...V2_RECORD, isCurrent: true };
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', newMode.toLowerCase());
    window.history.pushState({}, '', url.toString());
    document.title = newMode === 'BASELINE' ? 'Emotune — Facial Emotion Music Recommender' : 'Emoflow — Adaptive Music Intelligence';
  }
  modeListeners.forEach(listener => listener(newMode));
}

// ─── Exported singleton ───────────────────────────────────────────────────────

const _mode = resolveMode();

export const appVersionInfo: AppVersionInfo = {
  mode: _mode,
  initialVersion: V1_RECORD,
  currentVersion: _mode === 'BASELINE' ? { ...V1_RECORD, isCurrent: true } : { ...V2_RECORD, isCurrent: true },
  versionHistory: [V1_RECORD, V2_RECORD],
  deploymentUrls,
  internal: {
    semver: (import.meta.env?.VITE_APP_SEMVER as string | undefined) ?? '2.06.06.0',
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

/**
 * Returns the active runtime application mode ('BASELINE' | 'DEVELOPER').
 * Single authoritative source of truth.
 */
export function getApplicationMode(): AppMode {
  return appVersionInfo.mode;
}

/**
 * Returns the active runtime application version label ('V1' | 'V2' | ...).
 * Single authoritative source of truth.
 */
export function getApplicationVersion(): string {
  return appVersionInfo.currentVersion.label;
}

