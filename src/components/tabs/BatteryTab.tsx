import React, { useState, useEffect } from 'react';
import {
  Battery,
  BatteryCharging,
  Zap,
  Clock,
  TrendingDown,
  Play,
  Square,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { BatteryHealthState } from '../../types/device';
import { calculateEnduranceCapacity, calculateDrainRegression } from '../../utils/drainRegression';
import { audioService } from '../../services/audioService';
import { SourceTag } from '../SourceTag';

interface BatteryTabProps {
  battery: BatteryHealthState;
  onUpdateFactorySpec: (hours: number) => void;
  onStartEnduranceTest: () => void;
  onStopEnduranceTest: () => void;
  isSimulated?: boolean;
}

export const BatteryTab: React.FC<BatteryTabProps> = ({
  battery,
  onUpdateFactorySpec,
  onStartEnduranceTest,
  onStopEnduranceTest,
  isSimulated = false,
}) => {
  const [factoryInput, setFactoryInput] = useState(battery.factorySpecHours.toString());
  const [activeTab, setActiveTab] = useState<'summary' | 'endurance'>('summary');

  const handleSpecChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFactoryInput(e.target.value);
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateFactorySpec(parsed);
    }
  };

  // Run endurance estimate calculation
  const enduranceEstimate = calculateEnduranceCapacity(
    battery.enduranceTestDurationSec,
    battery.enduranceTestDropPercent,
    battery.drainRatePerHour || 0,
    battery.factorySpecHours
  );

  const durationMin = Math.floor(battery.enduranceTestDurationSec / 60);
  const durationSecRem = battery.enduranceTestDurationSec % 60;

  // Timeline SVG calculations
  const history = battery.history || [];
  const minTime = history.length > 0 ? history[0].timestamp : Date.now();
  const maxTime = history.length > 0 ? history[history.length - 1].timestamp : Date.now() + 1;
  const timeSpan = Math.max(1, maxTime - minTime);

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex border-b border-zinc-800 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'summary'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Battery className="w-4 h-4" />
          <span>Ringkasan &amp; Laju Kuras Live</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('endurance')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'endurance'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Uji Daya Tahan (Pink Noise Test)</span>
          {battery.enduranceTestActive && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>
      </div>

      {/* TAB 1: SUMMARY & LIVE METRICS */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Level */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-medium">Level Saat Ini</span>
                <SourceTag source={battery.levelSource} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-zinc-100 font-mono">
                  {battery.currentLevel !== null ? `${battery.currentLevel}%` : 'N/A'}
                </span>
                {battery.status === 'charging' && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <BatteryCharging className="w-3.5 h-3.5" />
                    <span>Mengisi</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                Resolusi data: lompatan ~{battery.detectedResolutionStep}%
              </p>
            </div>

            {/* Drain Rate */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-medium">Laju Kuras (OLS)</span>
                <SourceTag source={battery.drainRatePerHour !== null ? 'TEST' : 'UNAVAILABLE'} />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-zinc-100 font-mono">
                  {battery.drainRatePerHour !== null ? battery.drainRatePerHour.toFixed(1) : '—'}
                </span>
                <span className="text-xs text-zinc-400 font-mono">%/jam</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                {battery.drainRateUncertainty
                  ? `Rentang: ${battery.drainRateUncertainty.min} - ${battery.drainRateUncertainty.max}%/jam (${battery.drainRateUncertainty.confidence})`
                  : 'Membutuhkan minimal 2 pembacaan baterai'}
              </p>
            </div>

            {/* Remaining Time */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-medium">Perkiraan Sisa Waktu</span>
                <SourceTag source={battery.estimatedRemainingHours !== null ? 'ESTIMATE' : 'UNAVAILABLE'} />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-zinc-100 font-mono">
                  {battery.estimatedRemainingHours !== null
                    ? battery.estimatedRemainingHours.toFixed(1)
                    : '—'}
                </span>
                <span className="text-xs text-zinc-400 font-mono">jam</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Dihitung dari level saat ini ÷ laju kuras OLS
              </p>
            </div>

            {/* Battery Health / Capacity */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-medium">Kesehatan Baterai</span>
                <SourceTag source={battery.batteryHealthSource} />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-zinc-100 font-mono">
                  {battery.batteryHealthPercent !== null
                    ? `${battery.batteryHealthPercent}%`
                    : battery.effectiveCapacityEstimate !== null
                    ? `~${battery.effectiveCapacityEstimate}%`
                    : 'Belum diuji'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                {battery.batteryHealthPercent !== null
                  ? 'Dibaca dari GATT 0x2BEA'
                  : battery.effectiveCapacityEstimate !== null
                  ? 'Hasil Uji Daya Tahan'
                  : 'Jalankan Uji Daya Tahan'}
              </p>
            </div>
          </div>

          {/* Timeline Chart */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-bold text-zinc-200">
                  Grafik Riwayat Level Baterai Terhadap Waktu
                </h4>
                <p className="text-xs text-zinc-400">
                  Mencatat setiap pembacaan live ke IndexedDB lokal untuk regresi linear laju kuras.
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-500">
                {history.length} titik data tercatat
              </span>
            </div>

            {history.length < 2 ? (
              <div className="py-12 text-center text-xs text-zinc-500 bg-zinc-950 rounded-xl border border-zinc-800/80">
                Belum cukup titik data untuk menggambar grafik timeline. Biarkan earphone tersambung beberapa menit.
              </div>
            ) : (
              <div className="h-48 w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 relative overflow-hidden">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="20" x2="500" y2="20" stroke="#27272a" strokeDasharray="4 4" />
                  <line x1="0" y1="60" x2="500" y2="60" stroke="#27272a" strokeDasharray="4 4" />
                  <line x1="0" y1="100" x2="500" y2="100" stroke="#27272a" strokeDasharray="4 4" />

                  {/* Polyline */}
                  <polyline
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                    points={history
                      .map((pt) => {
                        const x = ((pt.timestamp - minTime) / timeSpan) * 500;
                        const y = 120 - (pt.level / 100) * 100 - 10;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />

                  {/* Points */}
                  {history.map((pt, i) => {
                    const x = ((pt.timestamp - minTime) / timeSpan) * 500;
                    const y = 120 - (pt.level / 100) * 100 - 10;
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="3.5"
                        className="fill-cyan-400 stroke-zinc-950 stroke-2"
                      />
                    );
                  })}
                </svg>

                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-2">
                  <span>Awal: {new Date(minTime).toLocaleTimeString()}</span>
                  <span>Terakhir: {new Date(maxTime).toLocaleTimeString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Per-Bud & Case (Honest Transparency) */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-zinc-200">
                Baterai Per-Bud (Kiri / Kanan / Casing Pengisi)
              </h4>
              <SourceTag source={battery.perBudSource} />
            </div>

            <p className="text-xs text-zinc-400">
              {battery.perBudSource === 'UNAVAILABLE'
                ? 'Sebagian besar earphone Bluetooth TWS di pasaran (Apple AirPods, Samsung Galaxy Buds, Sony WF-1000XM, Anker TWS) tidak membuka persentase baterai kiri/kanan/case secara terpisah lewat GATT BLE standar SIG. Protokol per-bud menggunakan frame enkripsi khusus vendor yang hanya terbaca di aplikasi resmi Android/iOS.'
                : 'Data per-bud terdeteksi lewat adapter vendor terdaftar.'}
            </p>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                <span className="text-[11px] text-zinc-500 block">Bud Kiri (L)</span>
                <span className="text-base font-bold text-zinc-400 font-mono">
                  {battery.leftBudLevel !== null ? `${battery.leftBudLevel}%` : 'N/A'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                <span className="text-[11px] text-zinc-500 block">Bud Kanan (R)</span>
                <span className="text-base font-bold text-zinc-400 font-mono">
                  {battery.rightBudLevel !== null ? `${battery.rightBudLevel}%` : 'N/A'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                <span className="text-[11px] text-zinc-500 block">Casing (Case)</span>
                <span className="text-base font-bold text-zinc-400 font-mono">
                  {battery.caseLevel !== null ? `${battery.caseLevel}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UJI DAYA TAHAN (ENDURANCE TEST) */}
      {activeTab === 'endurance' && (
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>Uji Daya Tahan Baterai (Pink Noise Stress Test)</span>
              </h3>
              <p className="text-xs text-zinc-400 max-w-2xl">
                Solusi objektif bagi earphone yang hanya melaporkan persentase baterai umum. Aplikasi memutar pink noise pada volume stabil sambil mencatat laju kuras baterai untuk menghitung kapasitas relatif terhadap klaim pabrik.
              </p>
            </div>

            {/* Start / Stop Button */}
            <div>
              {battery.enduranceTestActive ? (
                <button
                  type="button"
                  onClick={onStopEnduranceTest}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-950/40 transition-all cursor-pointer"
                >
                  <Square className="w-4 h-4" />
                  <span>Hentikan Uji Daya Tahan</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStartEnduranceTest}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/40 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>Mulai Uji Daya Tahan</span>
                </button>
              )}
            </div>
          </div>

          {/* Test Setup Inputs */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label htmlFor="factory-hours-input" className="block text-zinc-300 font-semibold mb-1">
                Klaim Daya Tahan Pabrik (Spesifikasi Resmi):
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="factory-hours-input"
                  type="number"
                  min="1"
                  max="60"
                  step="0.5"
                  value={factoryInput}
                  onChange={handleSpecChange}
                  className="w-28 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-sm focus:outline-none focus:border-cyan-400"
                />
                <span className="text-zinc-400">Jam (mis. 6 jam pada volume 50%)</span>
              </div>
            </div>

            <div className="space-y-1 text-zinc-400">
              <span className="text-zinc-300 font-semibold block">Proteksi Layar Aktif:</span>
              <div className="flex items-center gap-1.5 text-cyan-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Screen Wake Lock diaktifkan otomatis agar laptop tidak sleep saat tes.</span>
              </div>
            </div>
          </div>

          {/* Active Live Progress */}
          <div className="p-5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-semibold text-zinc-200">Progres Pengujian Daya Tahan:</span>
              <span className="font-mono text-cyan-400 font-bold text-sm">
                Durasi: {durationMin}m {durationSecRem}s • Penurunan: {battery.enduranceTestDropPercent.toFixed(1)}%
              </span>
            </div>

            {/* Strict Condition Checks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Syarat 1: Durasi minimal 20 menit</span>
                <span className={durationMin >= 20 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  {durationMin}/20 Menit {durationMin >= 20 ? '✓' : ''}
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-500 h-full transition-all"
                  style={{ width: `${Math.min(100, (durationMin / 20) * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                <span>Syarat 2: Penurunan baterai minimal 5%</span>
                <span className={battery.enduranceTestDropPercent >= 5 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  {battery.enduranceTestDropPercent.toFixed(1)}/5.0% {battery.enduranceTestDropPercent >= 5 ? '✓' : ''}
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${Math.min(100, (battery.enduranceTestDropPercent / 5) * 100)}%` }}
                />
              </div>
            </div>

            {/* Estimation Result */}
            <div className="pt-3 border-t border-zinc-800/80">
              {enduranceEstimate.canEstimate ? (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-300">
                      Estimasi Kapasitas Efektif:
                    </span>
                    <SourceTag source="ESTIMATE" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-emerald-400 font-mono">
                      {enduranceEstimate.effectiveCapacityPercent}%
                    </span>
                    <span className="text-xs text-zinc-300">
                      dari spek pabrik ({battery.factorySpecHours} jam)
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300">
                    Rentang toleransi: {enduranceEstimate.rangeMinPercent}% – {enduranceEstimate.rangeMaxPercent}% (Keyakinan: {enduranceEstimate.confidence})
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-zinc-200">Status Estimasi:</strong>
                    <p className="mt-0.5">{enduranceEstimate.reason || 'Data belum cukup untuk kalkulasi kapasitas.'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Influencing factors honest explanation */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 space-y-2">
              <strong className="text-zinc-300 block">Faktor-Faktor yang Mempengaruhi Hasil Pengujian:</strong>
              <p className="leading-relaxed">
                Klaim pabrik (mis. 6 jam) diukur pada volume 50%, ANC dimatikan, dan codec dasar SBC. Jika Anda mengaktifkan Active Noise Cancellation (ANC), memakai codec hi-res (LDAC), atau suhu ruangan dingin/panas, kapasitas efektif nyata dapat berada di rentang 75%–115%.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
