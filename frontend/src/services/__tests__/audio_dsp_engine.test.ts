import { describe, it, expect, beforeEach } from 'vitest';
import { AudioDspEngine } from '../AudioDspEngine';

describe('AudioDspEngine (Real-Time FFT & Spectral Analysis)', () => {
  let dsp: AudioDspEngine;

  beforeEach(() => {
    dsp = AudioDspEngine.getInstance();
  });

  it('provides a singleton instance', () => {
    const instance1 = AudioDspEngine.getInstance();
    const instance2 = AudioDspEngine.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('checks Web Audio API environment support', () => {
    const supported = dsp.isSupported();
    expect(typeof supported).toBe('boolean');
  });

  describe('RMS Energy Calculation', () => {
    it('returns 0 for empty or null time-domain buffer', () => {
      expect(dsp.computeRMS(new Float32Array(0))).toBe(0);
    });

    it('accurately calculates RMS energy for constant signal', () => {
      const buffer = new Float32Array(100).fill(0.5);
      const rms = dsp.computeRMS(buffer);
      expect(rms).toBeCloseTo(0.5, 4);
    });

    it('calculates RMS energy for alternating signal', () => {
      const buffer = new Float32Array([1, -1, 1, -1]);
      const rms = dsp.computeRMS(buffer);
      expect(rms).toBe(1.0);
    });
  });

  describe('Spectral Centroid (Perceived Timbre Brightness)', () => {
    it('returns 0 for silence / null frequency data', () => {
      expect(dsp.computeSpectralCentroid(new Float32Array(0))).toBe(0);
    });

    it('evaluates higher centroid for high-frequency energy compared to low-frequency energy', () => {
      const lowFreqSpectrum = new Float32Array(512).fill(-100);
      lowFreqSpectrum[2] = 0; // Low frequency peak (~86 Hz)

      const highFreqSpectrum = new Float32Array(512).fill(-100);
      highFreqSpectrum[100] = 0; // High frequency peak (~4300 Hz)

      const lowCentroid = dsp.computeSpectralCentroid(lowFreqSpectrum, 44100);
      const highCentroid = dsp.computeSpectralCentroid(highFreqSpectrum, 44100);

      expect(highCentroid).toBeGreaterThan(lowCentroid);
    });
  });

  describe('Spectral Flatness (Wiener Entropy)', () => {
    it('returns 0 for empty frequency buffer', () => {
      expect(dsp.computeSpectralFlatness(new Float32Array(0))).toBe(0);
    });

    it('returns low flatness for tonal/harmonic spectrum and higher for uniform spectrum', () => {
      // Pure tone: single sharp peak, rest silence
      const tonalSpectrum = new Float32Array(256).fill(-100);
      tonalSpectrum[10] = 0;

      // Uniform white noise spectrum: flat across all bins
      const noiseSpectrum = new Float32Array(256).fill(-10);

      const tonalFlatness = dsp.computeSpectralFlatness(tonalSpectrum);
      const noiseFlatness = dsp.computeSpectralFlatness(noiseSpectrum);

      expect(noiseFlatness).toBeGreaterThan(tonalFlatness);
      expect(noiseFlatness).toBeCloseTo(1.0, 1);
    });
  });

  describe('Spectral Rolloff', () => {
    it('computes 85% energy frequency cutoff accurately', () => {
      const spectrum = new Float32Array(512).fill(-100);
      spectrum[10] = 0; // Energy concentrated around bin 10

      const rolloff = dsp.computeSpectralRolloff(spectrum, 44100, 0.85);
      const binWidth = 44100 / (2 * 512);

      expect(rolloff).toBeCloseTo(10 * binWidth, 0);
    });
  });

  describe('7-Band Acoustic Frequency Decomposition', () => {
    it('decomposes spectrum into 7 non-negative frequency bands', () => {
      const spectrum = new Float32Array(512).fill(-20);
      const bands = dsp.computeBands(spectrum, 44100);

      expect(bands).toHaveProperty('subBass');
      expect(bands).toHaveProperty('bass');
      expect(bands).toHaveProperty('lowMid');
      expect(bands).toHaveProperty('mid');
      expect(bands).toHaveProperty('highMid');
      expect(bands).toHaveProperty('presence');
      expect(bands).toHaveProperty('brilliance');

      expect(bands.subBass).toBeGreaterThan(0);
      expect(bands.mid).toBeGreaterThan(0);
      expect(bands.brilliance).toBeGreaterThan(0);
    });
  });

  describe('Acoustic Frame Analysis & Onset Detection', () => {
    it('analyzes custom frame buffers and outputs complete AcousticFeatures', () => {
      const timeDomain = new Float32Array(256).fill(0.3);
      const frequency = new Float32Array(256).fill(-30);

      const features = dsp.analyzeFrame(timeDomain, frequency);

      expect(features.rmsEnergy).toBeCloseTo(0.3, 2);
      expect(features.peakEnergy).toBeCloseTo(0.3, 2);
      expect(features.spectralCentroidHz).toBeGreaterThan(0);
      expect(features.bands).toBeDefined();
      expect(typeof features.isOnset).toBe('boolean');
      expect(features.timestamp).toBeGreaterThan(0);
    });

    it('detects dynamic onset beat when energy jumps sharply', () => {
      // Quiet frame
      dsp.analyzeFrame(new Float32Array(256).fill(0.05), new Float32Array(256).fill(-60));

      // Loud transient burst frame (delta > 0.15)
      const burstFeatures = dsp.analyzeFrame(
        new Float32Array(256).fill(0.8),
        new Float32Array(256).fill(-10)
      );

      expect(burstFeatures.isOnset).toBe(true);
    });
  });

  describe('Acoustic Metadata Validation', () => {
    it('validates audio when measured energy aligns within tolerance of expected track energy', () => {
      const features = dsp.analyzeFrame(
        new Float32Array(256).fill(0.6),
        new Float32Array(256).fill(-20)
      );

      const result = dsp.validateAcoustics(0.65, features);
      expect(result.isValid).toBe(true);
      expect(result.divergence).toBeLessThanOrEqual(0.40);
    });

    it('flags divergence when audio energy deviates significantly from expected track energy', () => {
      const features = dsp.analyzeFrame(
        new Float32Array(256).fill(0.1),
        new Float32Array(256).fill(-80)
      );

      // Expected high-energy track (0.85) vs measured 0.10
      const result = dsp.validateAcoustics(0.85, features);
      expect(result.isValid).toBe(false);
      expect(result.divergence).toBeGreaterThan(0.40);
    });

    it('determines brightness profile correctly based on spectral centroid', () => {
      const darkFeatures = {
        ...dsp.analyzeFrame(new Float32Array(100), new Float32Array(100)),
        spectralCentroidHz: 800,
      };
      expect(dsp.validateAcoustics(0.5, darkFeatures).brightnessProfile).toBe('dark');

      const brightFeatures = {
        ...dsp.analyzeFrame(new Float32Array(100), new Float32Array(100)),
        spectralCentroidHz: 5500,
      };
      expect(dsp.validateAcoustics(0.5, brightFeatures).brightnessProfile).toBe('bright');
    });
  });
});
