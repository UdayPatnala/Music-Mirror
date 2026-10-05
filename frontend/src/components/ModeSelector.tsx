import { useState, useEffect } from 'react';
import {
  appVersionInfo,
  deploymentUrls,
  setApplicationMode,
  subscribeToModeChange,
  type AppMode,
} from '../config/appVersionInfo';

/**
 * ModeSelector — Minimal, zero-emoji application mode switcher.
 *
 * Allows users and developers to switch between:
 *   - BASELINE MODE: Original April 10, 2026 V1 production baseline
 *   - DEVELOPER MODE: Active V2 headless core development preview
 *
 * Supports single-domain in-app switching and cross-deployment navigation.
 */
export default function ModeSelector() {
  const [currentMode, setCurrentMode] = useState<AppMode>(appVersionInfo.mode);
  const isBaseline = currentMode === 'BASELINE';

  useEffect(() => {
    return subscribeToModeChange((newMode) => {
      setCurrentMode(newMode);
    });
  }, []);

  const handleSelectMode = (e: React.MouseEvent, targetMode: AppMode) => {
    e.preventDefault();
    if (currentMode === targetMode) return;
    setApplicationMode(targetMode);
  };

  return (
    <div className="mm-mode-selector" role="radiogroup" aria-label="Application Mode">
      <a
        href={isBaseline ? '#' : `${deploymentUrls.baselineUrl}?mode=baseline`}
        onClick={(e) => handleSelectMode(e, 'BASELINE')}
        className={`mm-mode-btn ${isBaseline ? 'active' : ''}`}
        role="radio"
        aria-checked={isBaseline}
        title="Emotune V1 — Facial Emotion-Based Music Recommendation System"
      >
        Emotune
      </a>
      <a
        href={!isBaseline ? '#' : `${deploymentUrls.developerUrl}?mode=developer`}
        onClick={(e) => handleSelectMode(e, 'DEVELOPER')}
        className={`mm-mode-btn ${!isBaseline ? 'active' : ''}`}
        role="radio"
        aria-checked={!isBaseline}
        title="Emoflow V2 — Adaptive Emotion-Aware Music Discovery & Playback System"
      >
        Emoflow
      </a>
    </div>
  );
}

