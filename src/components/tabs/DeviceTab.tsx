import React, { useState } from 'react';
import {
  Bluetooth,
  Cable,
  Search,
  RefreshCw,
  Usb,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Link2,
} from 'lucide-react';
import { DeviceInfo } from '../../types/device';
import { AudioEndpoint, mediaDeviceService } from '../../services/mediaDeviceService';
import { SourceTag } from '../SourceTag';

interface DeviceTabProps {
  currentDevice: DeviceInfo | null;
  onConnectBluetooth: (mode: 'all' | 'battery_filter') => Promise<void>;
  onSelectWiredDevice: (endpoint: AudioEndpoint, customName?: string) => void;
  audioOutputs: AudioEndpoint[];
  isScanningBt: boolean;
  btError: string | null;
  onClearError: () => void;
}

export const DeviceTab: React.FC<DeviceTabProps> = ({
  currentDevice,
  onConnectBluetooth,
  onSelectWiredDevice,
  audioOutputs,
  isScanningBt,
  btError,
  onClearError,
}) => {
  const [activeTab, setActiveTab] = useState<'bluetooth' | 'wired'>('bluetooth');
  const [customWiredName, setCustomWiredName] = useState('');
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('');
  const [usbScanResult, setUsbScanResult] = useState<any | null>(null);
  const [isScanningUsb, setIsScanningUsb] = useState(false);
  const [usbError, setUsbError] = useState<string | null>(null);

  const handleScanUsb = async () => {
    setIsScanningUsb(true);
    setUsbError(null);
    try {
      const res = await mediaDeviceService.scanUsbDevice();
      setUsbScanResult(res);
    } catch (e: any) {
      setUsbError(e.message || 'Gagal memindai WebUSB');
    } finally {
      setIsScanningUsb(false);
    }
  };

  const handleSelectWired = (endpoint: AudioEndpoint) => {
    setSelectedEndpointId(endpoint.deviceId);
    onSelectWiredDevice(endpoint, customWiredName.trim() || undefined);
  };

  return (
    <div className="space-y-6">
      {/* Route Switcher: Bluetooth vs Wired */}
      <div className="flex border-b border-zinc-800 gap-4">
        <button
          type="button"
          onClick={() => {
            setActiveTab('bluetooth');
            onClearError();
          }}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'bluetooth'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Bluetooth className="w-4 h-4" />
          <span>Jalur Bluetooth (Nirkabel)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('wired');
            onClearError();
          }}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'wired'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Cable className="w-4 h-4" />
          <span>Jalur Kabel (Jack 3.5 mm / USB-C / USB-A)</span>
        </button>
      </div>

      {/* BLUETOOTH SECTION */}
      {activeTab === 'bluetooth' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Bluetooth className="w-5 h-5 text-cyan-400" />
                  <span>Pindai &amp; Sambungkan Earphone Bluetooth</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                  Memeriksa nama asli perangkat, model, versi firmware (0x180A), dan persentase baterai live (0x180F) secara langsung dari earphone.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onConnectBluetooth('all')}
                  disabled={isScanningBt}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/40 transition-all cursor-pointer"
                >
                  {isScanningBt ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>Pindai Earphone (Semua BLE)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onConnectBluetooth('battery_filter')}
                  disabled={isScanningBt}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 font-semibold text-xs flex items-center gap-2 border border-zinc-700 transition-all cursor-pointer"
                  title="Hanya menampilkan earphone yang mengiklankan battery_service di paket advertensi BLE"
                >
                  <Search className="w-4 h-4 text-cyan-400" />
                  <span>Filter Layanan Baterai</span>
                </button>
              </div>
            </div>

            {/* Error Message if Any */}
            {btError && (
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/80 text-xs text-rose-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong>Pemberitahuan Koneksi:</strong>
                  <p>{btError}</p>
                </div>
              </div>
            )}

            {/* Platform Honesty Box */}
            <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs text-zinc-400 space-y-2">
              <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>Batasan Platform Web Bluetooth:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li>
                  Hanya mendeteksi perangkat <strong>Bluetooth Low Energy (BLE)</strong> di browser Chromium desktop (Chrome/Edge/Opera).
                </li>
                <li>
                  Nomor Seri (Serial Number String 0x2A25) sengaja diblokir oleh browser demi privasi pengguna dan akan ditampilkan sebagai <SourceTag source="UNAVAILABLE" customText="DIBATASI BROWSER" />.
                </li>
                <li>
                  Sebagian TWS seperti AirPods atau Galaxy Buds menyembunyikan level baterai di protokol vendor tertutup; baterai live akan berstatus <SourceTag source="UNAVAILABLE" /> dan Anda dapat menggunakan menu <strong>Uji Daya Tahan</strong> untuk estimasi kapasitas.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* WIRED SECTION */}
      {activeTab === 'wired' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Cable className="w-5 h-5 text-emerald-400" />
                <span>Daftar Endpoint Audio Kabel (Jack 3.5 mm &amp; USB DAC)</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Colok earphone ke jack audio atau port USB-C laptop Anda. Daftar di bawah ini diperbarui secara real-time saat Anda menancapkan atau mencabut kabel.
              </p>
            </div>

            {/* Custom Name / Brand Input */}
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
              <label htmlFor="custom-earphone-input" className="block text-xs font-semibold text-zinc-300">
                Beri Nama / Merek Earphone Anda (Opsional):
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="custom-earphone-input"
                  type="text"
                  placeholder="Mis. KZ ZSN Pro, Moondrop Chu II, Apple Earpods, Sony MDR-XB55AP..."
                  value={customWiredName}
                  onChange={(e) => setCustomWiredName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                />
                <span className="text-[11px] text-zinc-500 hidden sm:inline">
                  (Jack 3.5mm analog tidak memiliki ID digital)
                </span>
              </div>
            </div>

            {/* Detected Endpoints List */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                Pilih Output Audio Earphone:
              </span>

              {audioOutputs.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-950 rounded-xl border border-zinc-800">
                  Tidak ada output audio terdeteksi. Pastikan izin media diberikan ke browser.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {audioOutputs.map((ep) => {
                    const isSelected = selectedEndpointId === ep.deviceId || currentDevice?.sinkId === ep.deviceId;
                    return (
                      <div
                        key={ep.deviceId}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md shadow-cyan-950/20'
                            : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-cyan-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                            <Volume2 className="w-4 h-4" />
                          </div>
                          <div>
                            <strong className="text-xs sm:text-sm text-zinc-100 block">
                              {ep.label || 'Default Soundcard Audio Output'}
                            </strong>
                            <span className="text-[11px] font-mono text-zinc-500 block truncate max-w-md">
                              ID: {ep.deviceId.slice(0, 24)}... • Group: {ep.groupId.slice(0, 12)}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectWired(ep)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500 text-zinc-950'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                          }`}
                        >
                          {isSelected ? 'Terpilih ✓' : 'Gunakan'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* WebUSB Dongle Scanner */}
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3 pt-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Usb className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-zinc-200">
                    Pemeriksa DAC USB-C / USB-A Tambahan (WebUSB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleScanUsb}
                  disabled={isScanningUsb}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 border border-zinc-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isScanningUsb ? 'Mencari...' : 'Pindai USB DAC'}</span>
                </button>
              </div>

              {usbScanResult && (
                <div className="p-3 rounded-lg bg-zinc-900 border border-cyan-800/60 text-xs font-mono space-y-1">
                  <div className="text-emerald-400 font-bold">✓ DAC USB Terdeteksi:</div>
                  <div className="text-zinc-200">Produk: {usbScanResult.productName || 'USB Audio Device'}</div>
                  <div className="text-zinc-400">Pabrikan: {usbScanResult.manufacturerName || 'N/A'}</div>
                  <div className="text-zinc-500">VID: 0x{usbScanResult.vendorId.toString(16).toUpperCase()} • PID: 0x{usbScanResult.productId.toString(16).toUpperCase()}</div>
                </div>
              )}

              {usbError && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-900 text-rose-300 text-xs">
                  {usbError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
