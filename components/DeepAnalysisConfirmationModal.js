import React from 'react'

export default function DeepAnalysisConfirmationModal({
  isOpen,
  onClose,
  auras,
  onConfirm,
  lang,
  gumroadUrl,
}) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#070b14] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.65)] sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl text-white/60 hover:text-white transition-colors"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-300 mb-3 shadow-[0_0_15px_rgba(240,73,214,0.1)]">
            ✦ LUNOSFER ORACLE
          </span>
          <h3 className="text-2xl font-bold gradient-text">
            {lang === 'tr' ? 'Derin Rüya Analizini Al' : 'Unlock Deep Dream Analysis'}
          </h3>
        </div>

        <div className="space-y-4 mb-8 text-sm">
          <div className="flex gap-3">
            <span className="text-lg">🌌</span>
            <div>
              <h4 className="font-semibold text-white">{lang === 'tr' ? 'Kozmik Rüya İllüstrasyonu' : 'Cosmic Dream Illustration'}</h4>
              <p className="text-white/60 text-xs mt-0.5">{lang === 'tr' ? 'Rüyanızın mistik sembollerini yansıtan, paylaşmaya hazır harikulade bir sanat eseri.' : 'A beautiful, shareable artwork reflecting the subconscious symbols of your dream.'}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-lg">🜂</span>
            <div>
              <h4 className="font-semibold text-white">{lang === 'tr' ? 'Bilinçaltının Gölgeleri' : 'Shadow Focus'}</h4>
              <p className="text-white/60 text-xs mt-0.5">{lang === 'tr' ? 'Kişiliğinizin bastırılmış, gizli kalmış gölge yönlerinin tespiti.' : 'Explore suppressed or unacknowledged shadow aspects of your psyche.'}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-lg">💫</span>
            <div>
              <h4 className="font-semibold text-white">{lang === 'tr' ? 'Bireyleşme ve Dönüşüm' : 'Path of Transformation'}</h4>
              <p className="text-white/60 text-xs mt-0.5">{lang === 'tr' ? 'Ruhunuzun gelişim ve bütünleşme süreci için kişiselleştirilmiş rehberlik.' : 'Actionable and personal psychic guidance tied directly to your dream drama.'}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-lg">💭</span>
            <div>
              <h4 className="font-semibold text-white">{lang === 'tr' ? 'Derin Sembolik Okuma' : 'Detailed Symbolism & Emotion'}</h4>
              <p className="text-white/60 text-xs mt-0.5">{lang === 'tr' ? 'Rüyanızdaki mistik sembollerin kodları ve detaylı duygu yoğunluk haritası.' : 'Decoding of central symbols and detailed mapping of emotional scores.'}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-400 text-xs uppercase tracking-wider">{lang === 'tr' ? 'Bakiyeniz:' : 'Your Balance:'}</span>
            <span className="text-sm font-semibold text-white">✦ {auras} Aura</span>
          </div>

          {auras >= 8 ? (
            <button
              onClick={onConfirm}
              className="w-full inline-flex min-h-[50px] items-center justify-center rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-6 py-3.5 text-sm font-bold text-white transition hover:scale-[1.01] hover:brightness-110 shadow-[0_0_20px_rgba(240,73,214,0.3)]"
            >
              {lang === 'tr' ? 'Analizi Başlat · 8 Aura' : 'Start Analysis · 8 Auras'}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
                {lang === 'tr' ? 'Derin analiz için yeterli bakiyeniz bulunmuyor. Oracle analizi başlatmak için Gumroad üzerinden bakiye paketi alabilirsiniz.' : 'Insufficient balance. Purchase an Aura package to start this Oracle analysis.'}
              </p>
              <a
                href={gumroadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex min-h-[50px] items-center justify-center rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-6 py-3.5 text-sm font-bold text-white transition hover:scale-[1.01]"
              >
                {lang === 'tr' ? 'Aura Satın Al (Gumroad)' : 'Buy Auras (Gumroad)'}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}