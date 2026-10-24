import React from 'react';
import { Headphones, CheckCircle2, Globe, Sparkles, Moon, Sun, BookOpen } from 'lucide-react';
import { Language, i18n } from '../i18n/translations';

interface HeaderProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  isDemoMode: boolean;
  onToggleDemo: () => void;
  onOpenCompatibility: () => void;
  onOpenAssessmentGuide: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onLanguageChange,
  isDemoMode,
  onToggleDemo,
  onOpenCompatibility,
  onOpenAssessmentGuide,
  isDark,
  onToggleTheme,
}) => {
  const t = i18n[lang];

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur sticky top-0 z-40 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-cyan-900/30">
          <Headphones className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100 font-sans">
              {t.appName}
            </h1>
            <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.5 rounded font-semibold">
              v1.0 Read-Only
            </span>
          </div>
          <p className="text-xs text-zinc-400 hidden sm:block">
            {t.tagline}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap ml-auto">
        {/* Compatibility Modal Button */}
        <button
          type="button"
          onClick={onOpenCompatibility}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
          <span className="hidden md:inline">{t.checkCompat}</span>
          <span className="md:hidden">Sistem</span>
        </button>

        {/* Assessment Guide Button */}
        <button
          type="button"
          onClick={onOpenAssessmentGuide}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition-colors"
          title="Lihat formula penilaian, bobot kategori, dan batas ambang pengukuran"
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
          <span className="hidden md:inline">{t.assessmentGuide}</span>
          <span className="md:hidden">Metrik</span>
        </button>

        {/* Demo Mode Toggle */}
        <button
          type="button"
          onClick={onToggleDemo}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            isDemoMode
              ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20'
              : 'bg-zinc-900 hover:bg-zinc-800 text-amber-300 border-amber-600/40'
          }`}
          title="Coba simulasi data earphone TWS untuk menguji tampilan antarmuka tanpa menyambungkan hardware nyata"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isDemoMode ? t.turnOffDemo : t.turnOnDemo}</span>
        </button>

        {/* Language Switch */}
        <button
          type="button"
          onClick={() => onLanguageChange(lang === 'id' ? 'en' : 'id')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition-colors"
          aria-label="Ganti bahasa / Switch language"
        >
          <Globe className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
          <span className="uppercase font-mono">{lang}</span>
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors"
          aria-label={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
        </button>
      </div>
    </header>
  );
};
