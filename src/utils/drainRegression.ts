import { BatteryReading } from '../types/device';

export interface RegressionResult {
  slopePerHour: number; // % change per hour (- is discharging, + is charging)
  drainRatePerHour: number; // positive %/hour when discharging, or 0 if charging
  rSquared: number;
  dataPointsCount: number;
  durationMinutes: number;
  estimatedRemainingHours: number | null;
  uncertainty: {
    min: number;
    max: number;
    confidence: 'low' | 'medium' | 'high';
  };
  detectedResolutionStep: number; // 1, 5, or 10
}

/**
 * Computes ordinary least squares linear regression on battery readings.
 * Readings: Array<{ timestamp: number (ms), level: number (0-100) }>
 */
export function calculateDrainRegression(readings: BatteryReading[]): RegressionResult | null {
  if (!readings || readings.length < 2) {
    return null;
  }

  // Sort ascending by timestamp
  const sorted = [...readings].sort((a, b) => a.timestamp - b.timestamp);
  const n = sorted.length;
  const t0 = sorted[0].timestamp;
  const durationMs = sorted[n - 1].timestamp - t0;
  const durationMinutes = durationMs / (1000 * 60);

  if (durationMinutes < 0.1) {
    // Too close in time to get a realistic slope
    return null;
  }

  // Convert time to hours relative to t0
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const r of sorted) {
    const x = (r.timestamp - t0) / (1000 * 60 * 60); // hours
    const y = r.level;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-9) {
    return null;
  }

  const slope = (n * sumXY - sumX * sumY) / denominator; // % per hour
  const intercept = (sumY - slope * sumX) / n;

  // Compute R-squared
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (const r of sorted) {
    const x = (r.timestamp - t0) / (1000 * 60 * 60);
    const y = r.level;
    const yPred = intercept + slope * x;
    ssTot += Math.pow(y - meanY, 2);
    ssRes += Math.pow(y - yPred, 2);
  }

  const rSquared = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 1;

  // Detect reporting resolution step (e.g., jumps of 10%, 5%, or 1%)
  const steps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.abs(sorted[i].level - sorted[i - 1].level);
    if (diff > 0) steps.push(diff);
  }
  let detectedResolutionStep = 1;
  if (steps.length > 0) {
    const allMultiplesOf10 = steps.every(s => s % 10 === 0);
    const allMultiplesOf5 = steps.every(s => s % 5 === 0);
    if (allMultiplesOf10) detectedResolutionStep = 10;
    else if (allMultiplesOf5) detectedResolutionStep = 5;
    else detectedResolutionStep = 1;
  }

  const latestLevel = sorted[n - 1].level;
  const isDischarging = slope < 0;
  const drainRatePerHour = isDischarging ? Math.abs(slope) : 0;

  let estimatedRemainingHours: number | null = null;
  if (isDischarging && drainRatePerHour > 0.05) {
    estimatedRemainingHours = latestLevel / drainRatePerHour;
  }

  // Determine confidence and uncertainty
  let confidence: 'low' | 'medium' | 'high' = 'low';
  let varianceFactor = 0.35; // 35% margin for short or noisy runs

  if (durationMinutes >= 30 && n >= 6 && rSquared > 0.85) {
    confidence = 'high';
    varianceFactor = 0.10;
  } else if (durationMinutes >= 15 && n >= 4 && rSquared > 0.65) {
    confidence = 'medium';
    varianceFactor = 0.20;
  }

  const minDrain = Math.max(0, drainRatePerHour * (1 - varianceFactor));
  const maxDrain = drainRatePerHour * (1 + varianceFactor);

  return {
    slopePerHour: slope,
    drainRatePerHour,
    rSquared,
    dataPointsCount: n,
    durationMinutes,
    estimatedRemainingHours,
    uncertainty: {
      min: Number(minDrain.toFixed(2)),
      max: Number(maxDrain.toFixed(2)),
      confidence,
    },
    detectedResolutionStep,
  };
}

export interface EnduranceEstimateResult {
  canEstimate: boolean;
  reason?: string;
  effectiveCapacityPercent?: number; // e.g. 92%
  rangeMinPercent?: number;
  rangeMaxPercent?: number;
  confidence?: 'low' | 'medium' | 'high';
}

/**
 * Calculates effective battery capacity relative to factory claim.
 * Formula: Capacity% = (100 / drainRatePerHour) / factorySpecHours * 100
 * Requirements: minimum duration 20 min (1200 sec) AND battery drop >= 5%.
 */
export function calculateEnduranceCapacity(
  durationSec: number,
  batteryDropPercent: number,
  drainRatePerHour: number,
  factorySpecHours: number
): EnduranceEstimateResult {
  if (factorySpecHours <= 0) {
    return {
      canEstimate: false,
      reason: 'Spesifikasi daya tahan pabrik harus diisi (> 0 jam).',
    };
  }

  const minDurationSec = 20 * 60; // 20 minutes
  const minDropPercent = 5;       // 5% drop

  if (durationSec < minDurationSec || batteryDropPercent < minDropPercent) {
    const durMin = (durationSec / 60).toFixed(0);
    return {
      canEstimate: false,
      reason: `Data belum cukup: uji baru berjalan ${durMin}/20 menit dan baterai baru turun ${batteryDropPercent.toFixed(1)}/5%.`,
    };
  }

  if (drainRatePerHour <= 0) {
    return {
      canEstimate: false,
      reason: 'Baterai tidak terdeteksi menguras (laju kuras 0%/jam).',
    };
  }

  const measuredTotalHours = 100 / drainRatePerHour;
  const effectiveCapacityPercent = (measuredTotalHours / factorySpecHours) * 100;

  // Confidence is based on duration and drop depth
  let confidence: 'low' | 'medium' | 'high' = 'low';
  let margin = 0.18;
  if (durationSec >= 45 * 60 && batteryDropPercent >= 15) {
    confidence = 'high';
    margin = 0.08;
  } else if (durationSec >= 30 * 60 && batteryDropPercent >= 10) {
    confidence = 'medium';
    margin = 0.12;
  }

  const rangeMinPercent = Math.max(0, effectiveCapacityPercent * (1 - margin));
  const rangeMaxPercent = effectiveCapacityPercent * (1 + margin);

  return {
    canEstimate: true,
    effectiveCapacityPercent: Math.round(effectiveCapacityPercent),
    rangeMinPercent: Math.round(rangeMinPercent),
    rangeMaxPercent: Math.round(rangeMaxPercent),
    confidence,
  };
}
