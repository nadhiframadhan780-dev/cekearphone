import React from 'react';
import { X, BookOpen, Scale, Award, AlertCircle } from 'lucide-react';
import { Language } from '../../i18n/translations';

interface AssessmentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const AssessmentGuideModal: React.FC<AssessmentGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h2 id="guide-modal-title" className="text-lg font-bold text-zinc-100 font-sans">
              Metodologi & Cara Penilaian EarCheck
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
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-sm text-zinc-300">
          {/* Principle of Normalization */}
          <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/60 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-semibold">
              <Scale className="w-4 h-4" />
              <span>Normalisasi Bobot Dinamis (Hanya Kategori Teruji)</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              EarCheck tidak pernah memberi nilai 0 atau mengurangi skor untuk tes yang belum Anda jalankan. Total skor (0–100) dihitung secara proporsional hanya dari kategori yang benar-benar memiliki data pengukuran. Persentase kelengkapan data ditampilkan secara terpisah.
            </p>
          </div>

          {/* Bobot Default */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400">
              Distribusi Bobot Acuan
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <span className="text-xs text-zinc-400 block">Kesehatan Baterai</span>
                <span className="text-lg font-bold text-cyan-400">30%</span>
                <p className="text-[11px] text-zinc-500 mt-1">Laju kuras OLS / Uji daya tahan / 0x2BEA</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <span className="text-xs text-zinc-400 block">Audio Output (Akustik)</span>
                <span className="text-lg font-bold text-emerald-400">30%</span>
                <p className="text-[11px] text-zinc-500 mt-1">Keseimbangan L vs R, dead channel, THD</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <span className="text-xs text-zinc-400 block">Mikrofon Earphone</span>
                <span className="text-lg font-bold text-amber-400">15%</span>
                <p className="text-[11px] text-zinc-500 mt-1">SNR, clipping 0 dBFS, profil HFP</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <span className="text-xs text-zinc-400 block">Koneksi & Stabilitas</span>
                <span className="text-lg font-bold text-blue-400">15%</span>
                <p className="text-[11px] text-zinc-500 mt-1">Glitches audio, disconnect count</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <span className="text-xs text-zinc-400 block">Kontrol & Tombol</span>
                <span className="text-lg font-bold text-purple-400">5%</span>
                <p className="text-[11px] text-zinc-500 mt-1">Respons Media Session & keyboard</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <span className="text-xs text-zinc-400 block">Kabel & Fisik (Wired)</span>
                <span className="text-lg font-bold text-pink-400">5%</span>
                <p className="text-[11px] text-zinc-500 mt-1">Uji goyang jack & dropout</p>
              </div>
            </div>
          </div>

          {/* Ambang Batas Pengukuran */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400">
              Kriteria Ambang Batas Teknis
            </h3>
            <ul className="space-y-2 text-xs">
              <li className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-start gap-2.5">
                <Award className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-zinc-200">Selisih Kanal L vs R:</strong>
                  <p className="text-zinc-400 mt-0.5">
                    ≤ 3.0 dB: Seimbang (Baik) • 3.1 - 6.0 dB: Perlu Perhatian (Kemungkinan kotoran telinga di mesh grill) • &gt; 6.0 dB: Bermasalah (Kemungkinan driver aus atau koil rusak).
                  </p>
                </div>
              </li>
              <li className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-zinc-200">Uji Daya Tahan Baterai (Syarat Minimum):</strong>
                  <p className="text-zinc-400 mt-0.5">
                    Estimasi kapasitas efektif HANYA dihitung jika pengujian telah berjalan minimal 20 menit DAN persentase baterai telah turun minimal 5%. Jika syarat belum terpenuhi, aplikasi secara jujur menampilkan status &quot;Data Belum Cukup&quot;.
                  </p>
                </div>
              </li>
              <li className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-zinc-200">Mikrofon & Profil HFP:</strong>
                  <p className="text-zinc-400 mt-0.5">
                    Saat mikrofon Bluetooth diaktifkan di browser, Windows/macOS mengalihkan bandwidth codec ke profil percakapan suara (HFP 8/16 kHz). Ini adalah karakteristik normal dari arsitektur Bluetooth dan bukan cacat earphone.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};
