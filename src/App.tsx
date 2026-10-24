import React, { useState, useEffect, useMemo } from 'react';
import {
  Headphones,
  Battery,
  Volume2,
  Mic,
  Sliders,
  Award,
  AlertTriangle,
  Info,
  Terminal,
} from 'lucide-react';

import {
  DeviceInfo,
  BatteryHealthState,
  AudioTestState,
  MicTestState,
  ButtonTestState,
  GattCharacteristicInfo,
} from './types/device';
import { Language, i18n } from './i18n/translations';
import { Header } from './components/Header';
import { SafetyAudioBanner } from './components/SafetyAudioBanner';
import { DeviceProfileCard } from './components/DeviceProfileCard';
import { DeviceTab } from './components/tabs/DeviceTab';
import { BatteryTab } from './components/tabs/BatteryTab';
import { AudioOutputTab } from './components/tabs/AudioOutputTab';
import { MicrophoneTab } from './components/tabs/MicrophoneTab';
import { ButtonControlsTab } from './components/tabs/ButtonControlsTab';
import { ReportTab } from './components/tabs/ReportTab';
import { CompatibilityModal } from './components/modals/CompatibilityModal';
import { AssessmentGuideModal } from './components/modals/AssessmentGuideModal';
import { GattExplorerModal } from './components/modals/GattExplorerModal';

import { bluetoothService } from './services/bluetoothService';
import { mediaDeviceService, AudioEndpoint } from './services/mediaDeviceService';
import { audioService } from './services/audioService';
import { calculateDrainRegression } from './utils/drainRegression';
import { evaluateEarphoneHealth } from './utils/scoringEngine';
import { saveBatteryReading, getBatteryReadings } from './utils/storage';

export default function App() {
  const [lang, setLang] = useState<Language>('id');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'device' | 'battery' | 'audio' | 'mic' | 'buttons' | 'report'>('device');

  // Modals
  const [isCompatOpen, setIsCompatOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isGattOpen, setIsGattOpen] = useState(false);
  const [gattChars, setGattChars] = useState<GattCharacteristicInfo[]>([]);
  const [isLoadingGatt, setIsLoadingGatt] = useState(false);

  // Demo Mode state
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Physical Hardware States
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [audioOutputs, setAudioOutputs] = useState<AudioEndpoint[]>([]);
  const [audioInputs, setAudioInputs] = useState<AudioEndpoint[]>([]);
  const [isScanningBt, setIsScanningBt] = useState(false);
  const [btError, setBtError] = useState<string | null>(null);

  // Battery State
  const [batteryState, setBatteryState] = useState<BatteryHealthState>({
    currentLevel: null,
    levelSource: 'UNAVAILABLE',
    status: 'unknown',
    statusSource: 'UNAVAILABLE',
    drainRatePerHour: null,
    estimatedRemainingHours: null,
    batteryHealthPercent: null,
    batteryHealthSource: 'UNAVAILABLE',
    effectiveCapacityEstimate: null,
    effectiveCapacityConfidence: 'none',
    enduranceTestDurationSec: 0,
    enduranceTestDropPercent: 0,
    enduranceTestActive: false,
    factorySpecHours: 6.0,
    leftBudLevel: null,
    rightBudLevel: null,
    caseLevel: null,
    perBudSource: 'UNAVAILABLE',
    history: [],
    detectedResolutionStep: 1,
    lastReadTimestamp: null,
  });

  // Audio Test State
  const [audioTestState, setAudioTestState] = useState<AudioTestState>({
    lrBalanceConfirmed: null,
    lrBalanceSource: 'UNAVAILABLE',
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
  });

  // Microphone Test State
  const [micState, setMicState] = useState<MicTestState>({
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
    tested: false,
  });

  // Button Controls Test State
  const [buttonState, setButtonState] = useState<ButtonTestState>({
    play: false,
    pause: false,
    previoustrack: false,
    nexttrack: false,
    seekbackward: false,
    seekforward: false,
    stop: false,
    volumeup: false,
    volumedown: false,
    eventLogs: [],
  });

  // Endurance Test Timer
  useEffect(() => {
    let interval: any = null;
    if (batteryState.enduranceTestActive) {
      interval = setInterval(() => {
        setBatteryState((prev) => {
          const nextSec = prev.enduranceTestDurationSec + 1;
          // In demo mode, simulate gradual battery drop
          let drop = prev.enduranceTestDropPercent;
          if (isDemoMode && nextSec % 3 === 0) {
            drop += 0.2;
          }
          return {
            ...prev,
            enduranceTestDurationSec: nextSec,
            enduranceTestDropPercent: drop,
          };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [batteryState.enduranceTestActive, isDemoMode]);

  // Initial load: enumerate media devices and setup callbacks
  useEffect(() => {
    const initDevices = async () => {
      const outputs = await mediaDeviceService.refreshDevices();
      setAudioOutputs(mediaDeviceService.getAudioOutputs());
      setAudioInputs(mediaDeviceService.getAudioInputs());
    };
    initDevices();

    mediaDeviceService.registerDeviceChange(() => {
      setAudioOutputs(mediaDeviceService.getAudioOutputs());
      setAudioInputs(mediaDeviceService.getAudioInputs());
    });

    // Bluetooth callbacks
    bluetoothService.setCallbacks({
      onDeviceConnected: (dev) => {
        setDevice(dev);
        setBtError(null);
        // Load past readings from IndexedDB
        getBatteryReadings(dev.id).then((saved) => {
          if (saved.length > 0) {
            setBatteryState((prev) => ({
              ...prev,
              history: saved,
            }));
          }
        });
      },
      onDeviceDisconnected: (reason) => {
        setDevice((prev) => (prev ? { ...prev, connected: false } : null));
        setBtError(`Perangkat terputus: ${reason}`);
      },
      onBatteryUpdated: (reading, v11) => {
        setBatteryState((prev) => {
          const updatedHistory = [...prev.history, reading];
          if (device?.id) {
            saveBatteryReading(device.id, reading);
          }
          const reg = calculateDrainRegression(updatedHistory);
          return {
            ...prev,
            currentLevel: reading.level,
            levelSource: 'DEVICE',
            status: reg && reg.slopePerHour > 0 ? 'charging' : 'discharging',
            statusSource: 'DEVICE',
            drainRatePerHour: reg ? reg.drainRatePerHour : prev.drainRatePerHour,
            drainRateUncertainty: reg ? reg.uncertainty : prev.drainRateUncertainty,
            estimatedRemainingHours: reg ? reg.estimatedRemainingHours : prev.estimatedRemainingHours,
            detectedResolutionStep: reg ? reg.detectedResolutionStep : prev.detectedResolutionStep,
            batteryHealthPercent: v11?.batteryHealthStatus?.healthPercent ?? prev.batteryHealthPercent,
            batteryHealthSource: v11?.batteryHealthStatus?.healthPercent ? 'DEVICE' : prev.batteryHealthSource,
            v11Details: v11 || prev.v11Details,
            history: updatedHistory,
            lastReadTimestamp: reading.timestamp,
          };
        });
      },
      onRssiUpdated: (rssi) => {
        setDevice((prev) => (prev ? { ...prev, rssi } : null));
      },
      onLog: (msg, level) => {
        if (level === 'error') {
          setBtError(msg);
        }
      },
    });
  }, [device?.id]);

  // Handle Demo Mode Toggle
  const handleToggleDemo = () => {
    if (!isDemoMode) {
      // Enter Demo Mode
      setIsDemoMode(true);
      const demoNow = Date.now();
      const demoHistory = [
        { timestamp: demoNow - 3600000 * 2, level: 95, source: 'TEST' as const },
        { timestamp: demoNow - 3600000 * 1.5, level: 90, source: 'TEST' as const },
        { timestamp: demoNow - 3600000 * 1.0, level: 85, source: 'TEST' as const },
        { timestamp: demoNow - 3600000 * 0.5, level: 80, source: 'TEST' as const },
        { timestamp: demoNow, level: 75, source: 'TEST' as const },
      ];

      setDevice({
        id: 'demo_sony_wh1000xm4',
        name: 'Sony WH-1000XM4 (Demo)',
        sourceOfName: 'gatt',
        allNameSources: {
          gattName: 'Sony WH-1000XM4',
          mediaDeviceLabel: 'Headphones (Sony WH-1000XM4 Stereo)',
        },
        brand: 'Sony',
        model: 'WH-1000XM4',
        connectionType: 'ble',
        audioProfile: 'a2dp_stereo',
        isSimulated: true,
        manufacturerName: 'Sony Corporation',
        modelNumber: 'WH-1000XM4',
        firmwareRevision: '2.5.1',
        hardwareRevision: 'v1.0',
        pnpId: { vendorIdSource: 1, vendorId: 0x012D, productId: 0x011F, productVersion: 0x0100 },
        sampleRate: 48000,
        channelCount: 2,
        connected: true,
        disconnectCount: 0,
        rssi: -58,
      });

      setBatteryState({
        currentLevel: 75,
        levelSource: 'TEST',
        status: 'discharging',
        statusSource: 'TEST',
        drainRatePerHour: 10.0,
        drainRateUncertainty: { min: 9.0, max: 11.0, confidence: 'high' },
        estimatedRemainingHours: 7.5,
        batteryHealthPercent: 92,
        batteryHealthSource: 'TEST',
        effectiveCapacityEstimate: 94,
        effectiveCapacityConfidence: 'high',
        enduranceTestDurationSec: 1500, // 25 min
        enduranceTestDropPercent: 6.5,
        enduranceTestActive: false,
        factorySpecHours: 30.0,
        leftBudLevel: 76,
        rightBudLevel: 74,
        caseLevel: 85,
        perBudSource: 'TEST',
        history: demoHistory,
        detectedResolutionStep: 5,
        lastReadTimestamp: demoNow,
      });

      setAudioTestState({
        lrBalanceConfirmed: 'both',
        lrBalanceSource: 'TEST',
        acousticResults: [
          { frequency: 63, leftGainDb: -18.2, rightGainDb: -18.5, deltaDb: 0.3, thdPercent: 0.32 },
          { frequency: 125, leftGainDb: -17.8, rightGainDb: -18.0, deltaDb: 0.2, thdPercent: 0.25 },
          { frequency: 250, leftGainDb: -16.5, rightGainDb: -16.8, deltaDb: 0.3, thdPercent: 0.22 },
          { frequency: 500, leftGainDb: -16.0, rightGainDb: -16.2, deltaDb: 0.2, thdPercent: 0.18 },
          { frequency: 1000, leftGainDb: -15.5, rightGainDb: -15.7, deltaDb: 0.2, thdPercent: 0.15 },
          { frequency: 2000, leftGainDb: -16.0, rightGainDb: -16.3, deltaDb: 0.3, thdPercent: 0.20 },
          { frequency: 4000, leftGainDb: -17.2, rightGainDb: -17.6, deltaDb: 0.4, thdPercent: 0.28 },
          { frequency: 8000, leftGainDb: -18.5, rightGainDb: -19.0, deltaDb: 0.5 },
          { frequency: 16000, leftGainDb: -20.1, rightGainDb: -20.8, deltaDb: 0.7 },
        ],
        acousticNoiseFloorDb: -65,
        acousticDeadChannel: 'none',
        acousticMaxDeltaDb: 0.7,
        acousticTestCompleted: true,
        polarityPhaseResult: 'in_phase',
        bassDistortionObserved: false,
        buzzRattleNotes: 'Bersih tanpa rattle',
        cableWiggleDropouts: 0,
        cableWiggleTesting: false,
        latencyMs: 160,
        measuredLatencyMs: 165,
        streamingStability: { durationSec: 60, glitchCount: 0, disconnects: 0, passed: true, testing: false },
      });

      setMicState({
        peakDbfs: -18.4,
        rmsDbfs: -24.1,
        noiseFloorDbfs: -58.2,
        snrDb: 34.1,
        clippingDetected: false,
        dcOffset: 0.0002,
        actualSampleRate: 16000,
        actualChannelCount: 1,
        isHfpProfile: true,
        score: 92,
        recordedAudioUrl: null,
        tested: true,
      });

      setButtonState({
        play: true,
        pause: true,
        previoustrack: true,
        nexttrack: true,
        seekbackward: false,
        seekforward: false,
        stop: false,
        volumeup: true,
        volumedown: true,
        eventLogs: [
          { action: 'play', timestamp: demoNow - 5000 },
          { action: 'nexttrack', timestamp: demoNow - 3000 },
          { action: 'volumeup', timestamp: demoNow - 1000 },
        ],
      });
    } else {
      // Exit Demo Mode -> restore empty state
      setIsDemoMode(false);
      setDevice(null);
      setBatteryState({
        currentLevel: null,
        levelSource: 'UNAVAILABLE',
        status: 'unknown',
        statusSource: 'UNAVAILABLE',
        drainRatePerHour: null,
        estimatedRemainingHours: null,
        batteryHealthPercent: null,
        batteryHealthSource: 'UNAVAILABLE',
        effectiveCapacityEstimate: null,
        effectiveCapacityConfidence: 'none',
        enduranceTestDurationSec: 0,
        enduranceTestDropPercent: 0,
        enduranceTestActive: false,
        factorySpecHours: 6.0,
        leftBudLevel: null,
        rightBudLevel: null,
        caseLevel: null,
        perBudSource: 'UNAVAILABLE',
        history: [],
        detectedResolutionStep: 1,
        lastReadTimestamp: null,
      });
      setAudioTestState({
        lrBalanceConfirmed: null,
        lrBalanceSource: 'UNAVAILABLE',
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
      });
      setMicState({
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
        tested: false,
      });
      setButtonState({
        play: false,
        pause: false,
        previoustrack: false,
        nexttrack: false,
        seekbackward: false,
        seekforward: false,
        stop: false,
        volumeup: false,
        volumedown: false,
        eventLogs: [],
      });
    }
  };

  // Connect Bluetooth Handler
  const handleConnectBt = async (mode: 'all' | 'battery_filter') => {
    setIsScanningBt(true);
    setBtError(null);
    try {
      const dev = await bluetoothService.requestDevice(mode);
      setDevice(dev);
    } catch (err: any) {
      setBtError(err.message || 'Gagal menyambungkan Bluetooth.');
    } finally {
      setIsScanningBt(false);
    }
  };

  // Select Wired Device Handler
  const handleSelectWired = (endpoint: AudioEndpoint, customName?: string) => {
    const wiredDev = mediaDeviceService.buildWiredDeviceInfo(endpoint, customName);
    setDevice(wiredDev);
    audioService.setOutputDevice(endpoint.deviceId);
  };

  // Endurance Test Actions
  const handleStartEndurance = () => {
    audioService.playPinkNoise('Uji Daya Tahan (Pink Noise)');
    setBatteryState((prev) => ({
      ...prev,
      enduranceTestActive: true,
      enduranceTestDurationSec: 0,
      enduranceTestDropPercent: 0,
    }));
  };

  const handleStopEndurance = () => {
    audioService.stopAll();
    setBatteryState((prev) => {
      const reg = calculateDrainRegression(prev.history);
      return {
        ...prev,
        enduranceTestActive: false,
        drainRatePerHour: reg ? reg.drainRatePerHour : prev.drainRatePerHour,
      };
    });
  };

  // Explore GATT Handler
  const handleOpenGattExplorer = async () => {
    setIsGattOpen(true);
    setIsLoadingGatt(true);
    try {
      if (isDemoMode) {
        setGattChars([
          {
            serviceUuid: '0000180f-0000-1000-8000-00805f9b34fb',
            serviceName: 'Battery Service (0x180F)',
            uuid: '00002a19-0000-1000-8000-00805f9b34fb',
            name: 'Battery Level (0x2A19)',
            properties: { read: true, write: false, notify: true, indicate: false },
            valueHex: '4B',
            valueParsed: '75%',
          },
          {
            serviceUuid: '0000180f-0000-1000-8000-00805f9b34fb',
            serviceName: 'Battery Service (0x180F)',
            uuid: '00002bed-0000-1000-8000-00805f9b34fb',
            name: 'Battery Level Status (0x2BED)',
            properties: { read: true, write: false, notify: false, indicate: false },
            valueHex: '4B 02',
            valueParsed: 'Level: 75%, State: Discharging, No Fault',
          },
          {
            serviceUuid: '0000180a-0000-1000-8000-00805f9b34fb',
            serviceName: 'Device Information (0x180A)',
            uuid: '00002a29-0000-1000-8000-00805f9b34fb',
            name: 'Manufacturer Name (0x2A29)',
            properties: { read: true, write: false, notify: false, indicate: false },
            valueHex: '53 6F 6E 79',
            valueParsed: 'Sony Corporation',
          },
          {
            serviceUuid: '0000180a-0000-1000-8000-00805f9b34fb',
            serviceName: 'Device Information (0x180A)',
            uuid: '00002a24-0000-1000-8000-00805f9b34fb',
            name: 'Model Number (0x2A24)',
            properties: { read: true, write: false, notify: false, indicate: false },
            valueHex: '57 48 2D 31 30 30 30 58 4D 34',
            valueParsed: 'WH-1000XM4',
          },
          {
            serviceUuid: '0000180a-0000-1000-8000-00805f9b34fb',
            serviceName: 'Device Information (0x180A)',
            uuid: '00002a25-0000-1000-8000-00805f9b34fb',
            name: 'Serial Number (0x2A25 - Terbatas)',
            properties: { read: true, write: false, notify: false, indicate: false },
            readError: 'Tidak tersedia (dibatasi browser)',
          },
        ]);
      } else {
        const chars = await bluetoothService.exploreGatt();
        setGattChars(chars);
      }
    } catch (e: any) {
      console.warn('GATT Explorer error:', e);
    } finally {
      setIsLoadingGatt(false);
    }
  };

  // Calculate Overall Scoring
  const scoreResult = useMemo(() => {
    return evaluateEarphoneHealth(
      device,
      batteryState,
      audioTestState,
      micState,
      buttonState
    );
  }, [device, batteryState, audioTestState, micState, buttonState]);

  const t = i18n[lang];

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      {/* Persistent Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-amber-500 text-zinc-950 font-bold px-4 py-1.5 text-xs text-center flex items-center justify-center gap-2 tracking-wide sticky top-0 z-50 shadow-md">
          <AlertTriangle className="w-4 h-4" />
          <span>{t.simulatedBanner}</span>
          <button
            type="button"
            onClick={handleToggleDemo}
            className="ml-3 underline font-black text-xs hover:text-black cursor-pointer"
          >
            [{t.turnOffDemo}]
          </button>
        </div>
      )}

      {/* Main Header */}
      <Header
        lang={lang}
        onLanguageChange={setLang}
        isDemoMode={isDemoMode}
        onToggleDemo={handleToggleDemo}
        onOpenCompatibility={() => setIsCompatOpen(true)}
        onOpenAssessmentGuide={() => setIsGuideOpen(true)}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
      />

      {/* Audio Safety Banner (Volume Limiter, Soft Start, STOP) */}
      <SafetyAudioBanner
        lang={lang}
        targetDeviceName={device?.name}
        isUsingDefaultSpeaker={!device?.sinkId}
      />

      {/* Main Application Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Hero Device Profile Card */}
        <DeviceProfileCard
          device={device}
          battery={batteryState}
          onOpenGattExplorer={handleOpenGattExplorer}
          onUpdateManualName={(newName) => {
            setDevice((prev) => (prev ? { ...prev, name: newName, sourceOfName: 'manual' } : null));
          }}
          isSimulated={isDemoMode}
        />

        {/* Feature Navigation Tabs */}
        <nav aria-label="Navigasi Modul Pengujian" className="flex border-b border-zinc-800 overflow-x-auto gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('device')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'device'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span>{t.tabDevice}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('battery')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'battery'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Battery className="w-4 h-4" />
            <span>{t.tabBattery}</span>
            {batteryState.currentLevel !== null && (
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-800">
                {batteryState.currentLevel}%
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'audio'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>{t.tabAudio}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mic')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'mic'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>{t.tabMic}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('buttons')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'buttons'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{t.tabControls}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ml-auto ${
              activeTab === 'report'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Award className="w-4 h-4 text-emerald-400" />
            <span>{t.tabReport}</span>
            {scoreResult.totalScore !== null && (
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-800">
                {scoreResult.totalScore}
              </span>
            )}
          </button>
        </nav>

        {/* Tab Contents */}
        <section aria-label="Isi Modul Aktif">
          {activeTab === 'device' && (
            <DeviceTab
              currentDevice={device}
              onConnectBluetooth={handleConnectBt}
              onSelectWiredDevice={handleSelectWired}
              audioOutputs={audioOutputs}
              isScanningBt={isScanningBt}
              btError={btError}
              onClearError={() => setBtError(null)}
            />
          )}

          {activeTab === 'battery' && (
            <BatteryTab
              battery={batteryState}
              onUpdateFactorySpec={(h) => setBatteryState((p) => ({ ...p, factorySpecHours: h }))}
              onStartEnduranceTest={handleStartEndurance}
              onStopEnduranceTest={handleStopEndurance}
              isSimulated={isDemoMode}
            />
          )}

          {activeTab === 'audio' && (
            <AudioOutputTab
              device={device}
              audioState={audioTestState}
              onUpdateAudioState={setAudioTestState}
              isSimulated={isDemoMode}
            />
          )}

          {activeTab === 'mic' && (
            <MicrophoneTab
              micState={micState}
              onUpdateMicState={setMicState}
              audioInputs={audioInputs}
              isSimulated={isDemoMode}
            />
          )}

          {activeTab === 'buttons' && (
            <ButtonControlsTab
              buttonState={buttonState}
              onUpdateButtons={setButtonState}
              isSimulated={isDemoMode}
            />
          )}

          {activeTab === 'report' && (
            <ReportTab
              device={device}
              scoreResult={scoreResult}
              onRefreshScore={() => {}}
              isSimulated={isDemoMode}
            />
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-500 space-y-1">
        <p>EarCheck — Diagnostik Earphone Laptop Lokal &amp; Privat (Web Bluetooth, Web Audio API, DSP Goertzel).</p>
        <p className="text-[11px] text-zinc-600">Tidak ada data atau audio yang diunggah ke server luar. Semua pemrosesan 100% di browser Anda.</p>
      </footer>

      {/* Modals */}
      <CompatibilityModal
        isOpen={isCompatOpen}
        onClose={() => setIsCompatOpen(false)}
        lang={lang}
      />

      <AssessmentGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        lang={lang}
      />

      <GattExplorerModal
        isOpen={isGattOpen}
        onClose={() => setIsGattOpen(false)}
        characteristics={gattChars}
        isLoading={isLoadingGatt}
        onRefresh={handleOpenGattExplorer}
      />
    </div>
  );
}
