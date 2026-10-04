import { appVersionInfo, validateVersionIntegrity } from '../config/appVersionInfo';

/**
 * VersionPanel — User-facing version information display.
 *
 * Shows:
 *   - Initial Version (always V1, April 10 2026)
 *   - Current Version (V2 in developer mode, V1 in baseline production)
 *   - Mode (Baseline / Developer)
 *   - Status (Stable / In Development)
 *   - Compact version history
 *   - Developer metadata (git branch, semver, build) in a collapsible section
 *
 * This component is intentionally minimal.
 * It does not contain animations, decorative elements, or emojis.
 * It is designed to live inside the Diagnostics drawer.
 */
export default function VersionPanel() {
  const { mode, initialVersion, currentVersion, versionHistory, internal } = appVersionInfo;
  const { warnings } = validateVersionIntegrity();

  const modeLabel = mode === 'BASELINE' ? 'Baseline' : 'Developer';
  const statusLabel =
    currentVersion.status === 'STABLE' ? 'Stable' :
    currentVersion.status === 'DEPRECATED' ? 'Deprecated' :
    'In Development';

  return (
    <div className="mm-version-panel" role="region" aria-label="Version Information">
      <div className="mm-version-header">
        <span className="mm-version-badge">
          {currentVersion.label} · {modeLabel}
        </span>
      </div>

      <div className="mm-version-grid">
        <div className="mm-version-item">
          <span className="mm-label">Initial Version</span>
          <span className="mm-version-value">
            {initialVersion.label} &mdash;{' '}
            {new Date(initialVersion.releaseDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <span className="mm-version-desc">{initialVersion.description}</span>
        </div>

        <div className="mm-version-item">
          <span className="mm-label">Current Version</span>
          <span className="mm-version-value">{currentVersion.label}</span>
          <span className="mm-version-desc">{currentVersion.description}</span>
        </div>

        <div className="mm-version-item">
          <span className="mm-label">Mode</span>
          <span className="mm-version-value">{modeLabel}</span>
        </div>

        <div className="mm-version-item">
          <span className="mm-label">Status</span>
          <span className="mm-version-value">{statusLabel}</span>
        </div>
      </div>

      {/* Version History — compact */}
      <details className="mm-version-history">
        <summary>Version History</summary>
        <div className="mm-version-history-list">
          {versionHistory.map(v => (
            <div
              key={v.label}
              className={`mm-version-history-item${v.isCurrent ? ' current' : ''}`}
            >
              <span className="mm-version-history-label">{v.label}</span>
              <span className="mm-version-history-date">
                {new Date(v.releaseDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                })}
              </span>
              <span className="mm-version-history-desc">{v.description}</span>
              <span className={`mm-version-history-status ${v.status.toLowerCase()}`}>
                {v.status === 'STABLE' ? 'Stable' :
                 v.status === 'DEPRECATED' ? 'Deprecated' :
                 'In Development'}
              </span>
            </div>
          ))}
        </div>
      </details>

      {/* Developer metadata — collapsible, not shown in normal use */}
      <details className="mm-version-dev-meta">
        <summary>Developer Info</summary>
        <div className="mm-version-dev-grid">
          <span className="mm-label">Semver</span>
          <span>{internal.semver}</span>
          <span className="mm-label">Branch</span>
          <span>{internal.gitBranch}</span>
          <span className="mm-label">Environment</span>
          <span>{internal.environment}</span>
          <span className="mm-label">Build</span>
          <span>{internal.buildTimestamp || 'local'}</span>
        </div>
      </details>

      {warnings.length > 0 && (
        <div className="mm-version-warnings" role="alert">
          {warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}
    </div>
  );
}
