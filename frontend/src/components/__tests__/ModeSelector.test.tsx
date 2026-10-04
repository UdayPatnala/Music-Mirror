import { describe, it, expect } from 'vitest';
import ModeSelector from '../ModeSelector';
import { deploymentUrls } from '../../config/appVersionInfo';

describe('ModeSelector Component', () => {
  it('renders ModeSelector component function', () => {
    expect(typeof ModeSelector).toBe('function');
  });

  it('exposes authoritative deploymentUrls with baseline and developer destinations', () => {
    expect(deploymentUrls.baselineUrl).toBeTruthy();
    expect(deploymentUrls.baselineUrl).toContain('music-mirror');
    expect(deploymentUrls.developerUrl).toBeTruthy();
  });
});
