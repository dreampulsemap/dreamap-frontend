import React from 'react'
import { getDreamCardText } from '@/lib/dreamCardTranslations'

export default function StoryModeModal({
  isOpen,
  onClose,
  dreamImage,
  dreamTitle,
  dreamMotiv,
  premiumAnalysis,
  lang,
  translateArchetype,
}) {
  if (!isOpen || !premiumAnalysis) return null
  const t = getDreamCardText(lang)

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[360px] aspect-[9/16] rounded-3xl overflow-hidden border border-white/10 bg-[#050711] shadow-[0_30px_100px_rgba(0,0,0,0.95)] flex flex-col justify-between p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[220] text-xl text-white/60 hover:text-white transition-colors"
        >
          ✕
        </button>

        {dreamImage && (
          <div className="absolute inset-0 z-0">
            <img src={dreamImage} alt="Story bg" className="w-full h-full object-cover opacity-35 filter blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-[#050711]" />
          </div>
        )}

        <div className="relative z-10 flex flex-col h-full justify-between pointer-events-none select-none">
          <div className="text-center pt-4">
            <span className="text-[10px] tracking-[0.24em] font-black text-cyan-300 uppercase block mb-1">{t.storyTitle}</span>
            <span className="text-[9px] tracking-widest text-white/50 uppercase block">{t.storySubtitle}</span>
          </div>

          <div className="my-auto flex flex-col items-center">
            <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl relative">
              {dreamImage ? (
                <img src={dreamImage} alt="Dream Visual" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-purple-900 to-black">🌌</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h4 className="text-lg font-bold text-white mb-1.5 leading-tight font-serif">{dreamTitle}</h4>
                <p className="text-[9px] text-slate-300 italic mb-2">"{dreamMotiv}"</p>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(premiumAnalysis?.archetypes) &&
                    premiumAnalysis?.archetypes.slice(0, 2).map((arch, i) => (
                      <span key={i} className="text-[8px] font-semibold bg-violet-500/30 border border-violet-400/40 px-2 py-0.5 rounded-full text-violet-100">
                        ✦ {translateArchetype(arch)}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center pb-2">
            <p className="text-[9px] text-white/40 tracking-wider mb-2">
              {t.storyInstructions}
            </p>
            <span className="inline-block px-3 py-1 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 text-[9px] font-bold text-fuchsia-300">
              🔗 lunosfer.com
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}