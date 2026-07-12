import Link from 'next/link'

export default function UserDreamList({
  dreams,
  onEdit,
  onRemoveFromFeed,
  onDelete,
}) {
  if (dreams.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-violet-300/18 bg-violet-500/10 text-2xl text-violet-100">
          ✦
        </div>

        <h3 className="text-2xl font-semibold text-white">Henüz rüya görünmüyor</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
          Rüyalarını burada görebilmek için ilk rüyanı ekleyerek başlayabilirsin.
        </p>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/add-dream"
            className="energy-button inline-flex items-center justify-center rounded-full border border-emerald-300/18 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-100 hover:border-emerald-300/34 hover:bg-emerald-500/16"
          >
            ✦ Yeni rüya ekle
          </Link>
          <Link
            href="/globe"
            className="energy-button inline-flex items-center justify-center rounded-full border border-cyan-300/18 bg-cyan-500/10 px-5 py-3 text-sm font-medium text-cyan-100 hover:border-cyan-300/34 hover:bg-cyan-500/16"
          >
            🌐 Küreyi görüntüle
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {dreams.map((dream, index) => (
        <article
          key={dream.id}
          className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_0_50px_rgba(2,6,23,0.35)] backdrop-blur-xl sm:p-6"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.06),transparent_20%)]" />

          <div className="relative">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-300/18 bg-violet-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-violet-100">
                Dream #{dreams.length - index}
              </span>

              {dream.visibility && (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300">
                  {dream.visibility}
                </span>
              )}

              <span
                className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${
                  dream.in_feed !== false
                    ? 'border border-emerald-300/18 bg-emerald-500/10 text-emerald-100'
                    : 'border border-orange-300/18 bg-orange-500/10 text-orange-100'
                }`}
              >
                {dream.in_feed !== false ? 'Feed active' : 'Feed hidden'}
              </span>
            </div>

            <p className="whitespace-pre-wrap text-base leading-8 text-white/90 sm:text-lg">
              {dream.content || 'İçerik bulunamadı.'}
            </p>

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
              {dream.location_name ? (
                <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1">
                  {dream.location_name}
                </span>
              ) : null}

              {dream.created_at ? (
                <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1">
                  {new Date(dream.created_at).toLocaleDateString()}
                </span>
              ) : null}
            </div>

            {(dream.ai_summary_tr || dream.ai_summary || dream.ai_summary_en) && (
              <div className="mt-5 rounded-[1.5rem] border border-cyan-300/14 bg-cyan-500/8 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-cyan-200">🜂</span>
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100">
                    Jungian Analysis
                  </p>
                </div>
                <p className="text-sm leading-7 text-slate-200">
                  {dream.ai_summary_tr || dream.ai_summary || dream.ai_summary_en}
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => onEdit(dream)}
                className="energy-button rounded-full border border-cyan-300/18 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 hover:border-cyan-300/34 hover:bg-cyan-500/18"
              >
                Düzenle
              </button>

              <button
                onClick={() => onRemoveFromFeed(dream)}
                className="energy-button rounded-full border border-orange-300/18 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-100 hover:border-orange-300/34 hover:bg-orange-500/18"
              >
                Feed’den kaldır
              </button>

              <button
                onClick={() => onDelete(dream)}
                className="energy-button rounded-full border border-red-300/18 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100 hover:border-red-300/34 hover:bg-red-500/18"
              >
                Sil
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}