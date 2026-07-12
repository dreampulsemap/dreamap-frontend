import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { auth, supabase } from '../lib/supabase'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '../lib/translations'

export default function ProfilePage() {
  const { i18n } = useTranslation()
  const router = useRouter()
  const lang = i18n.language || 'en'

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [dreams, setDreams] = useState([])
  const [loading, setLoading] = useState(true)

  const [editingDream, setEditingDream] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editVisibility, setEditVisibility] = useState('public')
  const [editInFeed, setEditInFeed] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showFriends, setShowFriends] = useState(false)
  const [friends, setFriends] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)

  const t = (key, fallback = '') => {
    const value = getTranslation(key, lang)
    return value && value !== key ? value : fallback
  }

  const getDreamAnalysis = (dream) =>
    dream?.[`ai_summary_${lang}`] || dream?.ai_summary || dream?.ai_summary_en || ''

  const getDreamMotiv = (dream) =>
    dream?.[`ai_motiv_${lang}`] || dream?.ai_motiv || dream?.ai_motiv_en || ''

  const getDreamImage = (dream) => dream?.ai_image_url || null

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await auth.getUser()
        if (!currentUser) {
          router.push('/auth')
          return
        }

        setUser(currentUser)
        setProfile(await auth.getProfile(currentUser.id))
        await loadDreams(currentUser.id)
        await loadFriends(currentUser.id)
      } catch (error) {
        console.error('Profile load error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  async function loadDreams(userId) {
    const { data } = await supabase
      .from('dreams')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    setDreams(data || [])
  }

  async function loadFriends(userId) {
    const [friendsRes, pendingRes] = await Promise.all([
      fetch(`/api/friends/list?userId=${userId}&type=accepted`),
      fetch(`/api/friends/list?userId=${userId}&type=pending`),
    ])

    const friendsData = await friendsRes.json()
    const pendingData = await pendingRes.json()

    setFriends(friendsData.friendships || [])
    setPendingRequests(pendingData.friendships || [])
  }

  async function handleLogout() {
    await auth.signOut()
    router.push('/')
  }

  function openEditModal(dream) {
    setEditingDream(dream)
    setEditContent(dream?.content || '')
    setEditLocation(dream?.location_name || '')
    setEditVisibility(dream?.visibility || 'public')
    setEditInFeed(Boolean(dream?.in_feed))
  }

  function closeEditModal() {
    setEditingDream(null)
    setEditContent('')
    setEditLocation('')
    setEditVisibility('public')
    setEditInFeed(true)
  }

  async function handleSaveEdit() {
    if (!editingDream || !user) return

    setSaving(true)
    try {
      const res = await fetch('/api/update-dream', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamId: editingDream.id,
          userId: user.id,
          content: editContent,
          location_name: editLocation,
          visibility: editVisibility,
          in_feed: editInFeed,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')

      await loadDreams(user.id)
      closeEditModal()
    } catch (err) {
      alert('Hata: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveFromFeed(dream) {
    if (!confirm("Feed'den kaldırılsın mı?")) return

    try {
      const res = await fetch('/api/delete-dream', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamId: dream.id,
          userId: user.id,
          softDelete: true,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')

      await loadDreams(user.id)
    } catch (err) {
      alert('Hata: ' + err.message)
    }
  }

  async function handleDeleteDream(dream) {
    if (!confirm('Tamamen silinsin mi?')) return

    try {
      const res = await fetch('/api/delete-dream', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamId: dream.id,
          userId: user.id,
          softDelete: false,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')

      await loadDreams(user.id)
    } catch (err) {
      alert('Hata: ' + err.message)
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim() || !user) return

    const res = await fetch(
      `/api/friends/search?query=${encodeURIComponent(searchQuery)}&userId=${user.id}`
    )
    const data = await res.json()
    setSearchResults(data.users || [])
    setShowSearch(true)
  }

  async function handleSendRequest(friendId) {
    const res = await fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, friendId }),
    })

    const data = await res.json()

    if (res.ok) {
      alert(t('friends.requestSent', 'İstek gönderildi'))
      await handleSearch()
    } else {
      alert(data.error)
    }
  }

  async function handleRespondRequest(friendshipId, action) {
    const res = await fetch('/api/friends/respond', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendshipId, userId: user.id, action }),
    })

    if (res.ok) {
      alert(
        action === 'accepted'
          ? t('friends.requestAccepted', 'İstek kabul edildi')
          : t('friends.requestRejected', 'İstek reddedildi')
      )
      await loadFriends(user.id)
    }
  }

  async function handleRemoveFriend(friendshipId) {
    if (!confirm(t('friends.removeFriend', 'Arkadaşı kaldır') + '?')) return

    const res = await fetch('/api/friends/respond', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendshipId, userId: user.id, action: 'rejected' }),
    })

    if (res.ok) {
      alert(t('friends.friendRemoved', 'Arkadaş kaldırıldı'))
      await loadFriends(user.id)
    }
  }

  function formatDate(dateString) {
    try {
      return new Date(dateString).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    } catch {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-28 rounded-[28px] border border-white/10 bg-white/5" />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="h-32 rounded-[24px] bg-white/5" />
            <div className="h-32 rounded-[24px] bg-white/5" />
            <div className="h-32 rounded-[24px] bg-white/5" />
          </div>
          <div className="mt-6 h-64 rounded-[24px] bg-white/5" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="relative mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.82),rgba(3,7,18,0.96))] p-5 shadow-[0_0_80px_rgba(15,23,42,0.35)] backdrop-blur-2xl sm:mb-8 sm:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_24%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_30%)]" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-3 py-2 shadow-[0_0_30px_rgba(56,189,248,0.06)]">
                <Image
                  src="/logo.png"
                  alt="Lunosfer"
                  width={136}
                  height={40}
                  priority
                  className="h-9 w-auto object-contain sm:h-10"
                />
              </div>

              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/70">
                  {t('nav.profile', 'Profile')}
                </p>
                <p className="mt-1 truncate text-sm text-slate-300">{user?.email}</p>
                {profile?.username ? (
                  <p className="mt-1 text-sm text-slate-400">@{profile.username}</p>
                ) : null}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:border-rose-300/25 hover:bg-rose-500/10 hover:text-white"
            >
              {t('auth.logout', 'Çıkış Yap')}
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
              {t('profile.totalDreams', 'Toplam Rüya')}
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">{dreams.length}</p>
          </div>

          <button
            onClick={() => setShowFriends((prev) => !prev)}
            className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-left backdrop-blur-xl transition hover:border-cyan-300/20 hover:bg-cyan-500/[0.06]"
          >
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
              {t('friends.title', 'Arkadaşlar')}
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">{friends.length}</p>
            <p className="mt-2 text-sm text-slate-400">
              {pendingRequests.length > 0
                ? `${pendingRequests.length} ${t('friends.pending', 'bekleyen istek')}`
                : t('friends.noPending', 'Bekleyen istek yok')}
            </p>
          </button>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
              {t('profile.feedStatus', 'Feed Durumu')}
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {dreams.filter((d) => d.in_feed).length}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {t('profile.inFeed', 'Rüya aktif olarak feed içinde')}
            </p>
          </div>
        </div>

        {showFriends ? (
          <div className="mb-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-white">
                {t('friends.title', 'Arkadaşlar')}
              </h2>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('friends.searchPlaceholder', 'Arkadaş ara')}
                  className="min-h-[44px] rounded-full border border-white/10 bg-black/20 px-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300/30 focus:outline-none"
                />
                <button
                  onClick={handleSearch}
                  className="min-h-[44px] rounded-full border border-cyan-300/20 bg-cyan-500/10 px-4 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
                >
                  {t('friends.search', 'Ara')}
                </button>
              </div>
            </div>

            {pendingRequests.length > 0 ? (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                  {t('friends.pendingRequests', 'Bekleyen İstekler')}
                </h3>
                <div className="grid gap-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {request.requester?.username || request.requester?.email || 'User'}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRespondRequest(request.id, 'accepted')}
                          className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100"
                        >
                          {t('friends.accept', 'Kabul Et')}
                        </button>
                        <button
                          onClick={() => handleRespondRequest(request.id, 'rejected')}
                          className="rounded-full border border-rose-300/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100"
                        >
                          {t('friends.reject', 'Reddet')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6">
              <h3 className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                {t('friends.yourFriends', 'Arkadaşların')}
              </h3>

              {friends.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                  {t('friends.noFriends', 'Henüz arkadaşın yok')}
                </div>
              ) : (
                <div className="grid gap-3">
                  {friends.map((friendship) => {
                    const friend =
                      friendship.requester?.id === user?.id
                        ? friendship.addressee
                        : friendship.requester

                    return (
                      <div
                        key={friendship.id}
                        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-white">
                            {friend?.username || friend?.email || 'User'}
                          </p>
                          {friend?.email ? (
                            <p className="text-sm text-slate-400">{friend.email}</p>
                          ) : null}
                        </div>

                        <button
                          onClick={() => handleRemoveFriend(friendship.id)}
                          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-rose-300/25 hover:bg-rose-500/10 hover:text-white"
                        >
                          {t('friends.removeFriend', 'Arkadaşı Kaldır')}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {showSearch ? (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                  {t('friends.searchResults', 'Arama Sonuçları')}
                </h3>

                {searchResults.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                    {t('friends.noResults', 'Sonuç bulunamadı')}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-white">
                            {result.username || result.email}
                          </p>
                          {result.email ? (
                            <p className="text-sm text-slate-400">{result.email}</p>
                          ) : null}
                        </div>

                        <button
                          onClick={() => handleSendRequest(result.id)}
                          className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100"
                        >
                          {t('friends.addFriend', 'Arkadaş Ekle')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">
              {t('profile.myDreams', 'Rüyalarım')}
            </h2>
          </div>

          {dreams.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-slate-400">
              {t('profile.noDreams', 'Henüz bir rüya eklemedin')}
            </div>
          ) : (
            <div className="grid gap-4">
              {dreams.map((dream) => {
                const analysis = getDreamAnalysis(dream)
                const motiv = getDreamMotiv(dream)
                const image = getDreamImage(dream)

                return (
                  <article
                    key={dream.id}
                    className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20"
                  >
                    {image ? (
                      <div className="relative aspect-[16/7] w-full overflow-hidden border-b border-white/10">
                        <Image
                          src={image}
                          alt="Dream visual"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : null}

                    <div className="p-5">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                          {formatDate(dream.created_at)}
                        </span>

                        <span className="rounded-full border border-cyan-300/14 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                          {dream.visibility || 'public'}
                        </span>

                        {dream.in_feed ? (
                          <span className="rounded-full border border-emerald-300/14 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
                            Feed
                          </span>
                        ) : (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
                            Hidden
                          </span>
                        )}
                      </div>

                      <p className="whitespace-pre-wrap text-base leading-7 text-slate-200">
                        {dream.content || '[İçerik silindi]'}
                      </p>

                      {dream.location_name ? (
                        <p className="mt-3 text-sm text-slate-400">📍 {dream.location_name}</p>
                      ) : null}

                      {dream.ai_archetypes?.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {dream.ai_archetypes.map((item, index) => (
                            <span
                              key={`${dream.id}-arch-${index}`}
                              className="rounded-full border border-violet-300/14 bg-violet-500/10 px-3 py-1 text-xs text-violet-100"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {analysis ? (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            {t('profile.analysis', 'Analiz')}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-300">{analysis}</p>
                        </div>
                      ) : null}

                      {motiv ? (
                        <div className="mt-3 rounded-2xl border border-fuchsia-300/10 bg-fuchsia-500/5 p-4 text-sm text-fuchsia-100">
                          💫 {motiv}
                        </div>
                      ) : null}

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          onClick={() => openEditModal(dream)}
                          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200"
                        >
                          {t('common.edit', 'Düzenle')}
                        </button>

                        <button
                          onClick={() => handleRemoveFromFeed(dream)}
                          className="rounded-full border border-amber-300/18 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-100"
                        >
                          {t('profile.removeFromFeed', "Feed'den Kaldır")}
                        </button>

                        <button
                          onClick={() => handleDeleteDream(dream)}
                          className="rounded-full border border-rose-300/18 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100"
                        >
                          {t('common.delete', 'Sil')}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {editingDream ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-slate-950 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-white">
                {t('common.edit', 'Düzenle')}
              </h3>
              <button
                onClick={closeEditModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  {t('dream.content', 'Rüya İçeriği')}
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={7}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300/30 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  {t('dream.location', 'Konum')}
                </label>
                <input
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300/30 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  {t('dream.visibility', 'Görünürlük')}
                </label>
                <select
                  value={editVisibility}
                  onChange={(e) => setEditVisibility(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white focus:border-cyan-300/30 focus:outline-none"
                >
                  <option value="public">public</option>
                  <option value="friends">friends</option>
                  <option value="private">private</option>
                </select>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={editInFeed}
                  onChange={(e) => setEditInFeed(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-transparent"
                />
                {t('profile.showInFeed', "Feed'de göster")}
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                onClick={closeEditModal}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200"
              >
                {t('common.cancel', 'Vazgeç')}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 disabled:opacity-50"
              >
                {saving ? t('common.saving', 'Kaydediliyor...') : t('common.save', 'Kaydet')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}