import Link from 'next/link'

const TEXT = {
  tr: {
    title: 'Kendi rüyanı analiz et',
    body: 'Rüyanı yaz; sembollerini, baskın arketipini ve duygusal izlerini saniyeler içinde keşfet. Rüyaların varsayılan olarak yalnızca sana görünür.',
    cta: 'Rüyamı analiz et — ücretsiz başla',
  },
  en: {
    title: 'Analyze your own dream',
    body: 'Write down your dream and discover its symbols, dominant archetype and emotional traces in seconds. Your dreams are private by default.',
    cta: 'Analyze my dream — start free',
  },
}

export default function AnalyzeCta({ lang = 'tr' }) {
  const t = TEXT[lang] || TEXT.tr
  return (
    <div className="mt-12 rounded-2xl border border-astral-gold/30 bg-astral-gold/10 p-6 text-center">
      <p className="font-serif text-xl font-bold text-white mb-2">{t.title}</p>
      <p className="text-sm text-white/70 mb-4">{t.body}</p>
      <Link
        href="/auth?mode=signup"
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-astral-gold px-6 py-3 text-xs font-bold uppercase tracking-wider text-void-950 shadow-astral-glow transition-all hover:brightness-110"
      >
        {t.cta}
      </Link>
    </div>
  )
}
