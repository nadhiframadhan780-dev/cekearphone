export type DataSourceTag = 
  | 'DEVICE'       // [TERBACA DARI PERANGKAT]
  | 'TEST'         // [HASIL UJI]
  | 'ESTIMATE'     // [ESTIMASI]
  | 'UNAVAILABLE'; // [TIDAK TERSEDIA]

export type ConnectionType = 'ble' | 'bluetooth_audio' | 'usb' | 'jack_3_5' | 'unknown';
export type AudioProfile = 'a2dp_stereo' | 'hfp_mono' | 'stereo' | 'mono' | 'unknown';

export interface DeviceInfo {
  id: string;
  name: string;
  sourceOfName: 'gatt' | 'media_device' | 'usb' | 'manual';
  allNameSources: {
    gattName?: string;
    mediaDeviceLabel?: string;
    usbProductName?: string;
    manualName?: string;
  };
  brand?: string;
  model?: string;
  connectionType: ConnectionType;
  audioProfile: AudioProfile;
  isSimulated?: boolean;
  
  // Device Information Service (0x180A)
  manufacturerName?: string;
  modelNumber?: string;
  firmwareRevision?: string;
  hardwareRevision?: string;
  softwareRevision?: string;
  pnpId?: {
    vendorIdSource: number;
    vendorId: number;
    productId: number;
    productVersion: number;
  };

  // Technical Media Audio Info
  sampleRate?: number;
  channelCount?: number;
  baseLatencyMs?: number;
  outputLatencyMs?: number;
  sinkId?: string;
  groupId?: string;

  // BLE Live Metrics
  connected: boolean;
  disconnectCount: number;
  rssi?: number; // dBm if watchAdvertisements supported
}

export interface BatteryReading {
  timestamp: number; // Unix ms
  level: number;     // 0 - 100%
  source: DataSourceTag;
  rawFlags?: number;
}

export interface BatteryV11Details {
  batteryLevelStatus?: {
    chargingState: 'charging' | 'discharging' | 'full' | 'not_charging' | 'unknown';
    faultPresent: boolean;
    serviceRequired: boolean;
  };
  batteryHealthStatus?: {
    healthPercent?: number;
    cycleCount?: number;
    temperatureCelsius?: number;
  };
  batteryCriticalStatus?: boolean;
  estimatedServiceDate?: string;
}

export interface BatteryHealthState {
  currentLevel: number | null;
  levelSource: DataSourceTag;
  status: 'charging' | 'discharging' | 'unknown';
  statusSource: DataSourceTag;
  drainRatePerHour: number | null; // %/jam
  drainRateUncertainty?: {
    min: number;
    max: number;
    confidence: 'low' | 'medium' | 'high';
  };
  estimatedRemainingHours: number | null;
  batteryHealthPercent: number | null; // from 0x2BEA if present
  batteryHealthSource: DataSourceTag;
  
  // Endurance Test / Uji Daya Tahan
  effectiveCapacityEstimate: number | null; // % (can be 90%, 105%, etc.)
  effectiveCapacityConfidence: 'low' | 'medium' | 'high' | 'none';
  enduranceTestDurationSec: number;
  enduranceTestDropPercent: number;
  enduranceTestActive: boolean;
  factorySpecHours: number; // user specified

  // Per-bud data (only when genuine)
  leftBudLevel: number | null;
  rightBudLevel: number | null;
  caseLevel: number | null;
  perBudSource: DataSourceTag;

  history: BatteryReading[];
  v11Details?: BatteryV11Details;
  detectedResolutionStep: number; // 1%, 5%, or 10%
  lastReadTimestamp: number | null;
}

export interface AcousticFreqResult {
  frequency: number;
  leftGainDb: number;
  rightGainDb: number;
  deltaDb: number; // |L - R|
  thdPercent?: number;
}

export interface AudioTestState {
  lrBalanceConfirmed: 'left' | 'right' | 'both' | 'none' | null;
  lrBalanceSource: DataSourceTag;
  
  acousticResults: AcousticFreqResult[];
  acousticNoiseFloorDb: number | null;
  acousticDeadChannel: 'none' | 'left' | 'right' | 'both' | null;
  acousticMaxDeltaDb: number | null;
  acousticTestCompleted: boolean;
  
  polarityPhaseResult: 'in_phase' | 'out_of_phase' | 'uncertain' | null;
  
  bassDistortionObserved: boolean | null;
  buzzRattleNotes: string;
  
  cableWiggleDropouts: number;
  cableWiggleTesting: boolean;
  
  latencyMs: number | null;
  measuredLatencyMs: number | null;
  
  streamingStability: {
    durationSec: number;
    glitchCount: number;
    disconnects: number;
    passed: boolean | null;
    testing: boolean;
  };
}

export interface MicTestState {
  peakDbfs: number;
  rmsDbfs: number;
  noiseFloorDbfs: number | null;
  snrDb: number | null;
  clippingDetected: boolean;
  dcOffset: number;
  actualSampleRate: number | null;
  actualChannelCount: number | null;
  isHfpProfile: boolean;
  score: number | null;
  recordedAudioUrl: string | null;
  tested: boolean;
}

export interface ButtonTestState {
  play: boolean;
  pause: boolean;
  previoustrack: boolean;
  nexttrack: boolean;
  seekbackward: boolean;
  seekforward: boolean;
  stop: boolean;
  volumeup: boolean;
  volumedown: boolean;
  eventLogs: Array<{ action: string; timestamp: number; key?: string }>;
}

export interface DeviceScoreResult {
  totalScore: number | null; // 0-100 or null if not enough data
  completenessPercent: number; // 0-100%
  categoryScores: {
    battery: { score: number | null; status: 'good' | 'warning' | 'bad' | 'untested'; note: string };
    audioOutput: { score: number | null; status: 'good' | 'warning' | 'bad' | 'untested'; note: string };
    mic: { score: number | null; status: 'good' | 'warning' | 'bad' | 'untested'; note: string };
    connection: { score: number | null; status: 'good' | 'warning' | 'bad' | 'untested'; note: string };
    buttons: { score: number | null; status: 'good' | 'warning' | 'bad' | 'untested'; note: string };
    cable: { score: number | null; status: 'good' | 'warning' | 'bad' | 'untested'; note: string };
  };
  recommendations: Array<{
    id: string;
    level: 'info' | 'warning' | 'critical';
    title: string;
    desc: string;
  }>;
}

export interface GattCharacteristicInfo {
  serviceUuid: string;
  serviceName: string;
  uuid: string;
  name: string;
  properties: {
    read: boolean;
    write: boolean;
    notify: boolean;
    indicate: boolean;
  };
  valueHex?: string;
  valueParsed?: string;
  readError?: string;
}
