import React, { useState } from 'react';

export default function DreamAnalysisView({ analysis, lang = 'en' }) {
  const [activeTab, setActiveTab] = useState('all');

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <svg className="w-12 h-12 animate-spin mb-4 text-indigo-500" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm font-medium tracking-wide">Analiz verileri yükleniyor...</p>
      </div>
    );
  }

  // Çok dilli alanları güvenli bir şekilde okumak için yardımcı fonksiyonlar
  const getVal = (obj, targetLang = 'en') => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[targetLang] || obj['en'] || Object.values(obj)[0] || '';
  };

  const getArr = (obj, targetLang = 'en') => {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj;
    return obj[targetLang] || obj['en'] || Object.values(obj)[0] || [];
  };

  const getSymbolMeaning = (sym, targetLang = 'en') => {
    if (!sym) return '';
    if (targetLang === 'tr') return sym.meaning_tr || sym.meaning_en || '';
    return sym.meaning_en || sym.meaning_tr || '';
  };

  // Tema renklerini alma (Eğer API'den gelmediyse güvenli fallback'ler)
  const colors = {
    bg: analysis.visual_theme?.background_color || 'bg-slate-950',
    text: analysis.visual_theme?.text_color || 'text-slate-100',
    primary: analysis.visual_theme?.primary_color || '#6366f1', // indigo-500
    secondary: analysis.visual_theme?.secondary_color || '#a855f7', // purple-500
    accent: analysis.visual_theme?.accent_color || '#f43f5e', // rose-500
  };

  // Dinamik Inline CSS Değişkenleri
  const dynamicStyles = {
    '--theme-primary': colors.primary,
    '--theme-secondary': colors.secondary,
    '--theme-accent': colors.accent,
    '--section-persona-primary': analysis.section_themes?.persona?.primary_color || colors.primary,
    '--section-shadow-primary': analysis.section_themes?.shadow?.primary_color || colors.accent,
    '--section-transform-primary': analysis.section_themes?.transformation?.primary_color || colors.secondary,
  };

  return (
    <div 
      className={`w-full max-w-6xl mx-auto px-4 py-8 md:py-12 text-slate-100 select-none`} 
      style={dynamicStyles}
    >
      {/* 1. HERO HEADER CARD */}
      <header className="relative mb-10 overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 md:p-10 backdrop-blur-md">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 rounded-full opacity-10 blur-[100px]" style={{ backgroundColor: 'var(--theme-primary)' }} />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-72 h-72 rounded-full opacity-10 blur-[100px]" style={{ backgroundColor: 'var(--theme-secondary)' }} />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            {/* Üst Başlık & Duygu Durumu */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/60 font-medium text-slate-300">
                Premium Analiz
              </span>
              {analysis.sentiment && (
                <span className="text-xs tracking-wide px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-medium">
                  {analysis.sentiment.toUpperCase()}
                </span>
              )}
            </div>

            {/* Rüya Başlığı */}
            <h1 className="text-2xl md:text-4xl font-semibold tracking-tight text-white mb-4">
              {getVal(analysis.title, lang)}
            </h1>

            {/* Rüya Özeti */}
            <p className="text-slate-300 text-sm md:text-base leading-relaxed font-light mb-6">
              {getVal(analysis.summary, lang)}
            </p>

            {/* Motivasyon / Çağrışım cümlesi */}
            {analysis.motiv && (
              <p className="text-xs md:text-sm italic text-slate-400 border-l border-slate-700 pl-4 py-0.5">
                "{getVal(analysis.motiv, lang)}"
              </p>
            )}
          </div>

          {/* Arketip Kartı */}
          <div className="flex-shrink-0 flex flex-wrap md:flex-col gap-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60 min-w-[200px]">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 w-full">Aktif Arketipler</p>
            {analysis.archetypes && analysis.archetypes.map((arch, idx) => (
              <span 
                key={idx} 
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-200 transition-colors hover:border-indigo-500/30"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }} />
                {arch}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* 2. ANA SEKSİYONLAR GRID VE BİLGİ KARTLARI */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* SOL KOLON: Persona, Gölge ve Bireyleşme Yolu (Genel Raporlama) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* SEKSİYON A: Persona Profili (Benlik Analizi) */}
          {analysis.persona_profile && (
            <section className="group relative rounded-3xl border border-slate-800/80 bg-slate-900/20 p-6 md:p-8 backdrop-blur-sm hover:border-slate-700/50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-medium text-white tracking-wide">
                    {getVal(analysis.persona_profile.name, lang) || 'Bilinç Profili'}
                  </h2>
                  <p className="text-xs text-slate-400">{getVal(analysis.persona_profile.tagline, lang)}</p>
                </div>
              </div>

              {/* Persona Detayları */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/40">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Görünen Benlik (Persona)</h4>
                  <p className="text-sm text-slate-300 leading-relaxed font-light">
                    {getVal(analysis.persona_profile.public_self, lang)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/40">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-2">Gizlenen Benlik (Animus/Anima)</h4>
                  <p className="text-sm text-slate-300 leading-relaxed font-light">
                    {getVal(analysis.persona_profile.hidden_self, lang)}
                  </p>
                </div>
              </div>

              {/* Güçler, Korkular, İhtiyaçlar Gridi */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02]">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Arketipsel Güçler
                  </h5>
                  <ul className="space-y-2">
                    {getArr(analysis.persona_profile.strengths, lang).map((s, i) => (
                      <li key={i} className="text-xs text-slate-300 leading-relaxed">{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-rose-500/10 bg-rose-500/[0.02]">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    Çekirdek Korkular
                  </h5>
                  <ul className="space-y-2">
                    {getArr(analysis.persona_profile.core_fears, lang).map((f, i) => (
                      <li key={i} className="text-xs text-slate-300 leading-relaxed">{f}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/[0.02]">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    Duygusal İhtiyaçlar
                  </h5>
                  <ul className="space-y-2">
                    {getArr(analysis.persona_profile.emotional_needs, lang).map((n, i) => (
                      <li key={i} className="text-xs text-slate-300 leading-relaxed">{n}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* SEKSİYON B: Gölge Odak ve Merkez Çatışma (The Shadow & Core Conflict) */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/10 p-6 md:p-8 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-rose-500/5 blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-medium text-white tracking-wide">Bilinçaltının Gölgeleri</h3>
                <p className="text-xs text-slate-400">Rüyanızın bastırılmış ve çatışan dinamikleri</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gölge Odak */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-400/80">Bastırılmış Parçalar (Gölge)</h4>
                <p className="text-sm text-slate-300 leading-relaxed font-light">
                  {getVal(analysis.shadow_focus, lang)}
                </p>
              </div>

              {/* Merkez Çatışma */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400/80">Temel Ruhsal Gerilim</h4>
                <p className="text-sm text-slate-300 leading-relaxed font-light">
                  {getVal(analysis.core_conflict, lang)}
                </p>
              </div>
            </div>
          </section>

          {/* SEKSİYON C: Bireyleşme Yolu & Sembolik Okuma (The Individuation Path & Symbolic Reading) */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/20 p-6 md:p-8 backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-48 h-48 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-medium text-white tracking-wide">Bireyleşme & Dönüşüm</h3>
                <p className="text-xs text-slate-400">Ruhun gelişim ve bütünleşme rehberi</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Sembolik Okuma */}
              <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-800/30">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Metaforik Yol Haritası</h4>
                <p className="text-sm text-slate-300 leading-relaxed font-light">
                  {getVal(analysis.symbolic_reading, lang)}
                </p>
              </div>

              {/* Bireyleşme Yolu Tavsiyeleri */}
              <div className="p-5 rounded-xl border border-indigo-500/10 bg-indigo-500/[0.01]">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">Uyanık Hayata Entegrasyon Tavsiyesi</h4>
                <p className="text-sm text-slate-300 leading-relaxed font-light">
                  {getVal(analysis.individuation_path, lang)}
                </p>
              </div>
            </div>
          </section>

        </div>

        {/* SAĞ KOLON: Semboller, Duygular ve Yansımalar */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* SEMBOLLER KARTI */}
          <section className="rounded-3xl border border-slate-800/80 bg-slate-900/20 p-6 backdrop-blur-sm">
            <h3 className="text-base font-semibold tracking-wide text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--theme-accent)' }} />
              Rüya Sembolleri
            </h3>

            <div className="space-y-4">
              {analysis.symbols && analysis.symbols.map((sym, idx) => (
                <div 
                  key={idx} 
                  className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/50 hover:border-slate-700/60 transition-all group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                      {sym.symbol}
                    </span>
                    {sym.emotional_charge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/50">
                        {sym.emotional_charge.toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    {getSymbolMeaning(sym, lang)}
                  </p>

                  {/* Yoğunluk Çubuğu */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-800 rounded-full h-1">
                      <div 
                        className="h-full rounded-full transition-all" 
                        style={{ 
                          width: `${sym.intensity ? Math.min(Math.max(sym.intensity * 10, 0), 100) : 50}%`,
                          backgroundColor: sym.color || 'var(--theme-primary)'
                        }} 
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {(sym.intensity || 5)}/10
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* DUYGUSAL SEYİR KARTI */}
          {analysis.emotions && (
            <section className="rounded-3xl border border-slate-800/80 bg-slate-900/20 p-6 backdrop-blur-sm">
              <h3 className="text-base font-semibold tracking-wide text-white mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }} />
                Duygusal Profil
              </h3>

              <div className="space-y-4">
                {analysis.emotions.map((emo, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-medium">{emo.emotion}</span>
                      <span className="text-slate-400 font-mono">{emo.score}%</span>
                    </div>
                    <div className="w-full bg-slate-850 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${emo.score || 0}%`,
                          background: `linear-gradient(90deg, var(--theme-primary) 0%, var(--theme-secondary) 100%)`
                        }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* DERİN YANSIMA SORULARI */}
          {analysis.reflection_questions && (
            <section className="rounded-3xl border border-slate-800/80 bg-slate-900/20 p-6 backdrop-blur-sm">
              <h3 className="text-base font-semibold tracking-wide text-white mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--theme-accent)' }} />
                Ruhsal Yansımalar
              </h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Kendinizle baş başa kaldığınızda bu sorular üzerine meditasyon yapmayı veya günlük tutmayı deneyin:
              </p>

              <div className="space-y-3">
                {getArr(analysis.reflection_questions, lang).map((q, idx) => (
                  <div 
                    key={idx} 
                    className="p-3.5 rounded-xl bg-slate-950/30 border border-slate-800/40 text-xs text-slate-300 leading-relaxed relative overflow-hidden group hover:bg-slate-950/50 transition-colors"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="font-semibold text-indigo-400 block mb-1">Yansıma {idx + 1}</span>
                    "{q}"
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

      </main>
    </div>
  );
}