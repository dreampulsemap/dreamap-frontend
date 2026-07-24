import React, { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { getDreamCardText } from '@/lib/dreamCardTranslations'

// Dış bağımlılıkları kaldırmak ve çökmeleri önlemek için Güvenli Okuyucu (Safe Getter) içeriye alındı
function getSafeVal(obj, targetLang = 'en') {
  if (!obj) return ''
  if (typeof obj === 'string') return obj
  return obj[targetLang] || obj['en'] || Object.values(obj)[0] || ''
}

export default function DeepAnalysisCarouselModal({
  isOpen,
  onClose,
  premiumAnalysis,
  lang,
  dreamTitle,
  dreamImage,
  dreamMotiv,
  dreamContent,
  teaserSummary,
  onShare,
  onLunosferShare,
  onInstagramShare,
  onGenerateImageOnly,
  generatingImage,
  premiumError,
  translateArchetype,
  onOpenStoryMode,
  dreamId
}) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  if (!isOpen || !premiumAnalysis) return null

  // Dil verisi güvenliği
  const safeLang = lang || 'en'
  const t = typeof getDreamCardText === 'function' ? getDreamCardText(safeLang) : {}

  // Paylaşım bağlantıları
  const dreamUrl = typeof window !== 'undefined' ? `${window.location.origin}/dreams/${dreamId}` : ''
  const encodedUrl = encodeURIComponent(dreamUrl)
  const encodedImage = encodeURIComponent(dreamImage || '')
  
  const rawShareText = (t.shareText || '').replace('{url}', dreamUrl)
  const encodedText = encodeURIComponent(rawShareText)

  // Fonksiyon prop güvenlikleri (Eğer dışarıdan fonksiyon gelmezse çökmeyi önler)
  const safeTranslateArchetype = typeof translateArchetype === 'function' ? translateArchetype : (arch) => arch;
  const safeOnGenerateImage = typeof onGenerateImageOnly === 'function' ? onGenerateImageOnly : () => {};
  const safeOnOpenStoryMode = typeof onOpenStoryMode === 'function' ? onOpenStoryMode : () => {};
  const safeOnClose = typeof onClose === 'function' ? onClose : () => {};

  // Slayt swipe jestleri
  const handleTouchStart = (e) => {
    if (e.targetTouches && e.targetTouches[0]) {
      setTouchStart(e.targetTouches[0].clientX)
    }
  }

  const handleTouchMove = (e) => {
    if (e.targetTouches && e.targetTouches[0]) {
      setTouchEnd(e.targetTouches[0].clientX)
    }
  }

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 55
    const isRightSwipe = distance < -55

    if (isLeftSwipe && currentSlide < 6) {
      setCurrentSlide((prev) => prev + 1)
    }
    if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1)
    }
    setTouchStart(null)
    setTouchEnd(null)
  }

  const slides = [
    { title: t.slideTitle0 || 'Dream Card' },
    { title: t.slideTitle1 || 'Your Dream Text' },
    { title: t.slideTitle2 || 'Subconscious Signal' },
    { title: t.slideTitle3 || 'Symbolic Roadmap' },
    { title: t.slideTitle4 || 'Shadow & Core Conflict' },
    { title: t.slideTitle5 || 'Path of Transformation' },
    { title: t.slideTitle6 || 'Reflection Questions' },
  ]

  return (
    <div
      className="fixed inset-0 z-[160] flex items-end justify-center bg-black/90 backdrop-blur-lg sm:items-center sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={safeOnClose}
    >
      <div
        className="relative h-[95vh] w-full max-w-4xl overflow-hidden rounded-t-[2.5rem] border border-white/10 bg-[#040711] shadow-[0_30px_120px_rgba(0,0,0,0.85)] sm:h-[85vh] sm:rounded-[2.5rem]"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* KAPATMA BUTONU */}
        <button
          onClick={safeOnClose}
          className="absolute top-4 right-4 z-[180] inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white hover:bg-white/10 transition-all"
        >
          <X size={18} />
        </button>

        {/* BAŞLIK & İNDİKATÖR */}
        <div className="absolute top-4 left-6 z-[180] flex items-center gap-2">
          <span className="text-xs font-bold text-fuchsia-300 uppercase tracking-widest">
            {slides[currentSlide]?.title}
          </span>
          <span className="text-[10px] text-white/40 font-mono">({currentSlide + 1}/7)</span>
        </div>

        {/* HİKAYE MODU KARTI */}
        {currentSlide === 0 && (
          <button
            type="button"
            onClick={safeOnOpenStoryMode}
            className="absolute top-18 right-4 z-[180] inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-200 hover:bg-cyan-500/20 transition-all"
          >
            📱 {t.storyModeBtn || 'STORY MODE'}
          </button>
        )}

        {/* SLAYT İÇERİKLERİ */}
        <div className="relative w-full h-[calc(100%-140px)] mt-16 px-6 py-4 overflow-y-auto sm:px-12 select-none">
          
          {/* SLAYT 1: KOZMİK GÖRSEL */}
          {currentSlide === 0 && (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <div className="relative w-full max-w-md h-[45vh] rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl">
                {dreamImage ? (
                  <img src={dreamImage} alt="Dream Visual" className="w-full h-full object-cover animate-fade-in" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-950/40 to-black p-6 text-center gap-4 select-none">
                    <span className="text-4xl">🌌</span>
                    <p className="text-xs text-slate-300 max-w-[240px]">
                      {safeLang === 'tr' 
                        ? 'Bu rüyanın henüz mistik bir görseli oluşturulmamış.' 
                        : 'No mystical illustration has been generated for this dream yet.'}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); safeOnGenerateImage(); }}
                      disabled={generatingImage}
                      className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-pulse"
                    >
                      <span>{generatingImage ? '⏳' : '✦'}</span>
                      <span>
                        {generatingImage 
                          ? (safeLang === 'tr' ? 'Üretiliyor...' : 'Generating...') 
                          : (safeLang === 'tr' ? 'Görseli Canlandır · 2 Aura' : 'Illuminate Artwork · 2 Auras')}
                      </span>
                    </button>
                    {premiumError && (
                      <p className="text-xs text-rose-400 max-w-[240px] font-sans mt-2" role="alert">
                        <AlertTriangle size={12} className="inline -mt-0.5" /> {premiumError}
                      </p>
                    )}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#040711] via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <h4 className="text-xl font-bold text-white mb-2 leading-tight font-serif">{dreamTitle}</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(premiumAnalysis?.archetypes) &&
                      premiumAnalysis.archetypes.map((arch, i) => (
                        <span key={i} className="text-[9px] font-semibold bg-violet-500/20 border border-violet-400/30 px-2 py-0.5 rounded-full text-violet-100">
                          ✦ {safeTranslateArchetype(arch)}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLAYT 2: KULLANICININ ORİJİNAL RÜYASI */}
          {currentSlide === 1 && (
            <div className="h-full flex flex-col justify-center max-w-xl mx-auto">
              <span className="text-2xl mb-3 text-cyan-400">📖</span>
              <h4 className="text-lg font-bold uppercase tracking-wider text-slate-400 mb-3">
                {t.slideTitle1 || 'Your Dream Text'}
              </h4>
              <p className="text-sm leading-8 text-slate-200 font-light whitespace-pre-wrap overflow-y-auto max-h-[30vh] pr-2">
                {dreamContent}
              </p>
            </div>
          )}

          {/* SLAYT 3: TEASER / BAZ ANALİZ */}
          {currentSlide === 2 && (
            <div className="h-full flex flex-col justify-center max-w-xl mx-auto">
              <span className="text-2xl mb-3 text-fuchsia-400">✨</span>
              <h4 className="text-lg font-bold uppercase tracking-wider text-slate-400 mb-3">
                {t.slideTitle2 || 'Subconscious Signal'}
              </h4>
              <p className="text-sm leading-8 text-slate-200 font-light whitespace-pre-wrap">
                {teaserSummary}
              </p>
            </div>
          )}

          {/* SLAYT 4: SEMBOLİK OKUMA */}
          {currentSlide === 3 && (
            <div className="h-full flex flex-col justify-center max-w-xl mx-auto">
              <span className="text-2xl mb-3 text-indigo-400">🜂</span>
              <h4 className="text-lg font-bold uppercase tracking-wider text-slate-400 mb-3">
                {t.slideTitle3 || 'Symbolic Roadmap'}
              </h4>
              <p className="text-sm leading-8 text-slate-200 font-light whitespace-pre-wrap overflow-y-auto max-h-[30vh] pr-2">
                {getSafeVal(premiumAnalysis?.symbolic_reading, safeLang) || getSafeVal(premiumAnalysis?.summary, safeLang)}
              </p>
            </div>
          )}

          {/* SLAYT 5: GÖLGE VE ÇATIŞMA */}
          {currentSlide === 4 && (
            <div className="h-full flex flex-col justify-center gap-6 max-w-2xl mx-auto">
              <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/[0.02]">
                <h5 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  {safeLang === 'tr' ? 'Bastırılmış Benlik (Gölge)' : 'Shadow Focus'}
                </h5>
                <p className="text-xs leading-6 text-slate-300 font-light overflow-y-auto max-h-[15vh] pr-2">
                  {getSafeVal(premiumAnalysis?.shadow_focus, safeLang)}
                </p>
              </div>
              <div className="p-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.02]">
                <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  {safeLang === 'tr' ? 'Temel Gerilim (Çatışma)' : 'Core Conflict'}
                </h5>
                <p className="text-xs leading-6 text-slate-300 font-light overflow-y-auto max-h-[15vh] pr-2">
                  {getSafeVal(premiumAnalysis?.core_conflict, safeLang)}
                </p>
              </div>
            </div>
          )}

          {/* SLAYT 6: BİREYLEŞME */}
          {currentSlide === 5 && (
            <div className="h-full flex flex-col justify-center max-w-xl mx-auto">
              <span className="text-2xl mb-3 text-violet-400">💫</span>
              <h4 className="text-lg font-bold uppercase tracking-wider text-slate-400 mb-3">
                {t.slideTitle5 || 'Path of Transformation'}
              </h4>
              <p className="text-sm leading-8 text-slate-200 font-light whitespace-pre-wrap overflow-y-auto max-h-[30vh] pr-2">
                {getSafeVal(premiumAnalysis?.individuation_path, safeLang)}
              </p>
            </div>
          )}

          {/* SLAYT 7: SORULAR */}
          {currentSlide === 6 && (
            <div className="h-full flex flex-col justify-center gap-4 max-w-xl mx-auto">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">
                {t.slideTitle6 || 'Reflection Questions'}
              </h4>
              {Array.isArray(premiumAnalysis?.reflection_questions) &&
                premiumAnalysis.reflection_questions.slice(0, 3).map((q, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-fuchsia-400/40" />
                    <span className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest block mb-1">
                      {safeLang === 'tr' ? `Yansıma ${idx + 1}` : `Reflection ${idx + 1}`}
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed italic">"{q}"</p>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* ALT NOKTALAR VE NAVİGASYON */}
        <div className="absolute bottom-4 left-0 right-0 px-6 flex flex-col items-center gap-3">
          
          <div className="flex justify-center gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-5 bg-fuchsia-400 shadow-[0_0_10px_rgba(240,73,214,0.4)]' : 'w-1.5 bg-white/20'}`}
              />
            ))}
          </div>

          <div className="w-full flex items-center justify-between gap-4 max-w-lg">
            <button
              type="button"
              disabled={currentSlide === 0}
              onClick={() => setCurrentSlide((prev) => prev - 1)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
            >
              ←
            </button>

            <div className="flex-1 flex items-center justify-center gap-2.5 rounded-2xl bg-white/[0.03] border border-white/10 px-3.5 py-2">
              
              <button
                type="button"
                onClick={onLunosferShare}
                title={t.lunosferTitle}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 hover:brightness-110 transition-all text-fuchsia-300"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM12 14L10.5 10.5 7 9l3.5-1.5L12 4l1.5 3.5L17 9l-3.5 1.5L12 14z"/>
                </svg>
              </button>

              <button
                type="button"
                onClick={onInstagramShare}
                title={t.instagramTitle}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-yellow-500 hover:brightness-110 transition-all text-white"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4.162 4.162 0 110-8.324A4.162 4.162 0 0112 16zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </button>

              <a
                href={`https://twitter.com/intent/tweet?text=${encodedText}&hashtags=Lunosfer,JungianDream`}
                target="_blank"
                rel="noopener noreferrer"
                title={t.twitterTitle}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-black hover:bg-white/10 border border-white/10 transition-all text-white"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                  <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"/>
                </svg>
              </a>

              <a
                href={`https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedText}`}
                target="_blank"
                rel="noopener noreferrer"
                title={t.pinterestTitle}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e60023] hover:brightness-110 transition-all text-white"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                  <path d="M8 0a8 8 0 0 0-2.915 15.452c-.07-.633-.134-1.606.027-2.297.146-.625.938-3.977.938-3.977s-.239-.479-.239-1.187c0-1.113.645-1.943 1.448-1.943.682 0 1.012.512 1.012 1.127 0 .686-.437 1.712-.663 2.663-.188.796.4 1.446 1.185 1.446 1.422 0 2.515-1.5 2.515-3.664 0-1.915-1.377-3.254-3.342-3.254-2.276 0-3.612 1.707-3.612 3.471 0 .688.265 1.425.595 1.826a.24.24 0 0 1 .056.23c-.061.252-.196.796-.222.907-.035.146-.116.177-.268.107-1-.465-1.624-1.926-1.624-3.1 0-2.523 1.834-4.84 5.286-4.84 2.775 0 4.932 1.977 4.932 4.62 0 2.757-1.739 4.976-4.151 4.976-.811 0-1.573-.421-1.834-.919l-.498 1.902c-.181.695-.669 1.566-.995 2.097A8 8 0 1 0 8 0" />
                </svg>
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                title={t.facebookTitle}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1877f2] hover:brightness-110 transition-all text-white"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>

              <button
                type="button"
                onClick={onShare}
                title={t.copyLinkTitle}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 transition-all text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <button
              type="button"
              disabled={currentSlide === 6}
              onClick={() => setCurrentSlide((prev) => prev + 1)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}