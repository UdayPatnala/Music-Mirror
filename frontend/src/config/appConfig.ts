/**
 * MusicMirror Centralized Application Configuration
 * Zero Exposed Secrets | Environment-Aware Settings
 */

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  appName: string;
  version: string;
  apiBaseUrl: string;
  emotionInference: {
    minConfidenceThreshold: number;
    temporalWindowSize: number;
    sampleIntervalMs: number;
    emaSmoothingFactor: number;
    modelPath: string;
  };
  playback: {
    defaultVolume: number;
    autoPlay: boolean;
    crossfadeDurationMs: number;
  };
  preferences: {
    defaultLanguages: string[];
    defaultGenres: string[];
  };
  providers: {
    primary: 'youtube' | 'jamendo' | 'fallback';
    enableFallbackOnFailure: boolean;
  };
}

const getEnv = (): 'development' | 'production' | 'test' => {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return 'test';
  }
  return import.meta.env?.MODE === 'production' ? 'production' : 'development';
};

export const appConfig: AppConfig = {
  env: getEnv(),
  appName: 'MusicMirror',
  version: '2.0.0',
  apiBaseUrl: import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000',
  emotionInference: {
    minConfidenceThreshold: 0.60,
    temporalWindowSize: 10,
    sampleIntervalMs: 200,
    emaSmoothingFactor: 0.25,
    modelPath: '/models',
  },
  playback: {
    defaultVolume: 0.8,
    autoPlay: true,
    crossfadeDurationMs: 1000,
  },
  preferences: {
    defaultLanguages: ['Telugu', 'English', 'Tamil', 'Hindi'],
    defaultGenres: ['Pop', 'Melody', 'Synthpop', 'Ballad', 'Ambient'],
  },
  providers: {
    primary: 'youtube',
    enableFallbackOnFailure: true,
  },
};

export function validateAppConfig(): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!import.meta.env?.VITE_JAMENDO_CLIENT_ID) {
    warnings.push('VITE_JAMENDO_CLIENT_ID is unset. Using default public Jamendo client ID.');
  }
  if (!import.meta.env?.VITE_API_BASE_URL && appConfig.env === 'production') {
    warnings.push('VITE_API_BASE_URL is unset in production mode. Defaulting to localhost:8000.');
  }
  return { isValid: true, warnings };
}
