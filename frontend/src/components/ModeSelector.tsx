import { appVersionInfo, deploymentUrls } from '../config/appVersionInfo';

/**
 * ModeSelector — Minimal, zero-emoji application mode switcher.
 *
 * Allows users and developers to switch between:
 *   - BASELINE MODE: Original April 10, 2026 V1 production deployment
 *   - DEVELOPER MODE: Active V2 headless core development preview
 *
 * Navigates across actual deployments using authoritative deployment URLs.
 */
export default function ModeSelector() {
  const currentMode = appVersionInfo.mode;
  const isBaseline = currentMode === 'BASELINE';

  return (
    <div className="mm-mode-selector" role="radiogroup" aria-label="Application Mode">
      <a
        href={isBaseline ? '#' : deploymentUrls.baselineUrl}
        onClick={(e) => {
          if (isBaseline) e.preventDefault();
        }}
        className={`mm-mode-btn ${isBaseline ? 'active' : ''}`}
        role="radio"
        aria-checked={isBaseline}
        title="V1 Baseline — Original April 10, 2026 Stable Reference"
      >
        Baseline
      </a>
      <a
        href={!isBaseline ? '#' : deploymentUrls.developerUrl}
        onClick={(e) => {
          if (!isBaseline) e.preventDefault();
        }}
        className={`mm-mode-btn ${!isBaseline ? 'active' : ''}`}
        role="radio"
        aria-checked={!isBaseline}
        title="V2 Developer — Active Development & Preview Build"
      >
        Developer
      </a>
    </div>
  );
}
