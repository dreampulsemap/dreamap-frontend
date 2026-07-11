export default function FriendsPanel({
  friends,
  pendingRequests,
  searchQuery,
  setSearchQuery,
  searchResults,
  onSearch,
  onSendRequest,
  onRespondRequest,
}) {
  return (
    <div className="glass-card p-6 sm:p-7">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
          Social Resonance
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Arkadaş Çemberi</h2>
        <p className="mt-2 text-sm leading-7 text-slate-400">
          Kolektif rüya alanında bağ kurduğun kişiler, eşzamanlı semboller ve ortak arketip
          izleri burada görünür.
        </p>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Kullanıcı ara"
            className="flex-1 rounded-[1.1rem] border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-white/30 focus:border-cyan-400/30 focus:outline-none"
          />
          <button
            onClick={onSearch}
            className="energy-button rounded-full border border-cyan-300/18 bg-cyan-500/10 px-5 py-3 text-sm font-medium text-cyan-100 hover:border-cyan-300/34 hover:bg-cyan-500/18"
          >
            Ara
          </button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            Arama sonuçları
          </h3>

          <div className="space-y-3">
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-3 rounded-[1.2rem] border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">
                    {user.display_name || user.username || 'Kullanıcı'}
                  </p>
                  {user.username && (
                    <p className="mt-1 text-sm text-slate-400">@{user.username}</p>
                  )}
                </div>

                <button
                  onClick={() => onSendRequest(user.id)}
                  className="energy-button rounded-full border border-emerald-300/18 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 hover:border-emerald-300/34 hover:bg-emerald-500/18"
                >
                  İstek gönder
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
          Bekleyen istekler
        </h3>

        {pendingRequests.length === 0 ? (
          <p className="text-sm text-slate-400">Bekleyen istek yok.</p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-[1.2rem] border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-white">{item.user_profiles?.username || 'Kullanıcı'}</p>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onRespondRequest(item.id, 'accepted')}
                    className="energy-button rounded-full border border-cyan-300/18 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 hover:border-cyan-300/34 hover:bg-cyan-500/18"
                  >
                    Kabul et
                  </button>
                  <button
                    onClick={() => onRespondRequest(item.id, 'rejected')}
                    className="energy-button rounded-full border border-red-300/18 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100 hover:border-red-300/34 hover:bg-red-500/18"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
          Arkadaş listesi
        </h3>

        {friends.length === 0 ? (
          <p className="text-sm text-slate-400">Henüz arkadaş yok.</p>
        ) : (
          <div className="space-y-3">
            {friends.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.2rem] border border-white/10 bg-black/20 p-4"
              >
                <p className="text-white">
                  {item.user_profiles?.username ||
                    item.friend_profiles?.username ||
                    'Kullanıcı'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}