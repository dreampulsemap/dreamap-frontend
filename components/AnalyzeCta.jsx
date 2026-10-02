import Link from 'next/link'

export default function AnalyzeCta() {
  return (
    <div className="mt-12 rounded-2xl border border-astral-gold/30 bg-astral-gold/10 p-6 text-center">
      <p className="font-serif text-xl font-bold text-white mb-2">Kendi rüyanı analiz et</p>
      <p className="text-sm text-white/70 mb-4">
        Rüyanı yaz; sembollerini, baskın arketipini ve duygusal izlerini saniyeler içinde keşfet.
        Rüyaların varsayılan olarak yalnızca sana görünür.
      </p>
      <Link
        href="/auth?mode=signup"
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-astral-gold px-6 py-3 text-xs font-bold uppercase tracking-wider text-void-950 shadow-astral-glow transition-all hover:brightness-110"
      >
        Rüyamı analiz et — ücretsiz başla
      </Link>
    </div>
  )
}
