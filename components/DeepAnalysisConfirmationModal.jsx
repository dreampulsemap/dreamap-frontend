import { X } from 'lucide-react'
import React, { useRef } from 'react'
import { getDreamCardText } from '@/lib/dreamCardTranslations'
import { useModalA11y } from '@/lib/useModalA11y'

export default function DeepAnalysisConfirmationModal({
  isOpen,
  onClose,
  auras,
  isPremiumMember = false,
  onConfirm,
  lang,
  gumroadUrl,
  isGift = false,
  isGenerating = false,
}) {
  const modalRef = useRef(null)
  useModalA11y(modalRef, isOpen ? onClose : null)
  if (!isOpen) return null
  const t = getDreamCardText(lang)

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={isGenerating ? undefined : onClose}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#070b14] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.65)] sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* KAPATMA BUTONU */}
        <button
          onClick={onClose}
          disabled={isGenerating}
          aria-label={lang === 'tr' ? 'Kapat' : 'Close'}
          className="absolute top-4 right-4 text-2xl text-white/60 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <X size={20} />
        </button>

        {/* BAŞLIK */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary-400/20 bg-brand-primary-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-primary-300 mb-3 shadow-[0_0_15px_rgba(240,73,214,0.1)]">
            ✦ {t.confirmBadge}
          </span>
          <h3 className="text-2xl font-bold gold-gradient-text font-serif">
            {isGift ? t.confirmGiftTitle : t.confirmTitle}
          </h3>
        </div>

        {/* DETAYLAR */}
        <div className="space-y-4 mb-8 text-sm">
          <div className="flex gap-3">
            <span className="text-lg">🌌</span>
            <div>
              <h4 className="font-semibold text-white">{t.confirmVisualTitle}</h4>
              <p className="text-white/60 text-xs mt-0.5">{t.confirmVisualDesc}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-lg">🜂</span>
            <div>
              <h4 className="font-semibold text-white">{t.confirmShadowTitle}</h4>
              <p className="text-white/60 text-xs mt-0.5">{t.confirmShadowDesc}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-lg">💫</span>
            <div>
              <h4 className="font-semibold text-white">{t.confirmTransformTitle}</h4>
              <p className="text-white/60 text-xs mt-0.5">{t.confirmTransformDesc}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-lg">💭</span>
            <div>
              <h4 className="font-semibold text-white">{t.confirmSymbolTitle}</h4>
              <p className="text-white/60 text-xs mt-0.5">{t.confirmSymbolDesc}</p>
            </div>
          </div>
        </div>

        {/* BAKİYE VE EYLEM */}
        <div className="border-t border-white/10 pt-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-400 text-xs uppercase tracking-wider">{t.balanceLabel}</span>
            {isPremiumMember ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-200">
                ✦ {t.premiumUnlimitedLabel}
              </span>
            ) : (
              <span className="text-sm font-semibold text-white">✦ {auras} Aura</span>
            )}
          </div>

          {(isPremiumMember || auras >= 8) ? (
            <button
              onClick={isGenerating ? undefined : onConfirm}
              disabled={isGenerating}
              className="w-full inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-primary-500 to-violet-600 px-6 py-3.5 text-sm font-bold text-white transition hover:scale-[1.01] hover:brightness-110 shadow-[0_0_20px_rgba(240,73,214,0.3)] disabled:opacity-80 disabled:hover:scale-100"
            >
              {isGenerating ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  {t.generatingAnalysis}
                </>
              ) : isPremiumMember ? (
                isGift ? t.startGiftAnalysisPremiumLabel : t.startAnalysisPremiumLabel
              ) : (
                isGift ? t.startGiftAnalysisLabel : t.startAnalysisLabel
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-semantic-danger-300 bg-semantic-danger-500/10 border border-semantic-danger-500/20 rounded-xl p-3 text-center">
                {t.insufficientAuras}
              </p>
              <a
                href={gumroadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex min-h-[50px] items-center justify-center rounded-2xl bg-gradient-to-r from-brand-primary-500 to-violet-600 px-6 py-3.5 text-sm font-bold text-white transition hover:scale-[1.01]"
              >
                {t.buyAuraLabel}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}