/**
 * Music Mirror — Acoustic Audio DSP & Real-Time FFT Spectral Analysis Engine
 * Version: 2.05.00.0
 *
 * Provides real-time acoustic signal processing, spectral decomposition,
 * and audio health/timbre verification without cosmetic canvas bloat.
 *
 * Mathematical operations:
 * - RMS Energy (Root-Mean-Square signal amplitude)
 * - Spectral Centroid (Timbre brightness indicator)
 * - Spectral Flatness (Wiener entropy / noisiness vs harmonic tonality)
 * - 7-Band Acoustic Frequency Partitioning
 * - Spectral Rolloff (85% energy distribution cutoff)
 * - Dynamic Onset Detection (transient energy spike)
 */

export interface SpectralBands {
  subBass: number;     // 20 - 60 Hz
  bass: number;        // 60 - 250 Hz
  lowMid: number;      // 250 - 500 Hz
  mid: number;         // 500 - 2000 Hz
  highMid: number;     // 2000 - 4000 Hz
  presence: number;    // 4000 - 6000 Hz
  brilliance: number;  // 6000 - 20000 Hz
}

export interface AcousticFeatures {
  rmsEnergy: number;          // 0.0 - 1.0 (loudness / dynamic intensity)
  peakEnergy: number;         // 0.0 - 1.0 (maximum amplitude peak)
  spectralCentroidHz: number; // Center of mass of spectrum (Hz)
  spectralFlatness: number;   // 0.0 (harmonic tone) to 1.0 (white noise)
  spectralRolloffHz: number;  // Frequency threshold enclosing 85% energy
  bands: SpectralBands;
  isOnset: boolean;           // Transient beat spike detected
  timestamp: number;
}

export interface AcousticValidationResult {
  isValid: boolean;
  measuredEnergy: number;
  expectedEnergy: number;
  divergence: number;
  brightnessProfile: 'dark' | 'balanced' | 'bright';
}

export class AudioDspEngine {
  private static _instance: AudioDspEngine | null = null;

  private _audioContext: AudioContext | null = null;
  private _analyserNode: AnalyserNode | null = null;
  private _sourceNode: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null = null;
  private _timeDomainBuffer: Float32Array | null = null;
  private _frequencyBuffer: Float32Array | null = null;
  private _previousEnergy = 0;
  private _fftSize = 2048;

  private constructor() {}

  public static getInstance(): AudioDspEngine {
    if (!AudioDspEngine._instance) {
      AudioDspEngine._instance = new AudioDspEngine();
    }
    return AudioDspEngine._instance;
  }

  /**
   * Check whether Web Audio API is supported in the current environment.
   */
  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      ('AudioContext' in window || 'webkitAudioContext' in window)
    );
  }

  /**
   * Initialize the AudioContext and AnalyserNode.
   */
  public initialize(customContext?: AudioContext): boolean {
    if (this._analyserNode && this._audioContext) {
      return true;
    }

    try {
      if (customContext) {
        this._audioContext = customContext;
      } else if (this.isSupported()) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this._audioContext = new AudioCtx();
      } else {
        return false;
      }

      this._analyserNode = this._audioContext.createAnalyser();
      this._analyserNode.fftSize = this._fftSize;
      this._analyserNode.smoothingTimeConstant = 0.8;

      this._timeDomainBuffer = new Float32Array(this._analyserNode.fftSize);
      this._frequencyBuffer = new Float32Array(this._analyserNode.frequencyBinCount);
      return true;
    } catch (err) {
      console.warn('[AudioDSP] Web Audio initialization failed:', err);
      return false;
    }
  }

  /**
   * Connect an HTML audio element to the DSP analyser.
   */
  public connectElement(element: HTMLMediaElement): boolean {
    if (!this.initialize() || !this._audioContext || !this._analyserNode) {
      return false;
    }

    try {
      if (this._sourceNode) {
        this._sourceNode.disconnect();
      }
      this._sourceNode = this._audioContext.createMediaElementSource(element);
      this._sourceNode.connect(this._analyserNode);
      this._analyserNode.connect(this._audioContext.destination);
      return true;
    } catch (err) {
      console.warn('[AudioDSP] Element connection failed:', err);
      return false;
    }
  }

  /**
   * Disconnect any attached source node.
   */
  public disconnect(): void {
    if (this._sourceNode) {
      try {
        this._sourceNode.disconnect();
      } catch {}
      this._sourceNode = null;
    }
  }

  /**
   * Calculate Root Mean Square (RMS) energy from time-domain float waveform [-1.0, 1.0].
   */
  public computeRMS(timeDomain: Float32Array): number {
    if (!timeDomain || timeDomain.length === 0) return 0;

    let sumSquares = 0;
    for (let i = 0; i < timeDomain.length; i++) {
      const sample = timeDomain[i];
      sumSquares += sample * sample;
    }

    const rms = Math.sqrt(sumSquares / timeDomain.length);
    return Math.min(1.0, Math.max(0.0, rms));
  }

  /**
   * Calculate Spectral Centroid (perceived brightness / center of spectral mass in Hz).
   */
  public computeSpectralCentroid(frequencyData: Float32Array, sampleRate = 44100): number {
    if (!frequencyData || frequencyData.length === 0) return 0;

    const binWidth = sampleRate / (2 * frequencyData.length);
    let weightedSum = 0;
    let totalMagnitude = 0;

    for (let i = 0; i < frequencyData.length; i++) {
      // Frequency data from getFloatFrequencyData is in dBFS (-100 to 0) or linear if custom
      // Convert dBFS to linear magnitude: 10^(dB/20)
      const db = frequencyData[i];
      const magnitude = db > -120 ? Math.pow(10, db / 20) : 0;
      const freq = i * binWidth;

      weightedSum += freq * magnitude;
      totalMagnitude += magnitude;
    }

    return totalMagnitude > 0 ? weightedSum / totalMagnitude : 0;
  }

  /**
   * Calculate Spectral Flatness (Wiener entropy: geometric mean / arithmetic mean).
   * Measures noisiness vs harmonic tonality (0 = pure tone, 1 = white noise).
   */
  public computeSpectralFlatness(frequencyData: Float32Array): number {
    if (!frequencyData || frequencyData.length === 0) return 0;

    let logSum = 0;
    let sum = 0;
    let count = 0;

    for (let i = 0; i < frequencyData.length; i++) {
      const db = frequencyData[i];
      const magnitude = db > -120 ? Math.pow(10, db / 20) : 1e-6;

      logSum += Math.log(magnitude + 1e-12);
      sum += magnitude;
      count++;
    }

    if (count === 0 || sum === 0) return 0;

    const geometricMean = Math.exp(logSum / count);
    const arithmeticMean = sum / count;

    const flatness = geometricMean / arithmeticMean;
    return Math.min(1.0, Math.max(0.0, isNaN(flatness) ? 0 : flatness));
  }

  /**
   * Calculate Spectral Rolloff (frequency in Hz below which 85% of energy is concentrated).
   */
  public computeSpectralRolloff(
    frequencyData: Float32Array,
    sampleRate = 44100,
    cutoffRatio = 0.85
  ): number {
    if (!frequencyData || frequencyData.length === 0) return 0;

    const binWidth = sampleRate / (2 * frequencyData.length);
    let totalEnergy = 0;
    const energyArray = new Float32Array(frequencyData.length);

    for (let i = 0; i < frequencyData.length; i++) {
      const db = frequencyData[i];
      const magnitude = db > -120 ? Math.pow(10, db / 20) : 0;
      const energy = magnitude * magnitude;
      energyArray[i] = energy;
      totalEnergy += energy;
    }

    if (totalEnergy === 0) return 0;

    const threshold = totalEnergy * cutoffRatio;
    let cumulativeEnergy = 0;

    for (let i = 0; i < energyArray.length; i++) {
      cumulativeEnergy += energyArray[i];
      if (cumulativeEnergy >= threshold) {
        return i * binWidth;
      }
    }

    return (frequencyData.length - 1) * binWidth;
  }

  /**
   * Decompose frequency spectrum into 7 standard acoustic bands.
   */
  public computeBands(frequencyData: Float32Array, sampleRate = 44100): SpectralBands {
    const binWidth = sampleRate / (2 * (frequencyData?.length || 1024));

    const bandLimits = {
      subBass: [20, 60],
      bass: [60, 250],
      lowMid: [250, 500],
      mid: [500, 2000],
      highMid: [2000, 4000],
      presence: [4000, 6000],
      brilliance: [6000, 20000],
    };

    const computeBandEnergy = (minHz: number, maxHz: number): number => {
      if (!frequencyData || frequencyData.length === 0) return 0;

      const startBin = Math.max(0, Math.floor(minHz / binWidth));
      const endBin = Math.min(frequencyData.length - 1, Math.ceil(maxHz / binWidth));

      if (startBin >= endBin) return 0;

      let sum = 0;
      for (let i = startBin; i <= endBin; i++) {
        const db = frequencyData[i];
        const mag = db > -120 ? Math.pow(10, db / 20) : 0;
        sum += mag;
      }
      return sum / (endBin - startBin + 1);
    };

    return {
      subBass: computeBandEnergy(bandLimits.subBass[0], bandLimits.subBass[1]),
      bass: computeBandEnergy(bandLimits.bass[0], bandLimits.bass[1]),
      lowMid: computeBandEnergy(bandLimits.lowMid[0], bandLimits.lowMid[1]),
      mid: computeBandEnergy(bandLimits.mid[0], bandLimits.mid[1]),
      highMid: computeBandEnergy(bandLimits.highMid[0], bandLimits.highMid[1]),
      presence: computeBandEnergy(bandLimits.presence[0], bandLimits.presence[1]),
      brilliance: computeBandEnergy(bandLimits.brilliance[0], bandLimits.brilliance[1]),
    };
  }

  /**
   * Analyze the active audio frame.
   * Can accept optional custom buffers for unit testing and offline simulation.
   */
  public analyzeFrame(
    customTimeDomain?: Float32Array,
    customFrequency?: Float32Array
  ): AcousticFeatures {
    let timeDomain = customTimeDomain;
    let frequency = customFrequency;
    const sampleRate = this._audioContext?.sampleRate || 44100;

    if (!timeDomain && this._analyserNode && this._timeDomainBuffer) {
      (this._analyserNode as any).getFloatTimeDomainData(this._timeDomainBuffer);
      timeDomain = this._timeDomainBuffer;
    }

    if (!frequency && this._analyserNode && this._frequencyBuffer) {
      (this._analyserNode as any).getFloatFrequencyData(this._frequencyBuffer);
      frequency = this._frequencyBuffer;
    }

    // Default zero buffers if audio is stopped/offline
    if (!timeDomain) timeDomain = new Float32Array(512);
    if (!frequency) frequency = new Float32Array(256).fill(-100);

    const rmsEnergy = this.computeRMS(timeDomain);

    // Compute peak amplitude
    let peakEnergy = 0;
    for (let i = 0; i < timeDomain.length; i++) {
      const absVal = Math.abs(timeDomain[i]);
      if (absVal > peakEnergy) peakEnergy = absVal;
    }

    const spectralCentroidHz = this.computeSpectralCentroid(frequency, sampleRate);
    const spectralFlatness = this.computeSpectralFlatness(frequency);
    const spectralRolloffHz = this.computeSpectralRolloff(frequency, sampleRate);
    const bands = this.computeBands(frequency, sampleRate);

    // Dynamic onset detection: transient jump > 0.15 above previous frame energy
    const energyDelta = rmsEnergy - this._previousEnergy;
    const isOnset = energyDelta > 0.15;
    this._previousEnergy = rmsEnergy;

    return {
      rmsEnergy,
      peakEnergy,
      spectralCentroidHz,
      spectralFlatness,
      spectralRolloffHz,
      bands,
      isOnset,
      timestamp: Date.now(),
    };
  }

  /**
   * Validate track acoustic metadata against measured real-time features.
   */
  public validateAcoustics(
    expectedEnergy: number,
    features: AcousticFeatures
  ): AcousticValidationResult {
    const divergence = Math.abs(features.rmsEnergy - expectedEnergy);
    // Allowable tolerance +/- 0.40 between normalized track energy and measured audio RMS
    const isValid = divergence <= 0.40;

    let brightnessProfile: 'dark' | 'balanced' | 'bright' = 'balanced';
    if (features.spectralCentroidHz < 1500) {
      brightnessProfile = 'dark';
    } else if (features.spectralCentroidHz > 4500) {
      brightnessProfile = 'bright';
    }

    return {
      isValid,
      measuredEnergy: features.rmsEnergy,
      expectedEnergy,
      divergence,
      brightnessProfile,
    };
  }
}

export const audioDspEngine = AudioDspEngine.getInstance();
