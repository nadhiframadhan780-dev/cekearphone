import React, { useState } from 'react';
import { X, Search, Copy, Check, Terminal, Shield } from 'lucide-react';
import { GattCharacteristicInfo } from '../../types/device';

interface GattExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  characteristics: GattCharacteristicInfo[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const GattExplorerModal: React.FC<GattExplorerModalProps> = ({
  isOpen,
  onClose,
  characteristics,
  isLoading,
  onRefresh,
}) => {
  const [filter, setFilter] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const filtered = characteristics.filter(
    (c) =>
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      c.serviceName.toLowerCase().includes(filter.toLowerCase()) ||
      c.uuid.toLowerCase().includes(filter.toLowerCase())
  );

  const copyLog = () => {
    const text = JSON.stringify(characteristics, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gatt-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 id="gatt-modal-title" className="text-base font-bold text-zinc-100 font-sans">
                Eksplorasi GATT (Read-Only)
              </h2>
              <p className="text-xs text-zinc-400">
                Pemeriksaan atribut Bluetooth Low Energy tanpa mengubah firmware atau pengaturan earphone.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            aria-label="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar & Actions */}
        <div className="p-4 bg-zinc-950/40 border-b border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari service, nama karakteristik, atau UUID..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium disabled:opacity-50"
            >
              {isLoading ? 'Membaca...' : 'Segarkan GATT'}
            </button>
            <button
              type="button"
              onClick={copyLog}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin JSON'}</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              {isLoading ? 'Sedang membaca struktur GATT...' : 'Tidak ada karakteristik yang sesuai atau perangkat belum terhubung.'}
            </div>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              {filtered.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">
                        {item.serviceName}
                      </span>
                      <strong className="text-zinc-200 text-sm font-semibold font-sans">
                        {item.name}
                      </strong>
                      <span className="text-[11px] text-zinc-500 block">
                        UUID: {item.uuid}
                      </span>
                    </div>

                    {/* Properties Badges */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {item.properties.read && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950 text-blue-300 border border-blue-800">
                          READ
                        </span>
                      )}
                      {item.properties.notify && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                          NOTIFY
                        </span>
                      )}
                      {item.properties.indicate && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950 text-purple-300 border border-purple-800">
                          INDICATE
                        </span>
                      )}
                      {item.properties.write && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700" title="EarCheck memblokir perintah tulis demi keselamatan perangkat">
                          WRITE (DIBLOKIR)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Value / Error */}
                  <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-zinc-500 block">Nilai Terurai (Parsed):</span>
                      <span className="text-cyan-300 break-all">
                        {item.valueParsed || (item.readError ? '—' : 'Kosong / Not read')}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Raw Hex Dump:</span>
                      <span className="text-zinc-400 break-all">
                        {item.valueHex ? `0x ${item.valueHex}` : '—'}
                      </span>
                    </div>
                  </div>

                  {item.readError && (
                    <div className="p-2 rounded bg-rose-950/40 border border-rose-900/60 text-[11px] text-rose-300">
                      Catatan pembacaan: {item.readError}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mode Read-Only terpasang ketat. Karakteristik write tidak pernah dipanggil.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
