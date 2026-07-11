export default function ProfileHeader({ user, profile }) {
  const primaryName =
    profile?.display_name || profile?.username || user?.email?.split('@')?.[0] || 'Dreamwalker'

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-7">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.14),transparent_32%)]" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-cyan-300/20 bg-gradient-to-br from-cyan-500/16 via-violet-500/16 to-emerald-500/10 text-2xl font-semibold text-white shadow-[0_0_35px_rgba(139,92,246,0.15)]">
            {(primaryName || 'D').slice(0, 1).toUpperCase()}
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
              Bilinçaltı Kimliği
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
              <span className="gradient-text">{primaryName}</span>
            </h1>

            {profile?.username ? (
              <p className="mt-2 text-sm text-violet-200">@{profile.username}</p>
            ) : null}

            {user?.email ? (
              <p className="mt-2 text-sm text-slate-300">{user.email}</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:w-auto">
          <div className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Aura
            </p>
            <p className="mt-2 text-sm font-medium text-cyan-200">Neon Mystic</p>
          </div>

          <div className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Mode
            </p>
            <p className="mt-2 text-sm font-medium text-emerald-200">Dream Active</p>
          </div>
        </div>
      </div>
    </div>
  )
}