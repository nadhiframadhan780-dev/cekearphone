import React, { useState } from 'react';
import {
  Headphones,
  Battery,
  BatteryCharging,
  Wifi,
  Radio,
  Sliders,
  Edit2,
  Terminal,
  Activity,
  Layers,
  Cpu,
  Info,
} from 'lucide-react';
import { DeviceInfo, BatteryHealthState } from '../types/device';
import { SourceTag } from './SourceTag';

interface DeviceProfileCardProps {
  device: DeviceInfo | null;
  battery: BatteryHealthState;
  onOpenGattExplorer?: () => void;
  onUpdateManualName: (newName: string) => void;
  isSimulated?: boolean;
}

export const DeviceProfileCard: React.FC<DeviceProfileCardProps> = ({
  device,
  battery,
  onOpenGattExplorer,
  onUpdateManualName,
  isSimulated = false,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [customNameInput, setCustomNameInput] = useState(device?.name || '');

  if (!device) {
    return (
      <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
          <Headphones className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-zinc-300">
            Belum Ada Perangkat Terhubung
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
            Pilih jalur &quot;Bluetooth (Nirkabel)&quot; untuk memindai earphone BLE, atau &quot;Kabel&quot; untuk mendeteksi jack 3.5 mm / USB DAC laptop Anda.
          </p>
        </div>
      </div>
    );
  }

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (customNameInput.trim()) {
      onUpdateManualName(customNameInput.trim());
    }
    setIsEditingName(false);
  };

  const getBatteryColor = (level: number | null) => {
    if (level === null) return 'text-zinc-500 stroke-zinc-700';
    if (level >= 50) return 'text-emerald-400 stroke-emerald-500';
    if (level >= 20) return 'text-amber-400 stroke-amber-500';
    return 'text-rose-400 stroke-rose-500';
  };

  const batteryLevel = battery.currentLevel;
  const isCharging = battery.status === 'charging';

  // SVG Circular progress math
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    batteryLevel !== null
      ? circumference - (batteryLevel / 100) * circumference
      : circumference;

  return (
    <div className="relative p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-6">
      {/* Top Banner if Simulated */}
      {isSimulated && (
        <div className="p-2 px-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-between">
          <span>⚠️ MODE DEMO: DATA SIMULASI (TIDAK DIBACA DARI HARDWARE FISIK)</span>
          <span className="font-mono text-[10px] uppercase">Simulasi</span>
        </div>
      )}

      {/* Main Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Device Name, Brand, & Connection Badges */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-800">
              {device.brand || 'Merek Standar'}
            </span>
            <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
              {device.connectionType === 'ble' ? 'Bluetooth BLE' : device.connectionType === 'jack_3_5' ? 'Analog 3.5mm Jack' : 'USB DAC'}
            </span>
            <SourceTag source={device.isSimulated ? 'TEST' : (device.sourceOfName === 'manual' ? 'TEST' : 'DEVICE')} />
          </div>

          {/* Editable Name */}
          {isEditingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customNameInput}
                onChange={(e) => setCustomNameInput(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-cyan-500 text-sm text-zinc-100 focus:outline-none"
                placeholder="Masukkan nama earphone..."
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 text-xs font-bold rounded-lg"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded-lg"
              >
                Batal
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2.5 pt-1">
              <h2 className="text-2xl font-extrabold text-zinc-100 tracking-tight">
                {device.name}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                title="Beri nama manual untuk earphone ini"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Model & Source of name transparency */}
          <div className="text-xs text-zinc-400 flex items-center gap-3 flex-wrap">
            <span>Model: <strong className="text-zinc-200">{device.model || 'Standar Audio'}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span>Sumber Nama:</span>
              <strong className="text-zinc-200 font-mono">
                {device.sourceOfName === 'gatt' && 'GATT device.name'}
                {device.sourceOfName === 'media_device' && 'MediaDevices label'}
                {device.sourceOfName === 'usb' && 'USB productName'}
                {device.sourceOfName === 'manual' && 'Input Manual'}
              </strong>
            </span>
          </div>
        </div>

        {/* Battery Ring Gauge */}
        <div className="flex items-center gap-4 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-zinc-800"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className={`transition-all duration-700 ease-out ${getBatteryColor(batteryLevel)}`}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {batteryLevel !== null ? (
                <>
                  <div className="flex items-center justify-center">
                    <span className="text-2xl font-extrabold text-zinc-100 font-mono">
                      {batteryLevel}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">%</span>
                  </div>
                  {isCharging ? (
                    <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-medium">
                      <BatteryCharging className="w-3 h-3" />
                      <span>Mengisi</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Live
                    </span>
                  )}
                </>
              ) : (
                <div className="text-center px-1">
                  <span className="text-xs text-zinc-500 font-medium block">
                    N/A
                  </span>
                  <span className="text-[9px] text-zinc-500 block leading-tight">
                    Proprietary
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-zinc-300">
              <Battery className="w-4 h-4 text-cyan-400" />
              <span>Status Baterai:</span>
            </div>
            <div>
              {batteryLevel !== null ? (
                <span className="font-semibold text-zinc-100 block">
                  {battery.status === 'charging' ? 'Sedang Mengisi Daya' : 'Aktif (Discharging)'}
                </span>
              ) : (
                <span className="text-zinc-400 block text-[11px]">
                  Tidak diekspos BLE (Gunakan Uji Daya Tahan)
                </span>
              )}
            </div>
            <div className="pt-1">
              <SourceTag source={battery.levelSource} />
            </div>
          </div>
        </div>
      </div>

      {/* Technical Details Grid */}
      <div className="pt-4 border-t border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/60 space-y-1">
          <span className="text-zinc-500 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5" />
            <span>Profil Audio</span>
          </span>
          <span className="font-mono font-semibold text-zinc-200 block">
            {device.audioProfile === 'stereo' || device.audioProfile === 'a2dp_stereo' ? 'Stereo (A2DP)' : 'Mono (HFP)'}
          </span>
          <span className="text-[10px] text-zinc-500">2 Kanal L/R</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/60 space-y-1">
          <span className="text-zinc-500 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" />
            <span>Sample Rate & Kanal</span>
          </span>
          <span className="font-mono font-semibold text-zinc-200 block">
            {device.sampleRate ? `${device.sampleRate / 1000} kHz` : '48.0 kHz'}
          </span>
          <span className="text-[10px] text-zinc-500">{device.channelCount || 2} Channel</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/60 space-y-1">
          <span className="text-zinc-500 flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5" />
            <span>Konektivitas</span>
          </span>
          <span className="font-mono font-semibold text-emerald-400 block">
            {device.connected ? 'Terhubung Live' : 'Terputus'}
          </span>
          <span className="text-[10px] text-zinc-500">
            {device.disconnectCount > 0 ? `${device.disconnectCount}x putus` : '0x disconnect'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/60 space-y-1">
          <span className="text-zinc-500 flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>Firmware / Rev</span>
          </span>
          <span className="font-mono font-semibold text-zinc-200 block truncate">
            {device.firmwareRevision || device.hardwareRevision || 'N/A (0x180A nihil)'}
          </span>
          <span className="text-[10px] text-zinc-500">
            {device.pnpId ? `VID 0x${device.pnpId.vendorId.toString(16).toUpperCase()}` : 'Standar SIG'}
          </span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-zinc-500 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-zinc-400" />
          <span>Profil Perangkat Terpadu (Menyatukan GATT BLE &amp; Audio Output)</span>
        </div>

        {device.connectionType === 'ble' && onOpenGattExplorer && (
          <button
            type="button"
            onClick={onOpenGattExplorer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Eksplorasi GATT (Read-Only)</span>
          </button>
        )}
      </div>
    </div>
  );
};
