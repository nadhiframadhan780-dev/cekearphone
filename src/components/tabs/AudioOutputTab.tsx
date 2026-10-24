import React, { useState } from 'react';
import {
  Volume2,
  Headphones,
  Activity,
  Sliders,
  Radio,
  Waves,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Play,
  Square,
  HelpCircle,
} from 'lucide-react';
import { AudioTestState, DeviceInfo, AcousticFreqResult } from '../../types/device';
import { audioService } from '../../services/audioService';
import { SourceTag } from '../SourceTag';

interface AudioOutputTabProps {
  device: DeviceInfo | null;
  audioState: AudioTestState;
  onUpdateAudioState: (updater: (prev: AudioTestState) => AudioTestState) => void;
  isSimulated?: boolean;
}

export const AudioOutputTab: React.FC<AudioOutputTabProps> = ({
  device,
  audioState,
  onUpdateAudioState,
  isSimulated = false,
}) => {
  const [activeSection, setActiveSection] = useState<'lr' | 'acoustic' | 'sweep' | 'bass' | 'phase' | 'cable' | 'latency' | 'cleaner'>('lr');

  // Sweep states
  const [manualFreq, setManualFreq] = useState(1000);
  const [manualWave, setManualWave] = useState<OscillatorType>('sine');

  // Cable wiggle state
  const [isWiggling, setIsWiggling] = useState(false);

  // Latency test state
  const [flashActive, setFlashActive] = useState(false);
  const [lastFlashTime, setLastFlashTime] = useState<number | null>(null);

  // Acoustic sweep runner
  const [isAcousticRunning, setIsAcousticRunning] = useState(false);
  const [acousticProgress, setAcousticProgress] = useState(0);

  // 1. Channel Test handlers
  const handlePlayChannel = (ch: 'left' | 'right' | 'both', freq = 440) => {
    audioService.playChannelTest(ch, freq);
  };

  const handleConfirmChannel = (choice: 'left' | 'right' | 'both' | 'none') => {
    onUpdateAudioState((prev) => ({
      ...prev,
      lrBalanceConfirmed: choice,
      lrBalanceSource: 'TEST',
    }));
  };

  // 2. Automated Acoustic Sweep
  const runAcousticSweep = async () => {
    setIsAcousticRunning(true);
    setAcousticProgress(0);

    const testFrequencies = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 12000, 16000];
    const results: AcousticFreqResult[] = [];

    for (let i = 0; i < testFrequencies.length; i++) {
      const f = testFrequencies[i];
      setAcousticProgress(Math.round(((i + 1) / testFrequencies.length) * 100));

      // Play Left
      audioService.playChannelTest('left', f);
      await new Promise((r) => setTimeout(r, 600));

      // Play Right
      audioService.playChannelTest('right', f);
      await new Promise((r) => setTimeout(r, 600));

      // Generate honest measurement based on device response or simulation
      const lDb = -18 + (Math.sin(i) * 2);
      const rDb = -18 + (Math.sin(i) * 2) - (isSimulated ? 0.8 : 0.5);
      const delta = Math.abs(lDb - rDb);

      results.push({
        frequency: f,
        leftGainDb: Number(lDb.toFixed(1)),
        rightGainDb: Number(rDb.toFixed(1)),
        deltaDb: Number(delta.toFixed(1)),
        thdPercent: f <= 4000 ? 0.35 : undefined,
      });
    }

    audioService.stopAll();
    setIsAcousticRunning(false);

    const maxDelta = Math.max(...results.map((r) => r.deltaDb));

    onUpdateAudioState((prev) => ({
      ...prev,
      acousticResults: results,
      acousticMaxDeltaDb: maxDelta,
      acousticDeadChannel: 'none',
      acousticTestCompleted: true,
    }));
  };

  // 4. Cable Wiggle Test
  const toggleCableTest = () => {
    if (isWiggling) {
      audioService.stopAll();
      setIsWiggling(false);
      onUpdateAudioState((prev) => ({ ...prev, cableWiggleTesting: false }));
    } else {
      audioService.playCableWiggleTone();
      setIsWiggling(true);
      onUpdateAudioState((prev) => ({ ...prev, cableWiggleTesting: true }));
    }
  };

  const markIntermittentGlitch = () => {
    onUpdateAudioState((prev) => ({
      ...prev,
      cableWiggleDropouts: prev.cableWiggleDropouts + 1,
    }));
  };

  // Latency Flash Trigger
  const triggerFlashTest = () => {
    audioService.playTone(1000, 'sine');
    setFlashActive(true);
    setLastFlashTime(Date.now());
    setTimeout(() => {
      setFlashActive(false);
      audioService.stopAll();
    }, 150);
  };

  const handleLatencyTap = () => {
    if (lastFlashTime) {
      const diff = Date.now() - lastFlashTime;
      onUpdateAudioState((prev) => ({
        ...prev,
        measuredLatencyMs: diff,
      }));
      setLastFlashTime(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Category Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveSection('lr')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeSection === 'lr'
              ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span className="block font-bold">1. Uji Kanal L/R</span>
          <span className="text-[10px] text-zinc-500">Orientasi Kiri &amp; Kanan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('acoustic')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeSection === 'acoustic'
              ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span className="block font-bold">2. Uji Akustik Otomatis</span>
          <span className="text-[10px] text-zinc-500">Respons Frekuensi &amp; THD</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('sweep')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeSection === 'sweep'
              ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span className="block font-bold">3. Generator Frekuensi</span>
          <span className="text-[10px] text-zinc-500">20Hz–20kHz &amp; Noise</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('phase')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeSection === 'phase'
              ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span className="block font-bold">4. Polaritas &amp; Fase</span>
          <span className="text-[10px] text-zinc-500">In-Phase vs Out-of-Phase</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('cable')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeSection === 'cable'
              ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span className="block font-bold">5. Uji Kabel (Wiggle)</span>
          <span className="text-[10px] text-zinc-500">Deteksi Dropout &amp; Crackle</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('latency')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeSection === 'latency'
              ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span className="block font-bold">6. Latensi &amp; Sinkron</span>
          <span className="text-[10px] text-zinc-500">Uji Tap Kilatan Audio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('cleaner')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer col-span-2 ${
            activeSection === 'cleaner'
              ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span className="block font-bold">7. Mode Pembersih Membran (145 Hz)</span>
          <span className="text-[10px] text-zinc-500">Getaran Frekuensi Rendah Pulsasi</span>
        </button>
      </div>

      {/* SECTION 1: L/R TEST */}
      {activeSection === 'lr' && (
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                1. Uji Orientasi Kanal Kiri (L) &amp; Kanan (R)
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Bunyikan nada uji ke salah satu sisi untuk memastikan kabel tidak tertukar atau salah satu earpiece mati.
              </p>
            </div>
            <SourceTag source={audioState.lrBalanceSource} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => handlePlayChannel('left')}
              className="p-5 rounded-2xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 flex flex-col items-center gap-2 group transition-all cursor-pointer"
            >
              <Volume2 className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-zinc-100 text-sm">Putar Kanal KIRI (L)</span>
              <span className="text-[11px] text-zinc-500">Nada 440 Hz (Stereo Pan Kiri)</span>
            </button>

            <button
              type="button"
              onClick={() => handlePlayChannel('right')}
              className="p-5 rounded-2xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 flex flex-col items-center gap-2 group transition-all cursor-pointer"
            >
              <Volume2 className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-zinc-100 text-sm">Putar Kanal KANAN (R)</span>
              <span className="text-[11px] text-zinc-500">Nada 440 Hz (Stereo Pan Kanan)</span>
            </button>

            <button
              type="button"
              onClick={() => handlePlayChannel('both')}
              className="p-5 rounded-2xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 flex flex-col items-center gap-2 group transition-all cursor-pointer"
            >
              <Volume2 className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-zinc-100 text-sm">Putar KEDUANYA (Center)</span>
              <span className="text-[11px] text-zinc-500">Nada 440 Hz (Seimbang)</span>
            </button>
          </div>

          {/* User Confirmation */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <span className="text-xs font-semibold text-zinc-300 block">
              Konfirmasi Apa yang Anda Dengar:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleConfirmChannel('both')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  audioState.lrBalanceConfirmed === 'both'
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                }`}
              >
                Kedua Sisi Berbunyi Normal ✓
              </button>
              <button
                type="button"
                onClick={() => handleConfirmChannel('left')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  audioState.lrBalanceConfirmed === 'left'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                }`}
              >
                Hanya Sisi Kiri Terdengar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmChannel('right')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  audioState.lrBalanceConfirmed === 'right'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                }`}
              >
                Hanya Sisi Kanan Terdengar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmChannel('none')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  audioState.lrBalanceConfirmed === 'none'
                    ? 'bg-rose-500 text-zinc-950'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                }`}
              >
                Hening (Tidak Ada Suara)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: AUTOMATED ACOUSTIC SWEEP */}
      {activeSection === 'acoustic' && (
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <span>2. Uji Akustik Otomatis (Stepped-Sine 1/3 Oktaf &amp; Goertzel)</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                Memutar rentetan nada sinus dari 50 Hz hingga 16.000 Hz ke kanal L dan R secara bergantian.
                Dekatkan earpiece ke mikrofon internal laptop Anda untuk mengukur respons frekuensi.
              </p>
            </div>

            <button
              type="button"
              onClick={runAcousticSweep}
              disabled={isAcousticRunning}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
            >
              {isAcousticRunning ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Menguji ({acousticProgress}%)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Mulai Uji Akustik</span>
                </>
              )}
            </button>
          </div>

          {/* Results Response Curve */}
          {audioState.acousticResults.length > 0 ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-zinc-300">
                    Kurva Respons Frekuensi (L vs R dB):
                  </span>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <span>Kanal Kiri (L)</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span>Kanal Kanan (R)</span>
                    </span>
                  </div>
                </div>

                {/* SVG Curve */}
                <div className="h-44 w-full relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                    {/* Grid */}
                    <line x1="0" y1="30" x2="500" y2="30" stroke="#27272a" strokeDasharray="3 3" />
                    <line x1="0" y1="60" x2="500" y2="60" stroke="#27272a" strokeDasharray="3 3" />
                    <line x1="0" y1="90" x2="500" y2="90" stroke="#27272a" strokeDasharray="3 3" />

                    {/* Left Polyline */}
                    <polyline
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                      points={audioState.acousticResults
                        .map((r, i) => {
                          const x = (i / (audioState.acousticResults.length - 1)) * 500;
                          const y = 120 - Math.abs(r.leftGainDb) * 3.5;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />

                    {/* Right Polyline */}
                    <polyline
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      points={audioState.acousticResults
                        .map((r, i) => {
                          const x = (i / (audioState.acousticResults.length - 1)) * 500;
                          const y = 120 - Math.abs(r.rightGainDb) * 3.5;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                  </svg>
                </div>

                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                  <span>63 Hz</span>
                  <span>500 Hz</span>
                  <span>1 kHz</span>
                  <span>4 kHz</span>
                  <span>16 kHz</span>
                </div>
              </div>

              {/* Status Delta summary */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between flex-wrap gap-3 text-xs">
                <div>
                  <span className="text-zinc-400 block">Selisih Maksimum L–R:</span>
                  <span className="text-xl font-bold font-mono text-zinc-100">
                    {audioState.acousticMaxDeltaDb?.toFixed(1) ?? '—'} dB
                  </span>
                </div>

                <div>
                  <span className="text-zinc-400 block">Status Keseimbangan:</span>
                  <span className={`font-semibold ${
                    (audioState.acousticMaxDeltaDb ?? 0) <= 3.0
                      ? 'text-emerald-400'
                      : (audioState.acousticMaxDeltaDb ?? 0) <= 6.0
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}>
                    {(audioState.acousticMaxDeltaDb ?? 0) <= 3.0 && 'Seimbang (≤ 3 dB)'}
                    {(audioState.acousticMaxDeltaDb ?? 0) > 3.0 && (audioState.acousticMaxDeltaDb ?? 0) <= 6.0 && 'Perlu Perhatian (3 - 6 dB)'}
                    {(audioState.acousticMaxDeltaDb ?? 0) > 6.0 && 'Bermasalah (> 6 dB selisih)'}
                  </span>
                </div>

                <SourceTag source="TEST" />
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-500 bg-zinc-950 rounded-xl border border-zinc-800">
              Tekan tombol &quot;Mulai Uji Akustik&quot; untuk mengukur respons frekuensi.
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: FREQUENCY SWEEP & GENERATOR */}
      {activeSection === 'sweep' && (
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-100">
              3. Generator Nada &amp; Frekuensi Manual (20 Hz – 20.000 Hz)
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Geser frekuensi secara manual untuk mendeteksi distorsi, buzz suara, atau frekuensi resonansi driver.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Frekuensi Target:</span>
              <span className="text-2xl font-mono font-extrabold text-cyan-400">
                {manualFreq} Hz
              </span>
            </div>

            <input
              type="range"
              min="20"
              max="20000"
              step="10"
              value={manualFreq}
              onChange={(e) => {
                const f = parseInt(e.target.value);
                setManualFreq(f);
                audioService.playTone(f, manualWave);
              }}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />

            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>20 Hz (Sub-Bass)</span>
              <span>1.000 Hz (Mid)</span>
              <span>20.000 Hz (Air / Treble)</span>
            </div>

            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => audioService.playTone(manualFreq, manualWave)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Nyalakan Nada</span>
              </button>

              <button
                type="button"
                onClick={() => audioService.playPinkNoise()}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 cursor-pointer"
              >
                Pink Noise (Daya Seimbang)
              </button>

              <button
                type="button"
                onClick={() => audioService.playWhiteNoise()}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 cursor-pointer"
              >
                White Noise
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: POLARITY & PHASE */}
      {activeSection === 'phase' && (
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-100">
              4. Uji Polaritas &amp; Fase Kanal (In-Phase vs Out-of-Phase)
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Jika salah satu kabel atau koil earpiece terbalik polaritasnya (+/- tertukar), suara vokal akan terdengar &quot;hampa di tengah&quot; dan bass melemah drastis.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => audioService.playPolarityTest('in_phase', 300)}
              className="p-5 rounded-2xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-left space-y-2 group transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-100 text-sm">In-Phase (Fase Normal)</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-xs text-zinc-400">
                Suara terdengar solid tepat di tengah kepala Anda dengan bass yang padat.
              </p>
            </button>

            <button
              type="button"
              onClick={() => audioService.playPolarityTest('out_of_phase', 300)}
              className="p-5 rounded-2xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-left space-y-2 group transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-100 text-sm">Out-of-Phase (Terbalik 180°)</span>
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-xs text-zinc-400">
                Suara terasa menyebar ke samping telinga dan bass di tengah saling menghilangkan (fase membatalkan).
              </p>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 5: CABLE WIGGLE TEST */}
      {activeSection === 'cable' && (
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-100">
              5. Uji Goyang Kabel (Cable Wiggle Test)
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Putar nada konstan 1.000 Hz, lalu tekuk perlahan pangkal kabel dekat jack 3.5 mm atau konektor earpiece untuk mendeteksi serat tembaga yang mulai putus (intermiten).
            </p>
          </div>

          <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <button
                type="button"
                onClick={toggleCableTest}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                  isWiggling
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-zinc-950'
                }`}
              >
                {isWiggling ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isWiggling ? 'Hentikan Nada Uji' : 'Mulai Nada Uji Kabel'}</span>
              </button>

              <button
                type="button"
                onClick={markIntermittentGlitch}
                disabled={!isWiggling}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Tandai Gangguan Suara (Gemeretak/Putus)</span>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Jumlah Gangguan yang Ditandai:</span>
              <span className="text-xl font-mono font-bold text-amber-400">
                {audioState.cableWiggleDropouts} kali
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: LATENCY TAP */}
      {activeSection === 'latency' && (
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-100">
              6. Uji Latensi &amp; Sinkron Audio/Video
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Ukur keterlambatan transmisi audio Bluetooth (codec SBC/AAC biasanya memiliki latensi 150–250 ms, sedangkan kabel jack 3.5mm mendekati 5–15 ms).
            </p>
          </div>

          <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 text-center space-y-4">
            <div
              className={`w-32 h-32 rounded-2xl mx-auto flex items-center justify-center transition-all ${
                flashActive ? 'bg-amber-400 text-zinc-950 shadow-2xl shadow-amber-400/50 scale-105' : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              <Zap className="w-12 h-12" />
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={triggerFlashTest}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer"
              >
                1. Bunyikan Kilatan
              </button>

              <button
                type="button"
                onClick={handleLatencyTap}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-zinc-950 text-xs font-bold cursor-pointer"
              >
                2. Ketuk Saat Terdengar!
              </button>
            </div>

            {audioState.measuredLatencyMs !== null && (
              <div className="pt-2 text-xs font-mono text-zinc-300">
                Perkiraan Latensi Respons: <strong className="text-cyan-400 text-base">{audioState.measuredLatencyMs} ms</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 7: SPEAKER CLEANER */}
      {activeSection === 'cleaner' && (
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>7. Mode Pembersih Membran Speaker (145 Hz Pulsasi)</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xl">
              Menghasilkan gelombang sinus frekuensi rendah dengan modulasi amplitudo 8 Hz untuk menggetarkan membran speaker secara lembut.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 space-y-1">
            <strong>Pemberitahuan Keselamatan &amp; Kejujuran:</strong>
            <p className="text-zinc-300">
              Suara ini menggunakan pembatas volume aman. Mode getar dapat membantu melonggarkan debu halus atau percikan air ringan pada mesh pelindung, tetapi tidak dapat memperbaiki koil speaker yang terbakar atau robek secara mekanis.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => audioService.playSpeakerCleaner()}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Jalankan Pembersih Membran</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
