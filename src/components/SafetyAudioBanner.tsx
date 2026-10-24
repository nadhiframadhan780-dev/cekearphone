import React, { useState, useEffect } from 'react';
import { audioService } from '../services/audioService';
import { StopCircle, Volume2, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { i18n, Language } from '../i18n/translations';

interface SafetyAudioBannerProps {
  lang: Language;
  targetDeviceName?: string;
  isUsingDefaultSpeaker?: boolean;
}

export const SafetyAudioBanner: React.FC<SafetyAudioBannerProps> = ({
  lang,
  targetDeviceName,
  isUsingDefaultSpeaker = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(audioService.getIsPlaying());
  const [playingDesc, setPlayingDesc] = useState(audioService.getPlayingDescription());
  const [volume, setVolume] = useState(audioService.getVolume());
  const [isSafeCap, setIsSafeCap] = useState(audioService.isSafeCapEnabled());

  const t = i18n[lang];

  useEffect(() => {
    const handleState = () => {
      setIsPlaying(audioService.getIsPlaying());
      setPlayingDesc(audioService.getPlayingDescription());
      setVolume(audioService.getVolume());
      setIsSafeCap(audioService.isSafeCapEnabled());
    };
    audioService.registerStateChange(handleState);

    // Global keyboard shortcut: Escape stops audio
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        audioService.stopAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStop = () => {
    audioService.stopAll();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    audioService.setVolume(val);
    setVolume(val);
  };

  const toggleSafeCap = () => {
    const next = !isSafeCap;
    audioService.toggleSafeCap(next);
    setIsSafeCap(next);
  };

  return (
    <aside
      aria-label="Kontrol Keselamatan Audio"
      className={`border-b transition-colors px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm ${
        isPlaying ? 'bg-amber-950/40 border-amber-600/50' : 'bg-zinc-900/90 border-zinc-800'
      }`}
    >
      {/* Left: Device Output Target & Playing Status */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 font-medium text-zinc-300">
          <span className="text-zinc-400">{t.playingTo}:</span>
          <span className="font-semibold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
            {targetDeviceName || t.playingToDefault}
          </span>
        </div>

        {isUsingDefaultSpeaker && (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{t.speakerNotice}</span>
          </span>
        )}

        {isPlaying && (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>MEMUTAR: {playingDesc}</span>
          </span>
        )}
      </div>

      {/* Right: Master Volume, Soft Start, & Emergency STOP */}
      <div className="flex items-center gap-4 flex-wrap ml-auto">
        {/* Soft-start Indicator */}
        <span
          className="hidden lg:inline-flex items-center gap-1 text-zinc-400 text-xs cursor-help"
          title="Semua audio uji dimulai sangat pelan selama 1.5 detik agar tidak merusak pendengaran pengguna."
        >
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Soft-Start (1.5s)</span>
        </span>

        {/* Master Volume with Safe Limit */}
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-zinc-400" aria-hidden="true" />
          <label htmlFor="master-volume-slider" className="sr-only">
            {t.masterVolume}
          </label>
          <input
            id="master-volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={volume}
            onChange={handleVolumeChange}
            className="w-24 md:w-32 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            aria-label={`${t.masterVolume}: ${Math.round(volume * 100)}%`}
          />
          <span className="font-mono text-xs w-9 text-right text-zinc-300">
            {Math.round(audioService.getEffectiveVolume() * 100)}%
          </span>

          {/* Safe Volume Limit Toggle */}
          <button
            type="button"
            onClick={toggleSafeCap}
            className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors flex items-center gap-1 ${
              isSafeCap
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : 'bg-red-950/60 text-red-300 border-red-800'
            }`}
            title={isSafeCap ? 'Batas aman aktif (maks 70%). Klik untuk membuka batas.' : 'Batas aman mati. Perhatian suara dapat sangat keras!'}
          >
            {isSafeCap ? (
              <>
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Batas Aman 70%</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3 h-3 text-red-400" />
                <span>Batas Lepas!</span>
              </>
            )}
          </button>
        </div>

        {/* Big Emergency STOP Button */}
        <button
          type="button"
          onClick={handleStop}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-wider transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-red-400 ${
            isPlaying
              ? 'bg-red-600 hover:bg-red-500 text-white animate-bounce'
              : 'bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700/60'
          }`}
          title="Hentikan seketika semua suara yang sedang diputar (Shortcut: Esc)"
        >
          <StopCircle className="w-4 h-4" aria-hidden="true" />
          <span>{t.emergencyStop}</span>
          <kbd className="hidden sm:inline-block ml-1 px-1 py-0.2 bg-red-950 border border-red-700 rounded text-[10px] font-mono">
            Esc
          </kbd>
        </button>
      </div>
    </aside>
  );
};
