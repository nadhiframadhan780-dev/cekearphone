import React, { useState } from 'react';
import { DataSourceTag } from '../types/device';
import { Info } from 'lucide-react';

interface SourceTagProps {
  source: DataSourceTag;
  customText?: string;
  tooltipText?: string;
  className?: string;
}

export const SourceTag: React.FC<SourceTagProps> = ({
  source,
  customText,
  tooltipText,
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getBadgeConfig = () => {
    switch (source) {
      case 'DEVICE':
        return {
          label: customText || 'TERBACA DARI PERANGKAT',
          bg: 'bg-cyan-900/40 text-cyan-300 border-cyan-500/40',
          dot: 'bg-cyan-400',
          defaultTooltip: 'Data asli yang dibaca langsung dari earphone via Bluetooth GATT atau MediaDevices.',
        };
      case 'TEST':
        return {
          label: customText || 'HASIL UJI',
          bg: 'bg-emerald-900/40 text-emerald-300 border-emerald-500/40',
          dot: 'bg-emerald-400',
          defaultTooltip: 'Diukur langsung melalui tes audio, mikrofon, atau kontrol di aplikasi ini.',
        };
      case 'ESTIMATE':
        return {
          label: customText || 'ESTIMASI',
          bg: 'bg-amber-900/40 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-400',
          defaultTooltip: 'Dihitung secara matematis dari data pengujian dengan rentang ketidakpastian.',
        };
      case 'UNAVAILABLE':
      default:
        return {
          label: customText || 'TIDAK TERSEDIA',
          bg: 'bg-zinc-800 text-zinc-400 border-zinc-700',
          dot: 'bg-zinc-500',
          defaultTooltip: 'Tidak diekspos oleh earphone ini atau dibatasi oleh izin/kebijakan browser.',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      className={`relative inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border cursor-help select-none ${config.bg} ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
      aria-label={`${config.label}: ${tooltipText || config.defaultTooltip}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      <span>[{config.label}]</span>
      <Info className="w-3 h-3 opacity-60" aria-hidden="true" />

      {showTooltip && (
        <span
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 w-60 text-xs font-sans font-normal text-zinc-100 bg-zinc-950 border border-zinc-700 rounded-md shadow-xl text-center pointer-events-none"
        >
          {tooltipText || config.defaultTooltip}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-950" />
        </span>
      )}
    </span>
  );
};
