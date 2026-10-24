import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, AlertCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { checkSystemCompatibility, FeatureCheck } from '../../services/compatibilityService';
import { Language, i18n } from '../../i18n/translations';

interface CompatibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const CompatibilityModal: React.FC<CompatibilityModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);
  const checks: FeatureCheck[] = checkSystemCompatibility();
  const t = i18n[lang];

  if (!isOpen) return null;

  const troubleshootingSteps = [
    {
      title: '1. Masuk ke Mode Pairing (Penyandingan)',
      content:
        'Sebagian besar earphone TWS (Sony, JBL, Soundcore, Jabra) hanya memancarkan sinyal Bluetooth BLE saat berada dalam mode pairing (tekan dan tahan tombol case atau earpiece selama 3-5 detik hingga LED berkedip cepat).',
    },
    {
      title: '2. Putuskan Koneksi dari Smartphone / Perangkat Lain',
      content:
        'Jika earphone Anda sedang terhubung aktif ke HP Anda, banyak perangkat menonaktifkan pemancar BLE untuk menghemat daya. Putuskan koneksi sementara dari HP Anda agar terlihat oleh laptop.',
    },
    {
      title: '3. Penjelasan Earphone Sudah Terhubung sebagai Audio Laptop',
      content:
        'Di sistem operasi Windows dan macOS, koneksi audio klasik (A2DP/HFP) dan koneksi BLE GATT adalah dua jalur terpisah. Terkadang earphone yang sudah terhubung sebagai "Headphones" di Bluetooth Windows tidak lagi mengiklankan GATT BLE sampai masuk pairing. Anda tetap bisa menguji audio dan mikrofon di tab "Jalur Kabel / MediaDevices".',
    },
    {
      title: '4. Beralih Antara Mode "Semua Perangkat" vs "Filter Baterai"',
      content:
        'Secara default EarCheck menggunakan "Semua Perangkat" (acceptAllDevices). Jika earphone tidak muncul, coba gunakan opsi filter "Layanan Baterai", atau sebaliknya.',
    },
    {
      title: '5. Gunakan Browser Chromium Desktop',
      content:
        'Web Bluetooth hanya tersedia di browser berbasis Chromium desktop (Google Chrome, Microsoft Edge, Opera, Brave). Mozilla Firefox dan Apple Safari secara resmi menolak mendukung Web Bluetooth karena pertimbangan privasi.',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compat-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 id="compat-modal-title" className="text-lg font-bold text-zinc-100 font-sans">
              {t.browserSupportTitle}
            </h2>
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

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-sm">
          {/* Summary Box */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 space-y-2">
            <p className="font-medium text-zinc-200">
              Prinsip Privasi & Keamanan:
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Semua pemeriksaan berjalan 100% lokal di browser Anda. Tidak ada data audio, nomor seri, atau telemetri yang dikirim ke server luar. Izin Bluetooth dan mikrofon diminta hanya saat Anda menekan tombol uji secara sukarela.
            </p>
          </div>

          {/* Compatibility Table */}
          <div className="space-y-3">
            <h3 className="font-semibold text-zinc-200 text-sm uppercase tracking-wider text-xs">
              Daftar Fitur Browser Terdeteksi
            </h3>
            <div className="border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800/80">
              {checks.map((chk) => (
                <div key={chk.id} className="p-3.5 bg-zinc-900/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {chk.supported ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-label="Didukung" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" aria-label="Tidak Didukung" />
                      )}
                      <span className="font-semibold text-zinc-200 text-sm">
                        {chk.name}
                      </span>
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                          chk.supported
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                            : 'bg-rose-950/60 text-rose-300 border-rose-800'
                        }`}
                      >
                        {chk.statusText}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 pl-6">
                      {chk.explanation}
                    </p>
                    <p className="text-[11px] text-cyan-400/90 pl-6 italic">
                      Saran: {chk.advice}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Troubleshooting Guide Accordion */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold text-zinc-200 text-sm">
                Earphone Tidak Muncul di Pemilih Bluetooth? (Panduan Lengkap)
              </h3>
            </div>

            <div className="border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
              {troubleshootingSteps.map((step, idx) => (
                <div key={idx} className="bg-zinc-950/40">
                  <button
                    type="button"
                    onClick={() => setActiveAccordion(activeAccordion === idx ? null : idx)}
                    className="w-full text-left p-3.5 flex items-center justify-between gap-2 hover:bg-zinc-800/40 transition-colors"
                    aria-expanded={activeAccordion === idx}
                  >
                    <span className="font-medium text-xs sm:text-sm text-zinc-200">
                      {step.title}
                    </span>
                    {activeAccordion === idx ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                    )}
                  </button>
                  {activeAccordion === idx && (
                    <div className="p-3.5 pt-0 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/50 bg-zinc-900/40">
                      {step.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950 flex justify-end">
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
