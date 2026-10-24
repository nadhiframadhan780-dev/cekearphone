import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Activity,
  AlertTriangle,
  Play,
  Square,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { MicTestState } from '../../types/device';
import { AudioEndpoint } from '../../services/mediaDeviceService';
import { micService, MicAnalysisData } from '../../services/micService';
import { SourceTag } from '../SourceTag';

interface MicrophoneTabProps {
  micState: MicTestState;
  onUpdateMicState: (updater: (prev: MicTestState) => MicTestState) => void;
  audioInputs: AudioEndpoint[];
  isSimulated?: boolean;
}

export const MicrophoneTab: React.FC<MicrophoneTabProps> = ({
  micState,
  onUpdateMicState,
  audioInputs,
  isSimulated = false,
}) => {
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recCountdown, setRecCountdown] = useState(5);
  const [liveData, setLiveData] = useState<MicAnalysisData>({
    peakDbfs: -120,
    rmsDbfs: -120,
    clipping: false,
    dcOffset: 0,
    fftData: new Uint8Array(128),
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stop mic on unmount
  useEffect(() => {
    return () => {
      micService.stopMonitoring();
    };
  }, []);

  // Live Canvas FFT Spectrogram
  useEffect(() => {
    if (!canvasRef.current || !isMonitoring) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const data = liveData.fftData;
    const barWidth = (canvas.width / data.length) * 2;
    let x = 0;

    for (let i = 0; i < data.length / 2; i++) {
      const barHeight = (data[i] / 255) * canvas.height;
      // Gradient: cyan to emerald
      ctx.fillStyle = data[i] > 200 ? '#f43f5e' : '#06b6d4';
      ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
      x += barWidth;
    }
  }, [liveData, isMonitoring]);

  const toggleMonitoring = async () => {
    if (isMonitoring) {
      micService.stopMonitoring();
      setIsMonitoring(false);
    } else {
      try {
        const info = await micService.startMonitoring(selectedMicId, (d) => {
          setLiveData(d);
          if (d.clipping) {
            onUpdateMicState((prev) => ({ ...prev, clippingDetected: true }));
          }
        });

        setIsMonitoring(true);
        onUpdateMicState((prev) => ({
          ...prev,
          actualSampleRate: info.sampleRate,
          actualChannelCount: info.channelCount,
          isHfpProfile: info.isHfp,
          tested: true,
        }));
      } catch (err: any) {
        alert(`Gagal mengakses mikrofon: ${err.message}`);
      }
    }
  };

  const handleRecordClip = async () => {
    setIsRecording(true);
    setRecCountdown(5);

    const timer = setInterval(() => {
      setRecCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    try {
      const url = await micService.recordClip(5);
      onUpdateMicState((prev) => ({
        ...prev,
        recordedAudioUrl: url,
        tested: true,
      }));
    } catch (e: any) {
      console.warn('Gagal merekam klip:', e);
    } finally {
      setIsRecording(false);
      clearInterval(timer);
    }
  };

  // Convert dBFS (-120 to 0) to meter percentage (0 - 100)
  const getMeterPercent = (dbfs: number) => {
    if (dbfs <= -90) return 0;
    if (dbfs >= 0) return 100;
    return ((dbfs + 90) / 90) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice on Bluetooth HFP Transition */}
      <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-zinc-100 font-semibold block">
            Pemberitahuan Profil Audio Bluetooth:
          </strong>
          <p className="text-zinc-300 leading-relaxed">
            Mengaktifkan mikrofon earphone Bluetooth biasanya memindahkan earphone ke profil <strong>HFP (Hands-Free Profile)</strong>, yang membatasi sample rate output ke mono 8/16 kHz demi menghemat bandwidth nirkabel. Dianjurkan menyelesaikan semua uji suara di tab &quot;Uji Audio Output&quot; terlebih dahulu sebelum menyalakan mikrofon.
          </p>
        </div>
      </div>

      {/* Main Mic Card */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Mic className="w-5 h-5 text-cyan-400" />
              <span>Pengujian Kualitas Mikrofon Earphone</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Menganalisis sinyal suara mentah tanpa reduksi noise tambahan dari OS untuk mengukur noise floor, deteksi clipping, dan respons frekuensi.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={toggleMonitoring}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                isMonitoring
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-zinc-950 shadow-lg'
              }`}
            >
              {isMonitoring ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isMonitoring ? 'Matikan Monitor Mic' : 'Nyalakan Monitor Mic'}</span>
            </button>
          </div>
        </div>

        {/* Mic Selector */}
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
          <label htmlFor="mic-select-dropdown" className="text-xs font-semibold text-zinc-300 block">
            Pilih Mikrofon Target:
          </label>
          <select
            id="mic-select-dropdown"
            value={selectedMicId}
            onChange={(e) => setSelectedMicId(e.target.value)}
            disabled={isMonitoring}
            className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="">Default Mikrofon Sistem (Bawaan Laptop)</option>
            {audioInputs.map((input) => (
              <option key={input.deviceId} value={input.deviceId}>
                {input.label || `Mikrofon (${input.deviceId.slice(0, 12)}...)`}
              </option>
            ))}
          </select>
        </div>

        {/* Live VU Meter (Peak & RMS) */}
        <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-200">Level VU Meter Real-Time (dBFS):</span>
            <div className="flex items-center gap-3 font-mono">
              <span className="text-zinc-400">Peak: <strong className="text-cyan-400">{liveData.peakDbfs.toFixed(1)} dBFS</strong></span>
              <span className="text-zinc-400">RMS: <strong className="text-emerald-400">{liveData.rmsDbfs.toFixed(1)} dBFS</strong></span>
            </div>
          </div>

          {/* Peak Meter Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>-90 dB</span>
              <span>-40 dB</span>
              <span>-20 dB</span>
              <span>-6 dB</span>
              <span>0 dBFS (Clip)</span>
            </div>
            <div className="w-full bg-zinc-800 h-3 rounded-md overflow-hidden relative">
              <div
                className={`h-full transition-all duration-75 ${
                  liveData.peakDbfs >= -0.5
                    ? 'bg-rose-500'
                    : liveData.peakDbfs >= -6
                    ? 'bg-amber-400'
                    : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                }`}
                style={{ width: `${getMeterPercent(liveData.peakDbfs)}%` }}
              />
            </div>
          </div>

          {/* Clipping Alert */}
          {liveData.clipping && (
            <div className="p-2 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>TERDETEKSI CLIPPING: Sinyal mencapai 0 dBFS! Suara akan terdistorsi (pecah).</span>
            </div>
          )}

          {/* Canvas Live FFT Spectrum */}
          <div className="space-y-1 pt-2">
            <span className="text-xs text-zinc-400 block">Spektrogram Frekuensi Live:</span>
            <div className="h-28 w-full bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 p-1 flex items-center justify-center">
              {isMonitoring ? (
                <canvas ref={canvasRef} width={400} height={100} className="w-full h-full" />
              ) : (
                <span className="text-xs text-zinc-600">Nyalakan monitor mic untuk melihat spektrum frekuensi</span>
              )}
            </div>
          </div>
        </div>

        {/* Technical Audio Format Specs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-zinc-500 block">Sample Rate Aktual</span>
            <span className="font-mono font-bold text-zinc-100 text-sm">
              {micState.actualSampleRate ? `${micState.actualSampleRate / 1000} kHz` : 'Belum diuji'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-zinc-500 block">Profil Bluetooth</span>
            <span className="font-mono font-bold text-cyan-400 text-sm">
              {micState.isHfpProfile ? 'HFP/HSP (Mono Voice)' : 'Full-Band Audio'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-zinc-500 block">DC Offset</span>
            <span className="font-mono font-bold text-zinc-100 text-sm">
              {Math.abs(liveData.dcOffset).toFixed(4)}
            </span>
          </div>
        </div>

        {/* Record & Playback Verification */}
        <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-semibold text-zinc-200 block">
                Rekam Suara Sendiri &amp; Dengarkan Ulang (5 Detik)
              </span>
              <p className="text-[11px] text-zinc-400">
                Uji langsung kejernihan suara mikrofon Anda seperti yang didengar oleh lawan bicara.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRecordClip}
              disabled={!isMonitoring || isRecording}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-zinc-950 font-bold text-xs flex items-center gap-2 cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              <span>{isRecording ? `Merekam (${recCountdown}s)...` : 'Rekam 5 Detik'}</span>
            </button>
          </div>

          {micState.recordedAudioUrl && (
            <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-3">
              <audio controls src={micState.recordedAudioUrl} className="w-full h-8 accent-cyan-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
