/**
 * Music Mirror — Core Single-Page System Shell
 * Functional baseline: renders MusicMirrorCorePage with resilient Error Boundary.
 */

import React, { Component, useState, useEffect } from 'react';
import MusicMirrorCorePage from './pages/MusicMirrorCorePage';
import BaselineV1Page from './pages/BaselineV1Page';
import { appVersionInfo, subscribeToModeChange, type AppMode } from './config/appVersionInfo';

interface EBProps {
  children: React.ReactNode;
}

interface EBState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Music Mirror Unhandled Runtime Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', fontFamily: 'monospace', maxWidth: '600px', margin: '40px auto', border: '2px solid red', background: '#FFF' }}>
          <h2 style={{ color: 'red', marginTop: 0 }}>Music Mirror Core Exception</h2>
          <p>An unexpected error occurred during execution:</p>
          <pre style={{ background: '#F8D7DA', padding: '12px', overflowX: 'auto', fontSize: '12px' }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{ padding: '8px 16px', background: '#222', color: '#FFF', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Restart Engine Session
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>(appVersionInfo.mode);

  useEffect(() => {
    document.title = currentMode === 'BASELINE' ? 'Music Mirror — Baseline' : 'Music Mirror — Developer';

    const unsubscribe = subscribeToModeChange((newMode) => {
      setCurrentMode(newMode);
    });
    return unsubscribe;
  }, [currentMode]);

  return (
    <ErrorBoundary>
      <div className="music-mirror-core-shell">
        {currentMode === 'BASELINE' ? (
          <BaselineV1Page />
        ) : (
          <MusicMirrorCorePage />
        )}
      </div>
    </ErrorBoundary>
  );
}

