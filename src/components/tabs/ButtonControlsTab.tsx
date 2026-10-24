import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  CheckCircle2,
  HelpCircle,
  Terminal,
} from 'lucide-react';
import { ButtonTestState } from '../../types/device';
import { buttonControlService, ButtonEvent } from '../../services/buttonControlService';
import { SourceTag } from '../SourceTag';

interface ButtonControlsTabProps {
  buttonState: ButtonTestState;
  onUpdateButtons: (updater: (prev: ButtonTestState) => ButtonTestState) => void;
  isSimulated?: boolean;
}

export const ButtonControlsTab: React.FC<ButtonControlsTabProps> = ({
  buttonState,
  onUpdateButtons,
  isSimulated = false,
}) => {
  const [isListening, setIsListening] = useState(false);

  const toggleListening = () => {
    if (isListening) {
      buttonControlService.stopListening();
      setIsListening(false);
    } else {
      buttonControlService.startListening((event: ButtonEvent) => {
        onUpdateButtons((prev) => {
          const next = { ...prev };
          if (event.action === 'play') next.play = true;
          if (event.action === 'pause') next.pause = true;
          if (event.action === 'nexttrack') next.nexttrack = true;
          if (event.action === 'previoustrack') next.previoustrack = true;
          if (event.action === 'seekbackward') next.seekbackward = true;
          if (event.action === 'seekforward') next.seekforward = true;
          if (event.action === 'stop') next.stop = true;
          if (event.action === 'volumeup') next.volumeup = true;
          if (event.action === 'volumedown') next.volumedown = true;
          next.eventLogs = [event, ...prev.eventLogs.slice(0, 19)];
          return next;
        });
      });
      setIsListening(true);
    }
  };

  useEffect(() => {
    return () => {
      buttonControlService.stopListening();
    };
  }, []);

  const buttonItems = [
    { key: 'play', name: 'Play / Putar', active: buttonState.play, icon: Play },
    { key: 'pause', name: 'Pause / Jeda', active: buttonState.pause, icon: Pause },
    { key: 'nexttrack', name: 'Next Track (Lagu Selanjutnya)', active: buttonState.nexttrack, icon: SkipForward },
    { key: 'previoustrack', name: 'Previous Track (Lagu Sebelumnya)', active: buttonState.previoustrack, icon: SkipBack },
    { key: 'volumeup', name: 'Volume Up (+)', active: buttonState.volumeup, icon: Volume2 },
    { key: 'volumedown', name: 'Volume Down (-)', active: buttonState.volumedown, icon: VolumeX },
  ];

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <span>Uji Tombol Fisik &amp; Sensor Sentuh Earphone</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xl">
              Memanfaatkan <strong>Media Session API</strong> browser dan event keyboard media. Tekan tombol pada earphone Anda untuk memverifikasi switch mikrofon/tombol sentuh merespons dengan benar.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleListening}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              isListening
                ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-950/40'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
            }`}
          >
            <Radio className={`w-4 h-4 ${isListening ? 'animate-pulse text-zinc-950' : 'text-zinc-400'}`} />
            <span>{isListening ? 'Mendengarkan Tombol Live...' : 'Aktifkan Uji Tombol'}</span>
          </button>
        </div>

        {/* Listening Status Box */}
        {isListening ? (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-xs text-emerald-300 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Sesi Media Aktif!</span>
            </div>
            <p className="text-zinc-300">
              Silakan tekan tombol Play, Jeda, Next, Prev, atau Volume pada earphone Anda sekarang. Setiap aksi akan menyalakan lampu indikator di bawah.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400">
            Tekan tombol <strong>&quot;Aktifkan Uji Tombol&quot;</strong> di atas untuk mulai menangkap sinyal tombol earphone.
          </div>
        )}

        {/* Buttons Checklist Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {buttonItems.map((btn) => {
            const Icon = btn.icon;
            return (
              <div
                key={btn.key}
                className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
                  btn.active
                    ? 'bg-emerald-950/40 border-emerald-600/80 text-emerald-200'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-500'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    btn.active ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold block text-zinc-200">
                    {btn.name}
                  </span>
                  <span className="text-[10px] font-mono">
                    {btn.active ? '✓ Terdeteksi' : 'Belum ditekan'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Event Log */}
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Log Kejadian Tombol Real-Time:</span>
            </span>
            <span className="font-mono text-zinc-500 text-[11px]">
              {buttonState.eventLogs.length} kejadian tercatat
            </span>
          </div>

          {buttonState.eventLogs.length === 0 ? (
            <p className="text-xs text-zinc-600 italic py-2">
              Belum ada tombol yang ditekan.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-xs text-zinc-400">
              {buttonState.eventLogs.map((log, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-zinc-900">
                  <span className="text-cyan-400 font-semibold uppercase">
                    &gt; {log.action} {log.key ? `(${log.key})` : ''}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
