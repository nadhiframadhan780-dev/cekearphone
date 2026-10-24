import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBatteryLevel,
  parseBatteryLevelStatus,
  parseBatteryHealthStatus,
  parsePnpId,
} from './batteryParser';
import {
  calculateDrainRegression,
  calculateEnduranceCapacity,
} from './drainRegression';
import {
  goertzel,
  magnitudeToDbfs,
  computeRmsAndPeak,
  evaluateChannelDelta,
  estimateThd,
} from './dspGoertzel';
import {
  evaluateEarphoneHealth,
  DEFAULT_WEIGHTS,
} from './scoringEngine';
import { identifyBrandAndModel } from './deviceBrands';

test('batteryParser: parses 0x2A19 Battery Level correctly', () => {
  const buf = new Uint8Array([85]);
  const view = new DataView(buf.buffer);
  assert.equal(parseBatteryLevel(view), 85);

  assert.throws(() => {
    const invalid = new Uint8Array([120]);
    parseBatteryLevel(new DataView(invalid.buffer));
  });
});

test('batteryParser: parses 0x2BED Battery Level Status flags correctly', () => {
  // Byte 0: 92%, Byte 1: flags (0b00001001: chargingState = 01 (charging), faultPresent = 0, serviceRequired = 1)
  const buf = new Uint8Array([92, 0b00001001]);
  const view = new DataView(buf.buffer);
  const parsed = parseBatteryLevelStatus(view);
  assert.equal(parsed.level, 92);
  assert.equal(parsed.details?.chargingState, 'charging');
  assert.equal(parsed.details?.faultPresent, false);
  assert.equal(parsed.details?.serviceRequired, true);
});

test('batteryParser: parses 0x2BEA Battery Health Status and cycle count', () => {
  // Byte 0: 88%, Bytes 1-2: 250 cycles (0x00FA)
  const buf = new Uint8Array([88, 0xFA, 0x00]);
  const view = new DataView(buf.buffer);
  const parsed = parseBatteryHealthStatus(view);
  assert.equal(parsed.healthPercent, 88);
  assert.equal(parsed.cycleCount, 250);
});

test('batteryParser: parses 0x2A50 PnP ID', () => {
  // Vendor ID source: 1, Vendor ID: 0x012D (Sony), Product ID: 0x1234, Version: 0x0100
  const buf = new Uint8Array([1, 0x2D, 0x01, 0x34, 0x12, 0x00, 0x01]);
  const view = new DataView(buf.buffer);
  const parsed = parsePnpId(view);
  assert.equal(parsed.vendorIdSource, 1);
  assert.equal(parsed.vendorId, 0x012D);
  assert.equal(parsed.productId, 0x1234);
});

test('drainRegression: computes slope, remaining hours, and resolution step', () => {
  const now = 100000000;
  // 4 readings over 2 hours, dropping from 100% to 80% (10% per hour)
  const readings = [
    { timestamp: now, level: 100, source: 'DEVICE' as const },
    { timestamp: now + 30 * 60 * 1000, level: 95, source: 'DEVICE' as const },
    { timestamp: now + 60 * 60 * 1000, level: 90, source: 'DEVICE' as const },
    { timestamp: now + 120 * 60 * 1000, level: 80, source: 'DEVICE' as const },
  ];

  const reg = calculateDrainRegression(readings);
  assert.ok(reg);
  assert.equal(Math.round(reg.drainRatePerHour), 10);
  assert.equal(Math.round(reg.estimatedRemainingHours ?? 0), 8); // 80% left / 10%/hr = 8h
  assert.equal(reg.detectedResolutionStep, 5); // jumps of 5
});

test('drainRegression: calculates endurance capacity with strict checks', () => {
  // Test with insufficient duration (< 20 mins)
  const tooShort = calculateEnduranceCapacity(15 * 60, 6, 12, 6);
  assert.equal(tooShort.canEstimate, false);
  assert.ok(tooShort.reason?.includes('Data belum cukup'));

  // Test with insufficient drop (< 5%)
  const smallDrop = calculateEnduranceCapacity(25 * 60, 3, 10, 6);
  assert.equal(smallDrop.canEstimate, false);

  // Valid run: 30 minutes, 8% drop, 16% drain per hour on a 6h factory spec
  // 100 / 16 = 6.25h actual endurance; 6.25 / 6h = 104%
  const valid = calculateEnduranceCapacity(30 * 60, 8, 16, 6);
  assert.equal(valid.canEstimate, true);
  assert.equal(valid.effectiveCapacityPercent, 104);
  assert.ok(valid.rangeMinPercent! < 104);
  assert.ok(valid.rangeMaxPercent! > 104);
});

test('dspGoertzel: accurately detects target sine frequency power and THD', () => {
  const sampleRate = 48000;
  const numSamples = 2048;
  const targetFreq = 1000; // 1 kHz pure sine
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    samples[i] = 0.8 * Math.sin(2 * Math.PI * targetFreq * t);
  }

  const power = goertzel(samples, 1000, sampleRate);
  assert.ok(Math.abs(power - 0.8) < 0.05, `Expected ~0.8, got ${power}`);

  // Test off-target frequency (e.g. 2000Hz) should be near 0
  const offPower = goertzel(samples, 2000, sampleRate);
  assert.ok(offPower < 0.02, `Expected near zero, got ${offPower}`);

  // Test RMS & Peak
  const stats = computeRmsAndPeak(samples);
  assert.ok(Math.abs(stats.peakDbfs - magnitudeToDbfs(0.8)) < 0.1);

  // Pure sine should have very low THD
  const thd = estimateThd(samples, 1000, sampleRate);
  assert.ok(thd !== undefined && thd < 1.0);
});

test('dspGoertzel: evaluates channel balance delta', () => {
  const balanced = evaluateChannelDelta(-12, -13.5);
  assert.equal(balanced.status, 'good');

  const warning = evaluateChannelDelta(-12, -16.5);
  assert.equal(warning.status, 'warning');

  const problem = evaluateChannelDelta(-12, -22);
  assert.equal(problem.status, 'problem');
});

test('scoringEngine: normalizes weights dynamically for untested categories', () => {
  const dummyBattery = {
    currentLevel: 80,
    levelSource: 'DEVICE' as const,
    status: 'discharging' as const,
    statusSource: 'DEVICE' as const,
    drainRatePerHour: 10,
    estimatedRemainingHours: 8,
    batteryHealthPercent: null,
    batteryHealthSource: 'UNAVAILABLE' as const,
    effectiveCapacityEstimate: null,
    effectiveCapacityConfidence: 'none' as const,
    enduranceTestDurationSec: 0,
    enduranceTestDropPercent: 0,
    enduranceTestActive: false,
    factorySpecHours: 6,
    leftBudLevel: null,
    rightBudLevel: null,
    caseLevel: null,
    perBudSource: 'UNAVAILABLE' as const,
    history: [],
    detectedResolutionStep: 1,
    lastReadTimestamp: Date.now(),
  };

  const dummyAudio = {
    lrBalanceConfirmed: 'both' as const,
    lrBalanceSource: 'TEST' as const,
    acousticResults: [],
    acousticNoiseFloorDb: null,
    acousticDeadChannel: null,
    acousticMaxDeltaDb: null,
    acousticTestCompleted: false,
    polarityPhaseResult: null,
    bassDistortionObserved: null,
    buzzRattleNotes: '',
    cableWiggleDropouts: 0,
    cableWiggleTesting: false,
    latencyMs: null,
    measuredLatencyMs: null,
    streamingStability: { durationSec: 0, glitchCount: 0, disconnects: 0, passed: null, testing: false },
  };

  const dummyMic = {
    peakDbfs: -120,
    rmsDbfs: -120,
    noiseFloorDbfs: null,
    snrDb: null,
    clippingDetected: false,
    dcOffset: 0,
    actualSampleRate: null,
    actualChannelCount: null,
    isHfpProfile: false,
    score: null,
    recordedAudioUrl: null,
    tested: false, // untested
  };

  const dummyButtons = {
    play: false, pause: false, previoustrack: false, nexttrack: false,
    seekbackward: false, seekforward: false, stop: false, volumeup: false, volumedown: false,
    eventLogs: [], // untested
  };

  const result = evaluateEarphoneHealth(
    null,
    dummyBattery,
    dummyAudio,
    dummyMic,
    dummyButtons,
    DEFAULT_WEIGHTS
  );

  // Only battery and audio were tested
  assert.ok(result.totalScore !== null);
  assert.equal(result.categoryScores.mic.status, 'untested');
  assert.equal(result.categoryScores.buttons.status, 'untested');
  assert.ok(result.completenessPercent < 100);
});

test('deviceBrands: identifies brand from vendor ID and model name', () => {
  const sony = identifyBrandAndModel('WH-1000XM4', 0x012D);
  assert.equal(sony.brand, 'Sony');

  const soundcore = identifyBrandAndModel('Soundcore Space Q45');
  assert.equal(soundcore.brand, 'Soundcore');
});
