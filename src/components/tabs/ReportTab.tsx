import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Download,
  Copy,
  Printer,
  Trash2,
  Share2,
  FileSpreadsheet,
  FileJson,
  Sparkles,
} from 'lucide-react';
import { DeviceScoreResult, DeviceInfo } from '../../types/device';
import { clearAllAppData } from '../../utils/storage';
import { SourceTag } from '../SourceTag';

interface ReportTabProps {
  device: DeviceInfo | null;
  scoreResult: DeviceScoreResult;
  onRefreshScore: () => void;
  isSimulated?: boolean;
}

export const ReportTab: React.FC<ReportTabProps> = ({
  device,
  scoreResult,
  onRefreshScore,
  isSimulated = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [cleared, setCleared] = useState(false);

  const getStatusBadge = (status: 'good' | 'warning' | 'bad' | 'untested') => {
    switch (status) {
      case 'good':
        return (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Baik</span>
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Perlu Perhatian</span>
          </span>
        );
      case 'bad':
        return (
          <span className="flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            <span>Bermasalah</span>
          </span>
        );
      case 'untested':
      default:
        return (
          <span className="flex items-center gap-1 text-xs font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Belum Diuji</span>
          </span>
        );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const data = {
      device,
      scoreResult,
      exportedAt: new Date().toISOString(),
      isSimulated,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EarCheck_${device?.name || 'Device'}_Report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const rows = [
      ['Kategori', 'Skor', 'Status', 'Catatan'],
      ['Baterai', scoreResult.categoryScores.battery.score ?? 'N/A', scoreResult.categoryScores.battery.status, scoreResult.categoryScores.battery.note],
      ['Audio Output', scoreResult.categoryScores.audioOutput.score ?? 'N/A', scoreResult.categoryScores.audioOutput.status, scoreResult.categoryScores.audioOutput.note],
      ['Mikrofon', scoreResult.categoryScores.mic.score ?? 'N/A', scoreResult.categoryScores.mic.status, scoreResult.categoryScores.mic.note],
      ['Koneksi & Stabilitas', scoreResult.categoryScores.connection.score ?? 'N/A', scoreResult.categoryScores.connection.status, scoreResult.categoryScores.connection.note],
      ['Kontrol Tombol', scoreResult.categoryScores.buttons.score ?? 'N/A', scoreResult.categoryScores.buttons.status, scoreResult.categoryScores.buttons.note],
      ['Kabel & Fisik', scoreResult.categoryScores.cable.score ?? 'N/A', scoreResult.categoryScores.cable.status, scoreResult.categoryScores.cable.note],
      ['TOTAL SKOR', scoreResult.totalScore ?? 'N/A', 'Kelengkapan: ' + scoreResult.completenessPercent + '%', ''],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map(val => `"${val}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EarCheck_${device?.name || 'Device'}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySummary = () => {
    const summary = `=== LAPORAN KESEHATAN EARCHECK ===
Perangkat: ${device?.name || 'Earphone'}
Merek/Model: ${device?.brand || '-'} / ${device?.model || '-'}
Skor Kesehatan Total: ${scoreResult.totalScore !== null ? `${scoreResult.totalScore}/100` : 'Belum Lengkap'}
Kelengkapan Data Uji: ${scoreResult.completenessPercent}%

Rincian:
- Baterai: ${scoreResult.categoryScores.battery.note} (${scoreResult.categoryScores.battery.score ?? '-'})
- Audio Output: ${scoreResult.categoryScores.audioOutput.note} (${scoreResult.categoryScores.audioOutput.score ?? '-'})
- Mikrofon: ${scoreResult.categoryScores.mic.note} (${scoreResult.categoryScores.mic.score ?? '-'})
- Koneksi: ${scoreResult.categoryScores.connection.note} (${scoreResult.categoryScores.connection.score ?? '-'})

Rekomendasi:
${scoreResult.recommendations.map((r, i) => `${i + 1}. [${r.title}] ${r.desc}`).join('\n') || 'Semua aspek dalam batas normal.'}
`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearData = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus semua riwayat pembacaan baterai dan pengujian di laptop ini?')) {
      await clearAllAppData();
      setCleared(true);
      setTimeout(() => setCleared(false), 3000);
    }
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Printable Report Header */}
      <div className="hidden print:block border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold">Laporan Diagnostik Kesehatan Earphone — EarCheck</h1>
        <p className="text-sm text-zinc-600">Perangkat: {device?.name || 'Standar Audio'} • Tanggal: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Hero Score Card */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left flex-1">
          <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
            <span className="text-xs uppercase font-bold tracking-wider text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
              Skor Kesehatan Terpadu
            </span>
            <SourceTag source="TEST" customText="DINORMALISASI" />
          </div>

          <h3 className="text-2xl font-black text-zinc-100">
            {device?.name || 'Earphone Belum Terhubung'}
          </h3>
          <p className="text-xs text-zinc-400 max-w-lg">
            Hanya menghitung kategori yang benar-benar telah Anda uji tanpa penalti untuk tes yang belum dijalankan.
          </p>

          <div className="pt-1 flex items-center gap-2 justify-center md:justify-start text-xs text-zinc-400">
            <span>Kelengkapan Data:</span>
            <strong className="text-cyan-400 font-mono text-sm">{scoreResult.completenessPercent}%</strong>
            <span className="text-zinc-600">({Math.round((scoreResult.completenessPercent / 100) * 6)} dari 6 modul diuji)</span>
          </div>
        </div>

        {/* Big Circular Score */}
        <div className="flex flex-col items-center justify-center p-6 bg-zinc-950 rounded-2xl border border-zinc-800 min-w-[160px]">
          {scoreResult.totalScore !== null ? (
            <>
              <span className={`text-5xl font-black font-mono tracking-tight ${
                scoreResult.totalScore >= 80
                  ? 'text-emerald-400'
                  : scoreResult.totalScore >= 60
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}>
                {scoreResult.totalScore}
              </span>
              <span className="text-xs text-zinc-500 uppercase font-semibold mt-1">
                Skala 0 – 100
              </span>
            </>
          ) : (
            <div className="text-center py-2">
              <span className="text-sm font-semibold text-zinc-500 block">Belum Dinilai</span>
              <span className="text-[10px] text-zinc-600 block mt-1">Jalankan minimal 1 uji</span>
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wider text-xs">
          Rincian Sub-Skor Per Aspek
        </h4>

        <div className="border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
          {/* Battery */}
          <div className="p-4 bg-zinc-950/60 flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-0.5">
              <strong className="text-sm text-zinc-200 block">Kesehatan Baterai (30%)</strong>
              <p className="text-xs text-zinc-400">{scoreResult.categoryScores.battery.note}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-zinc-200">
                {scoreResult.categoryScores.battery.score !== null ? `${scoreResult.categoryScores.battery.score}/100` : '—'}
              </span>
              {getStatusBadge(scoreResult.categoryScores.battery.status)}
            </div>
          </div>

          {/* Audio Output */}
          <div className="p-4 bg-zinc-950/60 flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-0.5">
              <strong className="text-sm text-zinc-200 block">Audio Output &amp; Keseimbangan Akustik (30%)</strong>
              <p className="text-xs text-zinc-400">{scoreResult.categoryScores.audioOutput.note}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-zinc-200">
                {scoreResult.categoryScores.audioOutput.score !== null ? `${scoreResult.categoryScores.audioOutput.score}/100` : '—'}
              </span>
              {getStatusBadge(scoreResult.categoryScores.audioOutput.status)}
            </div>
          </div>

          {/* Microphone */}
          <div className="p-4 bg-zinc-950/60 flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-0.5">
              <strong className="text-sm text-zinc-200 block">Mikrofon Earphone (15%)</strong>
              <p className="text-xs text-zinc-400">{scoreResult.categoryScores.mic.note}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-zinc-200">
                {scoreResult.categoryScores.mic.score !== null ? `${scoreResult.categoryScores.mic.score}/100` : '—'}
              </span>
              {getStatusBadge(scoreResult.categoryScores.mic.status)}
            </div>
          </div>

          {/* Connection */}
          <div className="p-4 bg-zinc-950/60 flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-0.5">
              <strong className="text-sm text-zinc-200 block">Koneksi &amp; Stabilitas Transmisi (15%)</strong>
              <p className="text-xs text-zinc-400">{scoreResult.categoryScores.connection.note}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-zinc-200">
                {scoreResult.categoryScores.connection.score !== null ? `${scoreResult.categoryScores.connection.score}/100` : '—'}
              </span>
              {getStatusBadge(scoreResult.categoryScores.connection.status)}
            </div>
          </div>

          {/* Buttons */}
          <div className="p-4 bg-zinc-950/60 flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-0.5">
              <strong className="text-sm text-zinc-200 block">Kontrol Tombol &amp; Media Session (5%)</strong>
              <p className="text-xs text-zinc-400">{scoreResult.categoryScores.buttons.note}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-zinc-200">
                {scoreResult.categoryScores.buttons.score !== null ? `${scoreResult.categoryScores.buttons.score}/100` : '—'}
              </span>
              {getStatusBadge(scoreResult.categoryScores.buttons.status)}
            </div>
          </div>

          {/* Cable */}
          <div className="p-4 bg-zinc-950/60 flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-0.5">
              <strong className="text-sm text-zinc-200 block">Integritas Fisik Kabel (5%)</strong>
              <p className="text-xs text-zinc-400">{scoreResult.categoryScores.cable.note}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-zinc-200">
                {scoreResult.categoryScores.cable.score !== null ? `${scoreResult.categoryScores.cable.score}/100` : '—'}
              </span>
              {getStatusBadge(scoreResult.categoryScores.cable.status)}
            </div>
          </div>
        </div>
      </div>

      {/* Smart Recommendations */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wider text-xs">
          Rekomendasi Ahli Audio Berbasis Aturan
        </h4>

        {scoreResult.recommendations.length === 0 ? (
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Semua aspek yang telah diuji berada dalam ambang batas normal. Tidak ada rekomendasi darurat.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {scoreResult.recommendations.map((rec) => (
              <div
                key={rec.id}
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  rec.level === 'critical'
                    ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                    : rec.level === 'warning'
                    ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                    : 'bg-cyan-950/40 border-cyan-800/80 text-cyan-200'
                }`}
              >
                {rec.level === 'critical' && <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
                {rec.level === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
                {rec.level === 'info' && <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />}

                <div className="space-y-1">
                  <strong className="text-sm font-bold block text-zinc-100">
                    {rec.title}
                  </strong>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {rec.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export & Actions Toolbar */}
      <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Ekspor JSON</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="px-3.5 py-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Tersalin!' : 'Salin Ringkasan'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleClearData}
          className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 text-xs font-semibold flex items-center gap-1.5 cursor-pointer ml-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{cleared ? 'Data Terhapus' : 'Hapus Semua Data Saya'}</span>
        </button>
      </div>
    </div>
  );
};
