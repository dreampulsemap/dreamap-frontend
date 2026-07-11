import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import useCurrentUser from '../hooks/useCurrentUser'
import { auth } from '../lib/supabase'
import ProfileHeader from '../components/profile/ProfileHeader'
import UserDreamList from '../components/dreams/UserDreamList'
import FriendsPanel from '../components/friends/FriendsPanel'
import DreamEditModal from '../components/dreams/DreamEditModal'
import {
  getUserDreams,
  removeDreamFromFeed,
  deleteDreamPermanently,
  updateDream,
} from '../services/dreamService'
import {
  getFriends,
  searchUsers,
  sendFriendRequest,
  respondToFriendRequest,
} from '../services/friendService'

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading } = useCurrentUser('/auth')

  const [profile, setProfile] = useState(null)
  const [dreams, setDreams] = useState([])
  const [friends, setFriends] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [editingDream, setEditingDream] = useState(null)
  const [saving, setSaving] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function loadPage() {
      try {
        const profileData = await auth.getProfile(user.id)
        const userDreams = await getUserDreams(user.id)
        const friendData = await getFriends(user.id)

        setProfile(profileData)
        setDreams(userDreams)
        setFriends(friendData.friends || [])
        setPendingRequests(friendData.pending || [])
      } catch (error) {
        console.error('Profil yükleme hatası:', error)
      } finally {
        setPageLoading(false)
      }
    }

    loadPage()
  }, [user])

  async function reloadDreams() {
    if (!user) return
    const userDreams = await getUserDreams(user.id)
    setDreams(userDreams)
  }

  async function reloadFriends() {
    if (!user) return
    const friendData = await getFriends(user.id)
    setFriends(friendData.friends || [])
    setPendingRequests(friendData.pending || [])
  }

  async function handleLogout() {
    await auth.signOut()
    router.push('/')
  }

  async function handleRemoveFromFeed(dream) {
    if (!user) return
    if (!confirm("Feed'den kaldırılsın mı?")) return

    try {
      await removeDreamFromFeed(dream.id, user.id)
      await reloadDreams()
    } catch (error) {
      alert(error.message)
    }
  }

  async function handleDelete(dream) {
    if (!user) return
    if (!confirm('Rüya tamamen silinsin mi?')) return

    try {
      await deleteDreamPermanently(dream.id, user.id)
      await reloadDreams()
    } catch (error) {
      alert(error.message)
    }
  }

  async function handleSaveEdit(updates) {
    if (!user || !editingDream) return

    setSaving(true)
    try {
      await updateDream(editingDream.id, user.id, updates)
      setEditingDream(null)
      await reloadDreams()
    } catch (error) {
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSearch() {
    if (!user || !searchQuery.trim()) return

    try {
      const users = await searchUsers(searchQuery, user.id)
      setSearchResults(users || [])
    } catch (error) {
      alert(error.message)
    }
  }

  async function handleSendRequest(friendId) {
    if (!user) return

    try {
      await sendFriendRequest(user.id, friendId)
      await handleSearch()
      await reloadFriends()
    } catch (error) {
      alert(error.message)
    }
  }

  async function handleRespondRequest(friendshipId, action) {
    if (!user) return

    try {
      await respondToFriendRequest(friendshipId, user.id, action)
      await reloadFriends()
    } catch (error) {
      alert(error.message)
    }
  }

  const stats = useMemo(() => {
    const inFeedCount = dreams.filter((dream) => dream.in_feed !== false).length
    const privateCount = dreams.filter((dream) => dream.visibility === 'private').length
    const archetypeCount = dreams.filter(
      (dream) => Array.isArray(dream.ai_archetypes) && dream.ai_archetypes.length > 0
    ).length

    return {
      totalDreams: dreams.length,
      inFeedCount,
      privateCount,
      archetypeCount,
      friendCount: friends.length,
      pendingCount: pendingRequests.length,
      streak: Math.max(1, Math.min(14, dreams.length + 1)),
      resonance: Math.min(99, 72 + dreams.length * 2),
    }
  }, [dreams, friends, pendingRequests])

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="starry-bg" />
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="glass-card flex min-h-[320px] flex-col items-center justify-center p-10 text-center">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-violet-300/30 border-t-violet-300" />
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">
              Bilinçaltı profili hazırlanıyor
            </p>
          </div>
        </main>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      <div className="starry-bg" />
      <div className="floating-orb orb-1" />
      <div className="floating-orb orb-2" />
      <div className="floating-orb orb-3" />
      <div className="cosmic-grid" />
      <div className="noise-overlay" />

      <Navbar />

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 p-6 shadow-[0_0_80px_rgba(14,165,233,0.08)] backdrop-blur-2xl sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.15),transparent_24%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.2),transparent_32%),radial-gradient(circle_at_bottom_center,rgba(16,185,129,0.08),transparent_22%),linear-gradient(180deg,rgba(3,7,18,0.72),rgba(2,6,23,0.94))]" />
          <div className="relative">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="purple-badge w-fit">
                <span className="signal-dot purple" />
                Subconscious Profile
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/add-dream"
                  className="energy-button inline-flex items-center justify-center rounded-full border border-emerald-300/18 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 hover:border-emerald-300/34 hover:bg-emerald-500/18"
                >
                  ✦ Yeni Rüya
                </Link>
                <button
                  onClick={handleLogout}
                  className="energy-button inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  Çıkış yap
                </button>
              </div>
            </div>

            <ProfileHeader user={user} profile={profile} />

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="metric-tile p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Dream Streak
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <p className="text-2xl font-semibold text-white">{stats.streak}</p>
                    <p className="text-sm text-emerald-300">series alive</p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-violet-500"
                    style={{ width: `${Math.min(stats.streak * 8, 100)}%` }}
                  />
                </div>
              </div>

              <div className="metric-tile p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Total Dreams
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">{stats.totalDreams}</p>
                <p className="mt-2 text-sm text-slate-400">
                  bilinçaltı arşivinde kayıtlı toplam rüya
                </p>
              </div>

              <div className="metric-tile p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Resonance
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">%{stats.resonance}</p>
                <p className="mt-2 text-sm text-cyan-300">
                  kolektif ağ ile senkronizasyon
                </p>
              </div>

              <div className="metric-tile p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  The Vault
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-full border border-violet-300/20 bg-violet-500/12 px-3 py-1 text-xs uppercase tracking-[0.16em] text-violet-100">
                    {stats.archetypeCount > 0 ? 'Unlocked' : 'Locked'}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300">
                    {stats.friendCount} Allies
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-400">
                  arketip birikimi, arkadaş çevresi ve gizli semboller burada büyür
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-card p-6 sm:p-7">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Dream Repository
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                  Rüya Arşivin
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                  Profilinde görünen tüm rüyalar burada birikir. Eğer burada boş görünüyorsa,
                  sorun büyük ihtimalle kayıtların kullanıcı eşleşmesinde veya veri sorgusunda
                  oluşuyordur.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan-300/18 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cyan-100">
                  {stats.inFeedCount} Feed’de
                </span>
                <span className="rounded-full border border-orange-300/18 bg-orange-500/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-orange-100">
                  {stats.privateCount} Gizli
                </span>
              </div>
            </div>

            <UserDreamList
              dreams={dreams}
              onEdit={setEditingDream}
              onRemoveFromFeed={handleRemoveFromFeed}
              onDelete={handleDelete}
            />
          </div>

          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="cyber-badge mb-4">
                <span className="signal-dot emerald" />
                Network Status
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Friends
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">{stats.friendCount}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Pending
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">{stats.pendingCount}</p>
                </div>
              </div>
            </div>

            <FriendsPanel
              friends={friends}
              pendingRequests={pendingRequests}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              onSearch={handleSearch}
              onSendRequest={handleSendRequest}
              onRespondRequest={handleRespondRequest}
            />
          </div>
        </section>
      </main>

      <DreamEditModal
        dream={editingDream}
        onClose={() => setEditingDream(null)}
        onSave={handleSaveEdit}
        saving={saving}
      />
    </div>
  )
}