import React, { useState } from 'react'
import { getVal } from '@/lib/archetypeTranslations'

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
  translateArchetype,
  onOpenStoryMode,
  dreamId
}) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  if (!isOpen || !premiumAnalysis) return null

  // Dinamik paylaşım bağlantısı
  const dreamUrl = typeof window !== 'undefined' ? `${window.location.origin}/dreams/${dreamId}` : ''
  const encodedUrl = encodeURIComponent(dreamUrl)
  const encodedImage = encodeURIComponent(dreamImage || '')
  
  const rawShareText = lang === 'tr'
    ? `✦ Lunosfer rüya ağına katıldım! 🌌\nRüyamın mistik Jungyen derin analizini ve yapay zeka illüstrasyonunu buradan gör:\n🔗 ${dreamUrl}`
    : `✦ I joined the Lunosfer dream network! 🌌\nSee my mystical Jungian deep analysis and AI dream illustration here:\n🔗 ${dreamUrl}`
  
  const encodedText = encodeURIComponent(rawShareText)

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
    { title: lang === 'tr' ? 'Rüya Kartı' : 'Dream Card' },
    { title: lang === 'tr' ? 'Rüya Defteriniz' : 'Your Dream Text' },
    { title: lang === 'tr' ? 'Bilinçaltı Sinyali (Teaser)' : 'Subconscious Signal' },
    { title: lang === 'tr' ? 'Kozmik Çözümleme' : 'Symbolic Reading' },
    { title: lang === 'tr' ? 'Gölge & Çatışma' : 'Shadow & Core Conflict' },
    { title: lang === 'tr' ? 'Dönüşüm Yolu' : 'Path of Transformation' },
    { title: lang === 'tr' ? 'Ruhsal Yansımalar' : 'Reflection Questions' },
  ]

  return (
    <div
      className="fixed inset-0 z-[160] flex items-end justify-center bg-black/90 backdrop-blur-lg sm:items-center sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
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
          onClick={onClose}
          className="absolute top-4 right-4 z-[180] inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white hover:bg-white/10 transition-all"
        >
          ✕
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
            onClick={onOpenStoryMode}
            className="absolute top-18 right-4 z-[180] inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-200 hover:bg-cyan-500/20 transition-all"
          >
            📱 {lang === 'tr' ? 'HİKAYE MODU' : 'STORY MODE'}
          </button>
        )}

        {/* SLAYT İÇERİKLERİ */}
        <div className="relative w-full h-[calc(100%-140px)] mt-16 px-6 py-4 overflow-y-auto sm:px-12 select-none">
          
          {/* SLAYT 1: KOZMİK GÖRSEL */}
          {currentSlide === 0 && (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <div className="relative w-full max-w-md h-[45vh] rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl">
                {dreamImage ? (
                  <img src={dreamImage} alt="Dream Visual" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-purple-900 to-black">🌌</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#040711] via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <h4 className="text-xl font-bold text-white mb-2 leading-tight font-serif">{dreamTitle}</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(premiumAnalysis?.archetypes) &&
                      premiumAnalysis?.archetypes.map((arch, i) => (
                        <span key={i} className="text-[9px] font-semibold bg-violet-500/20 border border-violet-400/30 px-2 py-0.5 rounded-full text-violet-100">
                          ✦ {translateArchetype(arch)}
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
                {lang === 'tr' ? 'Rüya Defteriniz' : 'Your Dream Journal'}
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
                {lang === 'tr' ? 'Bilinçaltı Sinyali (Genel Yorum)' : 'Subconscious Signal'}
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
                {lang === 'tr' ? 'Rüyanın Sembolik Yol Haritası' : 'Symbolic Roadmap'}
              </h4>
              <p className="text-sm leading-8 text-slate-200 font-light whitespace-pre-wrap overflow-y-auto max-h-[30vh] pr-2">
                {getVal(premiumAnalysis?.symbolic_reading, lang) || getVal(premiumAnalysis?.summary, lang)}
              </p>
            </div>
          )}

          {/* SLAYT 5: GÖLGE VE ÇATIŞMA */}
          {currentSlide === 4 && (
            <div className="h-full flex flex-col justify-center gap-6 max-w-2xl mx-auto">
              <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/[0.02]">
                <h5 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  {lang === 'tr' ? 'Bastırılmış Benlik (Gölge)' : 'Shadow Focus'}
                </h5>
                <p className="text-xs leading-6 text-slate-300 font-light overflow-y-auto max-h-[15vh] pr-2">{getVal(premiumAnalysis?.shadow_focus, lang)}</p>
              </div>
              <div className="p-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.02]">
                <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  {lang === 'tr' ? 'Temel Gerilim (Çatışma)' : 'Core Conflict'}
                </h5>
                <p className="text-xs leading-6 text-slate-300 font-light overflow-y-auto max-h-[15vh] pr-2">{getVal(premiumAnalysis?.core_conflict, lang)}</p>
              </div>
            </div>
          )}

          {/* SLAYT 6: BİREYLEŞME */}
          {currentSlide === 5 && (
            <div className="h-full flex flex-col justify-center max-w-xl mx-auto">
              <span className="text-2xl mb-3 text-violet-400">💫</span>
              <h4 className="text-lg font-bold uppercase tracking-wider text-slate-400 mb-3">
                {lang === 'tr' ? 'Uyanık Hayata Entegrasyon' : 'Path of Transformation'}
              </h4>
              <p className="text-sm leading-8 text-slate-200 font-light whitespace-pre-wrap overflow-y-auto max-h-[30vh] pr-2">
                {getVal(premiumAnalysis?.individuation_path, lang)}
              </p>
            </div>
          )}

          {/* SLAYT 7: SORULAR */}
          {currentSlide === 6 && (
            <div className="h-full flex flex-col justify-center gap-4 max-w-xl mx-auto">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">
                {lang === 'tr' ? 'Kendinize Sormanız Gereken Sorular' : 'Reflection Questions'}
              </h4>
              {Array.isArray(premiumAnalysis?.reflection_questions) &&
                premiumAnalysis?.reflection_questions.slice(0, 3).map((q, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-fuchsia-400/40" />
                    <span className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest block mb-1">
                      {lang === 'tr' ? `Yansıma ${idx + 1}` : `Reflection ${idx + 1}`}
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed italic">"{q}"</p>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* ALT NOKTALAR VE NAVİGASYON - SOSYAL PAYLAŞIM MERKEZİ */}
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

            <div className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white/[0.03] border border-white/10 px-3 py-1.5">
              <button
                type="button"
                onClick={onLunosferShare}
                title={lang === 'tr' ? 'Lunosfer Sohbet Çemberinde Paylaş' : 'Share in Lunosfer Chat'}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 hover:brightness-110 transition-all text-base"
              >
                🔮
              </button>

              <a
                href={`https://twitter.com/intent/tweet?text=${encodedText}&hashtags=Lunosfer,JungianDream`}
                target="_blank"
                rel="noopener noreferrer"
                title="X / Twitter'da Paylaş"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-black hover:bg-white/10 border border-white/10 transition-all text-xs font-bold text-white"
              >
                X
              </a>

              <a
                href={`https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedText}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Pinterest'e Pinle"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e60023] hover:brightness-110 transition-all text-sm text-white"
              >
                📌
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Facebook'ta Paylaş"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1877f2] hover:brightness-110 transition-all text-sm text-white font-bold"
              >
                F
              </a>

              <a
                href={`https://api.whatsapp.com/send?text=${encodedText}`}
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp ile Gönder"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#25d366] hover:brightness-110 transition-all text-base"
              >
                💬
              </a>

              <button
                type="button"
                onClick={onShare}
                title={lang === 'tr' ? 'Bağlantıyı Kopyala' : 'Copy Link'}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 transition-all text-sm text-white"
              >
                🔗
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