import Image from 'next/image'
import Link from 'next/link'
import { Heart, MessageCircle, Moon, Sparkles, Users } from 'lucide-react'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase, auth } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '@/lib/translations'
import { getDreamCardText } from '@/lib/dreamCardTranslations'
import DreamCard from '@/components/DreamCard'
import GoalCard from '@/components/GoalCard'
import GoalDetailModal from '@/components/GoalDetailModal'
import CreateGoalModal from '@/components/CreateGoalModal'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import TextSkeleton from '@/components/TextSkeleton'

const BATCH_SIZE = 12;

export default function ProfilePage() {
  const { i18n } = useTranslation()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [dreams, setDreams] = useState([])
  const [loading, setLoading] = useState(true)

  // Sayfalama
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Seçili Rüya ve Profil Düzenleyici
  const [activeDream, setActiveDream] = useState(null)
  const [showFriends, setShowFriends] = useState(false)
  const [friends, setFriends] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)

  const [showProfileEditor, setShowProfileEditor] = useState(false)
  const [profileUsername, setProfileUsername] = useState('')
  const [profileDisplayName, setProfileDisplayName] = useState('')
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('')
  const [profileIsPrivate, setProfileIsPrivate] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)

  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)

  const highlightDreamId = router.query?.highlightDream
  const observerRef = useRef(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const lang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const tCard = getDreamCardText(lang)
  const tVision = getVisionBoardText(lang)

  // PROFİL SEKMELERİ — Instagram'ın grid/tagged sekmeleri gibi. Vizyon Panosu
  // varsayılan (ilk açılan), Rüyalar (DreamCard grid'i) yan sekme.
  const [profileTab, setProfileTab] = useState('vision') // 'vision' | 'dreams'
  const [goals, setGoals] = useState([])
  const [goalsLoading, setGoalsLoading] = useState(true)
  const [goalsLoaded, setGoalsLoaded] = useState(false)
  const [activeGoal, setActiveGoal] = useState(null)
  const [showCreateGoal, setShowCreateGoal] = useState(false)

  const displayUsername =
    profile?.username ||
    profile?.display_name ||
    user?.user_metadata?.username ||
    'dreamer'

  const displayAvatar =
    avatarPreview ||
    profile?.avatar_url ||
    profile?.avatar ||
    user?.user_metadata?.avatar_url ||
    ''

  const loadDreams = useCallback(async (userId, pageNum = 0, append = false) => {
    try {
      const from = pageNum * BATCH_SIZE
      const to = from + BATCH_SIZE - 1

      const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      const fetched = Array.isArray(data) ? data : []
      if (append) {
        setDreams((prev) => [...prev, ...fetched])
      } else {
        setDreams(fetched)
      }

      setPage(pageNum)
      if (fetched.length < BATCH_SIZE) {
        setHasMore(false)
      } else {
        setHasMore(true)
      }
    } catch (err) {
      console.error('Dreams load error:', err)
    }
  }, [])

  const loadGoals = useCallback(async () => {
    setGoalsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/goals/list?mode=own', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      if (res.ok) setGoals(json.goals || [])
    } catch (err) {
      console.error('Goals load error:', err)
    } finally {
      setGoalsLoading(false)
      setGoalsLoaded(true)
    }
  }, [])

  const loadMoreDreams = useCallback(async () => {
    if (loadingMore || !hasMore || !user?.id) return
    setLoadingMore(true)
    await loadDreams(user.id, page + 1, true)
    setLoadingMore(false)
  }, [page, hasMore, loadingMore, user, loadDreams])

  const lastElementRef = useCallback(
    (node) => {
      if (loading || loadingMore) return
      if (observerRef.current) observerRef.current.disconnect()

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && user?.id) {
          loadMoreDreams()
        }
      })

      if (node) observerRef.current.observe(node)
    },
    [loading, loadingMore, hasMore, user, loadMoreDreams]
  )

  useEffect(() => {
    let active = true

    async function loadData() {
      try {
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !currentUser?.id) {
          router.push('/auth')
          return
        }

        if (!active) return
        setUser(currentUser)

        const fetchedProfile = await auth.getProfile(currentUser.id)

        if (!active) return
        setProfile(fetchedProfile || null)
        setProfileUsername(fetchedProfile?.username || '')
        setProfileDisplayName(fetchedProfile?.display_name || '')
        setProfileAvatarUrl(fetchedProfile?.avatar_url || '')
        setProfileIsPrivate(fetchedProfile?.is_private === true)

        await Promise.all([
          loadDreams(currentUser.id, 0, false),
          loadGoals(),
          loadFriends(currentUser.id)
        ])
      } catch (err) {
        console.error('Profile load error:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [router, loadDreams, loadGoals])

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  useEffect(() => {
    if (!highlightDreamId || !dreams.length) return

    const timeout = setTimeout(() => {
      if (highlightRef.current) {
        highlightRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [highlightDreamId, dreams])

  async function loadFriends(userId) {
    try {
      const [friendsRes, pendingRes] = await Promise.all([
        fetch(`/api/friends/list?userId=${userId}&type=accepted`),
        fetch(`/api/friends/list?userId=${userId}&type=pending`),
      ])

      const friendsData = await friendsRes.json()
      const pendingData = await pendingRes.json()

      setFriends(Array.isArray(friendsData.friendships) ? friendsData.friendships : [])
      setPendingRequests(Array.isArray(pendingData.friendships) ? pendingData.friendships : [])
    } catch (err) {
      console.error('Load friends error:', err)
    }
  }

  async function handleAvatarFileChange(e) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      alert('Lütfen bir görsel dosyası seç')
      return
    }

    if (avatarPreview) URL.revokeObjectURL(avatarPreview)

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSaveProfile() {
    if (!user) return
    setProfileSaving(true)

    try {
      const uploadedAvatarUrl = await uploadAvatarIfNeeded()

      const res = await fetch('/api/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          username: profileUsername,
          display_name: profileDisplayName,
          avatar_url: uploadedAvatarUrl || profileAvatarUrl,
          is_private: profileIsPrivate
        }),
      })

      if (!res.ok) throw new Error('Profil güncellenemedi')

      setShowProfileEditor(false)
      router.reload()
    } catch (err) {
      alert(err.message)
    } finally {
      setProfileSaving(false)
    }
  }

  async function uploadAvatarIfNeeded() {
    if (!avatarFile || !user) return profileAvatarUrl
    try {
      const fileExt = avatarFile.name.split('.').pop() || 'png'
      const filePath = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      return data?.publicUrl || ''
    } catch (err) {
      console.error(err)
      return profileAvatarUrl
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim() || !user) return
    try {
      const res = await fetch(`/api/friends/search?query=${encodeURIComponent(searchQuery)}&userId=${user.id}`)
      const data = await res.json()
      setSearchResults(Array.isArray(data.users) ? data.users : [])
      setShowSearch(true)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleSendRequest(friendId) {
    const res = await fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, friendId }),
    })
    const data = await res.json()
    if (res.ok) {
      if (data.status === 'accepted') {
        alert(lang === 'tr' ? 'Rezonans kuruldu! 🔮' : 'Resonance aligned! 🔮')
      } else {
        alert(lang === 'tr' ? 'Rezonans talebi gönderildi, onay bekleniyor. ⏳' : 'Resonance request sent, pending approval. ⏳')
      }
      await handleSearch()
    }
  }

  async function handleRespondRequest(friendshipId, action) {
    const res = await fetch('/api/friends/respond', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendshipId, userId: user.id, action }),
    })
    if (res.ok) {
      alert(action === 'accepted' ? 'İstek kabul edildi.' : 'İstek reddedildi.')
      await loadFriends(user.id)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* INSTAGRAM TARZI PROFİL BAŞLIĞI */}
        <div className={`flex flex-col sm:flex-row items-center gap-6 sm:gap-10 border-b border-white/10 pb-8 mb-6 relative transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="shrink-0 relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-fuchsia-500 bg-white/5 shadow-[0_0_20px_rgba(240,73,214,0.15)] flex items-center justify-center">
              {displayAvatar ? (
                <img src={displayAvatar} alt={displayUsername} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">🌌</span>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
              <h2 className="text-xl sm:text-2xl font-black font-sans truncate">{displayUsername}</h2>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setShowProfileEditor(true)}
                  className="rounded-lg bg-slate-900 border border-white/10 px-4 py-1.5 text-xs font-semibold hover:bg-slate-800 transition-all"
                >
                  {getTranslation('profile.editProfile', lang)}
                </button>
                <button
                  onClick={() => setShowFriends(!showFriends)}
                  className="rounded-lg bg-slate-900 border border-white/10 px-4 py-1.5 text-xs font-semibold hover:bg-slate-800 transition-all"
                >
                  <Users size={13} className="inline -mt-0.5 mr-1" /> {friends.length} {tCard.followingLabel}
                </button>
              </div>
            </div>

            <div className="text-sm font-medium text-slate-200 mt-2">
              <p className="font-bold text-white">{profile?.display_name || displayUsername}</p>
              {profile?.is_private && (
                <span className="inline-block rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-fuchsia-300 border border-fuchsia-500/20 mt-1 uppercase tracking-widest">
                  🔒 {lang === 'tr' ? 'Gizli Profil' : 'Private Profile'}
                </span>
              )}
              <p className="text-xs text-slate-400 mt-1.5">{dreams.length} {getTranslation('profile.totalDreams', lang)}</p>
            </div>
          </div>
        </div>

        {/* SOSYAL ARKADAŞLIK ALANI */}
        {showFriends && (
          <div className="glass-card p-4 sm:p-6 mb-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={getTranslation('friends.searchPlaceholder', lang)}
                className="flex-1 bg-black/40 border border-white/20 rounded px-4 py-2.5 text-white text-sm"
              />
              <button onClick={handleSearch} className="glass-card px-4 py-2 hover:bg-purple-500/20 text-sm">
                {getTranslation('friends.search', lang) || 'Ara'}
              </button>
            </div>

            {/* Arama Sonuçları */}
            {showSearch && searchResults.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">{getTranslation('friends.searchResults', lang)}</h3>
                <div className="space-y-2">
                  {searchResults.map((res) => (
                    <div key={res.id} className="glass-card p-3 flex items-center justify-between gap-3">
                      <div className="truncate text-xs font-semibold">{res.username}</div>
                      {res.friendshipStatus === null && (
                        <button onClick={() => handleSendRequest(res.id)} className="glass-card px-3 py-1 text-xs hover:bg-purple-500/20">{tCard.followLabel}</button>
                      )}
                      {res.friendshipStatus === 'pending' && <span className="text-yellow-400 text-xs">{tCard.pendingLabel}</span>}
                      {res.friendshipStatus === 'accepted' && <span className="text-green-400 text-xs">{tCard.followingLabel}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gelen İstekler */}
            {pendingRequests.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">{getTranslation('friends.incomingRequests', lang)} ({pendingRequests.length})</h3>
                <div className="space-y-2">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="glass-card p-3 flex items-center justify-between gap-3">
                      <div className="truncate text-xs font-semibold">{req.user_profiles?.username}</div>
                      <div className="flex gap-2">
                        <button onClick={() => handleRespondRequest(req.id, 'accepted')} className="glass-card px-3 py-1 text-xs bg-green-500/20 hover:bg-green-500/30">Kabul</button>
                        <button onClick={() => handleRespondRequest(req.id, 'rejected')} className="glass-card px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30">Red</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROFİL SEKMELERİ (Instagram grid/tagged tarzı) — Vizyon Panosu varsayılan */}
        <div className="flex items-center justify-center gap-8 border-t border-white/10 mb-4">
          <button
            onClick={() => setProfileTab('vision')}
            className={`flex items-center gap-1.5 py-3 text-xs font-bold uppercase tracking-widest border-t-2 -mt-px transition-colors ${
              profileTab === 'vision' ? 'border-fuchsia-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Sparkles size={13} /> {mounted ? (lang === 'tr' ? 'Vizyon Panosu' : 'Vision Board') : <TextSkeleton width="w-20" />}
          </button>
          <button
            onClick={() => setProfileTab('dreams')}
            className={`flex items-center gap-1.5 py-3 text-xs font-bold uppercase tracking-widest border-t-2 -mt-px transition-colors ${
              profileTab === 'dreams' ? 'border-fuchsia-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Moon size={13} /> {mounted ? (lang === 'tr' ? 'Rüyalar' : 'Dreams') : <TextSkeleton width="w-14" />}
          </button>
        </div>

        {profileTab === 'vision' ? (
          <div className={`transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setShowCreateGoal(true)}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white text-xs font-bold uppercase tracking-widest hover:opacity-90"
              >
                + {tVision.createGoalBtn}
              </button>
            </div>

            {goalsLoading && !goalsLoaded ? (
              <div className="py-20 flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-fuchsia-400 border-t-transparent" />
              </div>
            ) : goals.length === 0 ? (
              <div className="text-center py-20 text-white/40 text-sm">
                {tVision.emptyMyGoals}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    lang={lang}
                    currentUserId={user?.id}
                    onOpenGoal={setActiveGoal}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
        <>
        {/* 3 KOLONLU PROFİL IZGARASI (INSTAGRAM GRID) */}
        {dreams.length === 0 ? (
          <div className="text-center py-20 text-white/40 text-sm">
            {getTranslation('journal.noDreams', lang)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            {dreams.map((dream, index) => {
              const isLast = index === dreams.length - 1
              const hasImg = !!dream.ai_image_url

              return (
                <div
                  key={dream.id}
                  ref={isLast ? lastElementRef : null}
                  onClick={() => setActiveDream(dream)}
                  className="group aspect-square relative overflow-hidden rounded-xl border border-white/5 bg-slate-900/40 hover:border-fuchsia-500/45 cursor-pointer shadow-lg transition-all duration-300"
                >
                  {hasImg ? (
                    <Image
                      src={dream.ai_image_url}
                      alt="Dream Visual"
                      fill
                      sizes="(max-width: 640px) 33vw, 300px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    // Görseli olmayan rüyalar için estetik bakiye kartı (Aura harcama dürtüsünü tetikler!)
                    <div className="w-full h-full flex flex-col justify-between p-3 sm:p-5 bg-gradient-to-br from-purple-950/20 to-black select-none">
                      <span className="text-base sm:text-xl">🌌</span>
                      <p className="text-[9px] sm:text-[11px] text-white/70 leading-relaxed font-light line-clamp-3">"{dream.content}"</p>
                      <button className="self-start rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[8px] sm:text-[9px] font-bold text-cyan-300 hover:bg-cyan-500/25">
                        <Sparkles size={10} className="inline -mt-0.5" /> {lang === 'tr' ? 'Görsel Üret' : 'Create Visual'}
                      </button>
                    </div>
                  )}

                  {/* HOVER EFEKTİ */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-all duration-300">
                    <span className="text-xs sm:text-sm font-semibold flex items-center gap-1 text-white"><Heart size={13} /> {dream.likes_count || 0}</span>
                    <span className="text-xs sm:text-sm font-semibold flex items-center gap-1 text-white"><MessageCircle size={13} /> {dream.comments_count || 0}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {loadingMore && (
          <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-fuchsia-400 border-t-transparent" />
            <span className="text-xs uppercase tracking-widest">{lang === 'tr' ? 'Rüyalarınız Alınıyor...' : 'Loading More...'}</span>
          </div>
        )}
        </>
        )}
      </div>

      {/* PROFİL EDİTÖRÜ MODALI (Gizlilik Toggleri Dahil) */}
      {showProfileEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 gradient-text">{getTranslation('profile.editProfile', lang)}</h2>
            
            <div className="mb-4">
              <label className="text-xs text-white/50 block mb-2 uppercase tracking-widest">{getTranslation('profile.username', lang)}</label>
              <input value={profileUsername} onChange={e => setProfileUsername(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded p-3 text-white text-sm" placeholder="dreamer" />
            </div>

            <div className="mb-4">
              <label className="text-xs text-white/50 block mb-2 uppercase tracking-widest">{getTranslation('profile.displayName', lang)}</label>
              <input value={profileDisplayName} onChange={e => setProfileDisplayName(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded p-3 text-white text-sm" placeholder="Display Name" />
            </div>

            {/* PROFİL GİZLİLİK SEÇENEĞİ (Yeni Mistik İstek) */}
            <div className="mb-4">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={profileIsPrivate}
                  onChange={(e) => setProfileIsPrivate(e.target.checked)}
                  className="w-4 h-4 rounded text-fuchsia-500 focus:ring-0 focus:outline-none"
                />
                <div>
                  <span className="text-sm font-semibold text-white block">🔒 {lang === 'tr' ? 'Rüya Defterimi Gizli Yap' : 'Make Dream Journal Private'}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{lang === 'tr' ? 'Aktif olduğunda sadece onay verdiğiniz dostlar rüyalarınızı okuyabilir.' : 'When active, only approved friends can see your dream gallery.'}</span>
                </div>
              </label>
            </div>

            <div className="mb-6">
              <label className="text-xs text-white/50 block mb-2 uppercase tracking-widest">{getTranslation('profile.avatarUrl', lang) || 'Profil resmi'}</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-white/20 bg-white/5 shrink-0">
                  {displayAvatar ? <img src={displayAvatar} alt="preview" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-900 flex items-center justify-center">👤</div>}
                </div>
                <div className="flex-1">
                  <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="block w-full text-xs text-white file:mr-4 file:rounded-full file:border-0 file:bg-purple-500/20 file:px-4 file:py-2 file:text-xs file:font-medium file:text-white" />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowProfileEditor(false)} className="flex-1 glass-card py-2.5 text-sm">{getTranslation('profile.cancel', lang)}</button>
              <button onClick={handleSaveProfile} disabled={profileSaving} className="flex-1 glass-card py-2.5 bg-purple-500/20 text-sm">{profileSaving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {activeDream && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setActiveDream(null)}
        >
          <div 
            className="w-full max-w-2xl max-h-[90vh]" 
            onClick={(e) => e.stopPropagation()}
          >
            <DreamCard 
              dream={activeDream} 
              lang={lang} 
              currentUserId={user?.id}
              onTranslate={() => {}}
              translating={false}
              translated={false}
              translatedContent=""
              translatedAnalysis=""
            />
          </div>
        </div>
      )}
      {activeGoal && (
        <GoalDetailModal
          goal={activeGoal}
          lang={lang}
          currentUserId={user?.id}
          onClose={() => setActiveGoal(null)}
          onChanged={(updated) => {
            setGoals((list) => list.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)))
          }}
          onDeleted={(goalId) => {
            setGoals((list) => list.filter((g) => g.id !== goalId))
          }}
        />
      )}

      {showCreateGoal && (
        <CreateGoalModal
          lang={lang}
          onClose={() => setShowCreateGoal(false)}
          onCreated={(goal) => setGoals((g) => [goal, ...g])}
        />
      )}
    </div>
  )
}