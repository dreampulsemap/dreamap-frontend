export default function ProfileHeader({ user, profile }) {
  const primaryName =
    profile?.display_name || profile?.username || user?.email?.split('@')?.[0] || 'Dreamwalker'

  return (
    <div className="glass-card relative overflow-hidden rounded-card p-6 sm:p-8 border border-astral-gold/20 mb-6">
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-astral-gold/40 bg-void-900 text-2xl font-serif font-bold text-astral-gold shadow-astral-glow">
            {(primaryName || 'D').slice(0, 1).toUpperCase()}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400 font-sans">
              Bilinçaltı Kimliği
            </p>
            <h1 className="text-3xl font-serif font-bold gold-gradient-text mt-1">
              {primaryName}
            </h1>
            {profile?.username && (
              <p className="text-xs text-aether-indigo font-sans">@{profile.username}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 font-sans">
          <div className="rounded-xl border border-white/10 bg-void-950/60 p-3 text-center min-w-[100px]">
            <p className="text-[9px] uppercase tracking-wider text-slate-500">Aura Modu</p>
            <p className="text-xs font-bold text-astral-gold mt-1">Simyacı</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-void-950/60 p-3 text-center min-w-[100px]">
            <p className="text-[9px] uppercase tracking-wider text-slate-500">Durum</p>
            <p className="text-xs font-bold text-aether-cyan mt-1">Aktif Düğüm</p>
          </div>
        </div>

      </div>
    </div>
  )
}