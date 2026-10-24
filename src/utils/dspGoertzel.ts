/**
 * Goertzel Algorithm for isolated single-frequency power detection.
 * Highly efficient O(N) calculation for stepped sine sweep analysis.
 */
export function goertzel(samples: Float32Array, targetFreq: number, sampleRate: number): number {
  const N = samples.length;
  if (N === 0) return 0;

  const omega = (2 * Math.PI * targetFreq) / sampleRate;
  const coeff = 2 * Math.cos(omega);

  let q0 = 0;
  let q1 = 0;
  let q2 = 0;

  for (let i = 0; i < N; i++) {
    q0 = coeff * q1 - q2 + samples[i];
    q2 = q1;
    q1 = q0;
  }

  // Generalized Goertzel real and imaginary components
  const real = q1 - q2 * Math.cos(omega);
  const imag = q2 * Math.sin(omega);
  const magnitude = Math.sqrt(real * real + imag * imag);

  // Normalized magnitude relative to N/2
  return magnitude / (N / 2);
}

/**
 * Converts magnitude (0.0 to 1.0) to dBFS (decibels relative to full scale).
 */
export function magnitudeToDbfs(magnitude: number): number {
  if (magnitude <= 1e-6) return -120;
  return 20 * Math.log10(magnitude);
}

/**
 * Computes root-mean-square (RMS) and Peak dBFS of a PCM sample buffer.
 */
export function computeRmsAndPeak(samples: Float32Array): { rmsDbfs: number; peakDbfs: number; dcOffset: number } {
  if (samples.length === 0) {
    return { rmsDbfs: -120, peakDbfs: -120, dcOffset: 0 };
  }

  let sum = 0;
  let sumSquares = 0;
  let maxAbs = 0;

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    sum += s;
    sumSquares += s * s;
    const abs = Math.abs(s);
    if (abs > maxAbs) maxAbs = abs;
  }

  const dcOffset = sum / samples.length;
  const rms = Math.sqrt(sumSquares / samples.length);

  return {
    rmsDbfs: magnitudeToDbfs(rms),
    peakDbfs: magnitudeToDbfs(maxAbs),
    dcOffset,
  };
}

/**
 * Evaluates Left vs Right delta (dB).
 * Delta > 3 dB = Warning ("Perlu Perhatian")
 * Delta > 6 dB = Problem ("Bermasalah")
 */
export function evaluateChannelDelta(leftGainDb: number, rightGainDb: number): {
  deltaDb: number;
  status: 'good' | 'warning' | 'problem';
  label: string;
} {
  const deltaDb = Math.abs(leftGainDb - rightGainDb);
  if (deltaDb <= 3.0) {
    return { deltaDb, status: 'good', label: 'Seimbang (≤ 3 dB)' };
  } else if (deltaDb <= 6.0) {
    return { deltaDb, status: 'warning', label: 'Perlu Perhatian (3 - 6 dB)' };
  } else {
    return { deltaDb, status: 'problem', label: 'Bermasalah (> 6 dB selisih)' };
  }
}

/**
 * Estimates Total Harmonic Distortion (THD) for frequencies <= 4000 Hz.
 * Evaluates 2nd and 3rd harmonics using Goertzel.
 * THD% = sqrt(V2^2 + V3^2) / V1 * 100
 */
export function estimateThd(
  samples: Float32Array,
  fundamentalFreq: number,
  sampleRate: number
): number | undefined {
  if (fundamentalFreq > 4000 || samples.length === 0) {
    return undefined;
  }

  const v1 = goertzel(samples, fundamentalFreq, sampleRate);
  if (v1 < 0.001) {
    // Fundamental too weak/quiet to compute reliable THD
    return undefined;
  }

  const v2 = goertzel(samples, fundamentalFreq * 2, sampleRate);
  const v3 = goertzel(samples, fundamentalFreq * 3, sampleRate);

  const harmonicPower = Math.sqrt(v2 * v2 + v3 * v3);
  const thdRatio = harmonicPower / v1;
  const thdPercent = Math.min(100, thdRatio * 100);

  return Number(thdPercent.toFixed(2));
}
