import Link from 'next/link'
import { MessageCircle, Settings, UserSearch, LogOut } from 'lucide-react'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase, auth, getAuthHeader } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '@/lib/translations'
import { getDreamCardText } from '@/lib/dreamCardTranslations'
import GoalDetailModal from '@/components/GoalDetailModal'
import VisionReelsFeed from '@/components/VisionReelsFeed'
import DreamReelsFeed from '@/components/DreamReelsFeed'
import CreateGoalModal from '@/components/CreateGoalModal'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import SlidesViewer from '@/components/SlidesViewer'
import VisionVideoPlayer from '@/components/VisionVideoPlayer'
import DiaryStoryViewer from '@/components/DiaryStoryViewer'
import DiaryJournal from '@/components/DiaryJournal'
import { PROFILE_TEXT, ProfileSummaryCard, ProfileGridItem, ProfileSettingsSheet } from '@/components/profile/ProfileParts'
import { JourneySummaryCard } from '@/components/game/GameUI'
import Seo from '@/components/Seo'

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
  const [profileVisibility, setProfileVisibility] = useState('public')
  const [profileGender, setProfileGender] = useState('') // YENİ
  const [profileLanguage, setProfileLanguage] = useState('en') // YENİ
  const [profileSaving, setProfileSaving] = useState(false)

  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)

  const highlightDreamId = router.query?.highlightDream
  const observerRef = useRef(null)
  const highlightRef = useRef(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Navbar bildirim menüsündeki "Akış & Frekans Tercihlerini Yönet" linki
  // /profile#stream-preferences'a gidiyordu ama bu sayfada o id'ye sahip
  // hiçbir eleman yoktu (link her zaman işlevsizdi) VE hedef, kapalı
  // durumdaki profil düzenleme modalının İÇİNDE — modal kapalıyken o
  // eleman DOM'da bile yok, browser'ın kendi #hash scroll'u onu asla
  // bulamaz. Modalı otomatik açıp içine kaydırıyoruz.
  useEffect(() => {
    if (typeof window === 'undefined' || window.location.hash !== '#stream-preferences') return
    setShowProfileEditor(true)
    const timeout = setTimeout(() => {
      document.getElementById('stream-preferences')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
    return () => clearTimeout(timeout)
  }, [])

  const lang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const tCard = getDreamCardText(lang)
  const tVision = getVisionBoardText(lang)

  // PROFİL SEKMELERİ — Instagram'ın grid/tagged sekmeleri gibi. Vizyon Panosu
  // varsayılan (ilk açılan), Rüyalar (DreamCard grid'i) yan sekme.
  const [profileTab, setProfileTab] = useState('vision') // 'vision' | 'dreams' | 'gunce' | 'saved'
  const [showSettings, setShowSettings] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [profileStats, setProfileStats] = useState(null)

  // ⋮ > Ayarlar (Android'de Profil + ayarlar sayfası açık gelir)
  useEffect(() => {
    if (router.isReady && router.query.settings === '1') setShowSettings(true)
  }, [router.isReady, router.query.settings])

  useEffect(() => {
    getAuthHeader().then((h) => fetch('/api/profile-stats', { headers: h })).then((r) => (r.ok ? r.json() : null)).then((j) => j && setProfileStats(j)).catch(() => {})
  }, [])

  useEffect(() => {
    // Sayfa yenilendiğinde en son hangi sekmedeysem (Vizyon/Rüyalar) onda
    // kalsın diye sessionStorage'dan geri yüklüyoruz.
    try {
      const savedTab = window.sessionStorage.getItem('dreamap_profile_tab')
      if (savedTab === 'vision' || savedTab === 'dreams') {
        setProfileTab(savedTab)
      }
    } catch (_) {}
  }, [])

  useEffect(() => {
    if (!mounted) return
    try {
      window.sessionStorage.setItem('dreamap_profile_tab', profileTab)
    } catch (_) {}
  }, [profileTab, mounted])

  const [goals, setGoals] = useState([])
  const [goalsLoading, setGoalsLoading] = useState(true)
  const [goalsLoaded, setGoalsLoaded] = useState(false)
  const [savedGoals, setSavedGoals] = useState([])
  const [savedLoading, setSavedLoading] = useState(false)
  const [savedLoaded, setSavedLoaded] = useState(false)
  const [diaryEntries, setDiaryEntries] = useState(null) // null = henüz kontrol edilmedi
  const [diaryViewer, setDiaryViewer] = useState(null)
  const [activeGoal, setActiveGoal] = useState(null)
  const [activeSlidesGoal, setActiveSlidesGoal] = useState(null)
  const [activeVideoGoal, setActiveVideoGoal] = useState(null)
  const [reelsGoalId, setReelsGoalId] = useState(null)
  // Video varsa oynatıcıya (Reels beslemesi video oynatmıyor, sadece kapak
  // görselini gösteriyor) — geri kalan HER ŞEY artık dikey kaydırmalı, tam
  // ekran VisionReelsFeed'den açılıyor; slayt/detay görüntüleyicileri
  // beslemenin İÇİNDEN ikincil eylem olarak tetikleniyor.
  function handleOpenGoal(goal) {
    if (goal.vision_video_url) setActiveVideoGoal(goal)
    else setReelsGoalId(goal.id)
  }
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

  // "Kaydedilenler" sekmesi ilk açıldığında yükleniyor (her profil
  // ziyaretinde değil) — Instagram'daki gibi bu yalnızca kendi hesabına
  // özel, u/[userId].js'de hiç yok.
  const loadSavedGoals = useCallback(async () => {
    setSavedLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/goals/saved', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      if (res.ok) setSavedGoals(json.goals || [])
    } catch (err) {
      console.error('Saved goals load error:', err)
    } finally {
      setSavedLoading(false)
      setSavedLoaded(true)
    }
  }, [])

  function handleSelectTab(tab) {
    setProfileTab(tab)
    if (tab === 'saved' && !savedLoaded) loadSavedGoals()
  }

  // Kendi güncenin olup olmadığını kontrol et — avatarın etrafında bir
  // halka olarak göster, DiaryStoryRow'daki ile aynı görsel dil.
  const loadOwnDiary = useCallback(async (userId) => {
    try {
      // Avatar halkası yalnızca son 24 saat (hikâye); kalıcı arşiv Günce sekmesinde.
      const res = await fetch(`/api/diary/list-for-user?userId=${userId}&recent=1`, { headers: await getAuthHeader() })
      const json = await res.json()
      if (res.ok) setDiaryEntries(json.entries || [])
    } catch (err) {
      console.error('Diary check error:', err)
      setDiaryEntries([])
    }
  }, [])

  // Günce sekmesinden (ya da açık duran story görüntüleyiciden) girdi
  // eklenip silinince avatar etrafındaki halka da senkron kalsın.
  useEffect(() => {
    if (!user?.id) return
    function handleUpdated() { loadOwnDiary(user.id) }
    window.addEventListener('diary-entries-updated', handleUpdated)
    return () => window.removeEventListener('diary-entries-updated', handleUpdated)
  }, [user?.id, loadOwnDiary])

  function openOwnDiary() {
    if (!diaryEntries || diaryEntries.length === 0 || !user) return
    setDiaryViewer({
      groups: [{ userId: user.id, displayName: profile?.display_name, username: displayUsername, avatarUrl: displayAvatar, isSelf: true }],
      startIndex: 0,
    })
  }

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
        // profile_visibility 013 migration'dan geliyor; eski/önbelleklenmiş bir
        // profil nesnesinde henüz yoksa is_private'tan türetiyoruz.
        setProfileVisibility(
          fetchedProfile?.profile_visibility || (fetchedProfile?.is_private === true ? 'private' : 'public')
        )
        setProfileGender(fetchedProfile?.gender || '') // YENİ
        // KÖK NEDEN DÜZELTMESİ: önceden `fetchedProfile?.language` önce
        // geliyordu — bu DB'de kayıtlı (çoğu hesapta hiç değiştirilmemiş,
        // varsayılan 'en') değer, kullanıcının O AN GÖRDÜĞÜ dille aynı
        // olmak zorunda değil. Sonuç: kullanıcı dil alanına hiç dokunmadan
        // Kaydet'e basınca handleSaveProfile'daki i18n.changeLanguage
        // çağrısı siteyi sessizce İngilizce'ye çeviriyordu. "Hiçbir şey
        // değiştirmedim" durumunun doğru varsayılanı, DB'deki değer değil,
        // o an ekranda görünen dildir.
        setProfileLanguage((i18n.language || fetchedProfile?.language || 'en').split('-')[0])

        await Promise.all([
          loadDreams(currentUser.id, 0, false),
          loadGoals(),
          loadFriends(currentUser.id),
          loadOwnDiary(currentUser.id),
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
      const authHeader = await getAuthHeader()
      const [friendsRes, pendingRes] = await Promise.all([
        fetch(`/api/friends/list?userId=${userId}&type=accepted`, { headers: authHeader }),
        fetch(`/api/friends/list?userId=${userId}&type=pending`, { headers: authHeader }),
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
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify({
          userId: user.id,
          username: profileUsername,
          display_name: profileDisplayName,
          avatar_url: uploadedAvatarUrl || profileAvatarUrl,
          profile_visibility: profileVisibility,
          language: profileLanguage, // YENİ
          gender: profileGender, // YENİ
        }),
      })

      if (!res.ok) throw new Error('Profil güncellenemedi')

      if (profileLanguage && profileLanguage !== i18n.language) { // YENİ
        i18n.changeLanguage(profileLanguage)
      }

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

  // YENİ: Çıkış Yap — Supabase oturumunu kapatır ve kullanıcıyı /auth
  // sayfasına yönlendirir. Onay istenerek yanlışlıkla çıkış yapılması
  // engellenir.
  async function handleSignOut() {
    const confirmed = window.confirm(
      lang === 'tr'
        ? 'Hesabından çıkmak istediğine emin misin?'
        : 'Are you sure you want to sign out?'
    )

    if (!confirmed) return

    try {
      await auth.signOut()
      router.replace('/auth')
    } catch (err) {
      console.error('Sign out error:', err)
      alert(
        lang === 'tr'
          ? 'Çıkış yapılırken bir hata oluştu. Lütfen tekrar deneyin.'
          : 'An error occurred while signing out. Please try again.'
      )
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim() || !user) return
    try {
      const res = await fetch(`/api/friends/search?query=${encodeURIComponent(searchQuery)}&userId=${user.id}`, {
        headers: await getAuthHeader(),
      })
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
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
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
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
      body: JSON.stringify({ friendshipId, userId: user.id, action }),
    })
    if (res.ok) {
      alert(action === 'accepted' ? 'İstek kabul edildi.' : 'İstek reddedildi.')
      await loadFriends(user.id)
    }
  }

  const tP = PROFILE_TEXT[lang === 'tr' ? 'tr' : 'en']
  const TAB_KEYS = ['vision', 'dreams', 'gunce', 'saved']
  const Empty = ({ text }) => <p className="p-8 text-center text-sm text-gray-500">{text}</p>
  const Spin = () => <div className="flex justify-center py-16"><span className="h-8 w-8 animate-spin rounded-full border-4 border-astral-gold/25 border-t-astral-gold" /></div>

  // Android ProfileScreen düzeni: başlık + ayarlar, özet kartı, yolculuk, arkadaş/çıkış, sekmeler, 3'lü ızgara.
  return (
    <div className="min-h-screen overflow-x-hidden bg-void-950 text-white">
      <Seo title={lang === 'tr' ? 'Profilim' : 'My Profile'} noindex lang={lang} />
      <div className="flex flex-col items-center gap-5 p-5">
        <div className="relative w-full text-center">
          <h1 className="font-serif text-[28px] text-astral-gold">{tP.title}</h1>
          <button onClick={() => setShowSettings(true)} aria-label={tP.settings} className="absolute right-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-white hover:bg-white/5">
            <Settings size={24} />
          </button>
        </div>
        <ProfileSummaryCard t={tP} profile={profile} user={user} stats={profileStats} onEdit={() => setShowProfileEditor(true)} onFriends={() => setShowFriends(true)} />
        {mounted && user && <div className="w-full"><JourneySummaryCard lang={lang} /></div>}
        <div className="flex w-full gap-3">
          <button onClick={() => setShowFriends((v) => !v)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-aether-violet/50 bg-void-900 px-3 py-2.5 text-xs font-bold text-white">
            <UserSearch size={18} className="text-astral-gold" />{tP.findFriends}
          </button>
          <button onClick={() => setShowLogoutConfirm(true)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-shadowWork-rose/50 bg-void-900 px-3 py-2.5 text-xs font-bold text-white">
            <LogOut size={18} className="text-shadowWork-rose" />{tP.logout}
          </button>
        </div>
      </div>

      <div className="px-4">
        {/* SOSYAL ARKADAŞLIK ALANI */}
        {showFriends && (
          <div className="glass-card p-4 sm:p-6 mb-6 animate-fade-in">
            <form onSubmit={(e) => { e.preventDefault(); handleSearch() }} className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getTranslation('friends.searchPlaceholder', lang)}
                className="flex-1 bg-black/40 border border-white/20 rounded px-4 py-2.5 text-white text-sm"
              />
              <button type="submit" className="glass-card px-4 py-2 hover:bg-brand-accent-500/20 text-sm">
                {getTranslation('friends.search', lang) || 'Ara'}
              </button>
            </form>

            {/* Arama Sonuçları */}
            {showSearch && searchResults.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">{getTranslation('friends.searchResults', lang)}</h3>
                <div className="space-y-2">
                  {searchResults.map((res) => (
                    <div key={res.id} className="glass-card p-3 flex items-center justify-between gap-3">
                      <div className="truncate text-xs font-semibold">{res.username}</div>
                      {res.friendshipStatus === null && (
                        <button onClick={() => handleSendRequest(res.id)} className="glass-card px-3 py-1 text-xs hover:bg-brand-accent-500/20">{tCard.followLabel}</button>
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
                      <div className="truncate text-xs font-semibold">{req.requester?.display_name || req.requester?.username}</div>
                      <div className="flex gap-2">
                        <button onClick={() => handleRespondRequest(req.id, 'accepted')} className="glass-card px-3 py-1 text-xs bg-green-500/20 hover:bg-green-500/30">Kabul</button>
                        <button onClick={() => handleRespondRequest(req.id, 'rejected')} className="glass-card px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30">Red</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bağlantılar (kabul edilmiş takipleşmeler) — önceden yalnızca sayı
                gösteriliyordu, listenin kendisi hiçbir yerde render edilmiyordu. */}
            {friends.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
                  {tCard.followingLabel} ({friends.length})
                </h3>
                <div className="space-y-2">
                  {friends.map((f) => {
                    const other = f.user_id === user?.id ? f.target : f.requester
                    if (!other) return null
                    return (
                      <div key={f.id} className="glass-card p-3 flex items-center justify-between gap-3">
                        <Link href={`/u/${other.id}`} className="flex items-center gap-2 truncate hover:opacity-80">
                          {other.avatar_url ? (
                            <img src={other.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-800 flex-shrink-0" />
                          )}
                          <span className="truncate text-xs font-semibold">{other.display_name || other.username}</span>
                        </Link>
                        <Link
                          href={`/messages?with=${other.id}`}
                          aria-label={lang === 'tr' ? 'Mesaj gönder' : 'Send message'}
                          className="glass-card p-1.5 hover:bg-brand-accent-500/20 flex-shrink-0"
                        >
                          <MessageCircle size={14} />
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {highlightDreamId && (
          <Link
            href="/globe"
            className="flex items-center justify-between gap-3 mb-4 px-4 py-3 rounded-2xl bg-astral-gold/10 border border-astral-gold/30 hover:bg-astral-gold/15 transition-colors group"
          >
            <span className="text-xs sm:text-sm text-white font-medium">
              🌐 {lang === 'tr' ? 'Rüyan bilinçaltı haritasına eklendi' : 'Your dream joined the subconscious map'}
            </span>
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-astral-gold group-hover:brightness-110">
              {lang === 'tr' ? 'Canlı Gör →' : 'See Live →'}
            </span>
          </Link>
        )}

      </div>

      <div className="flex border-b border-white/10">
        {tP.tabs.map((label, i) => {
          const key = TAB_KEYS[i]
          const active = profileTab === key
          return (
            <button key={key} onClick={() => handleSelectTab(key)} className={`relative flex-1 py-3.5 text-xs ${active ? 'font-bold text-astral-gold' : 'text-gray-500'}`}>
              {label}
              {active && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-astral-gold" />}
            </button>
          )
        })}
      </div>

      {profileTab === 'vision' ? (
        goalsLoading && !goalsLoaded ? <Spin /> : goals.length === 0 ? <Empty text={tP.empty.vision} /> : (
          <div className="grid grid-cols-3">
            {goals.map((goal) => <ProfileGridItem key={goal.id} imageUrl={goal.cover_image_url} title={goal.title} onClick={() => handleOpenGoal(goal)} />)}
          </div>
        )
      ) : profileTab === 'dreams' ? (
        <>
          {dreams.length === 0 ? <Empty text={tP.empty.dreams} /> : (
            <div className="grid grid-cols-3">
              {dreams.map((dream, index) => (
                <ProfileGridItem
                  key={dream.id}
                  imageUrl={dream.ai_image_url}
                  title={dream.ai_title || String(dream.content || '').slice(0, 60)}
                  onClick={() => setActiveDream(dream)}
                  innerRef={(node) => {
                    if (index === dreams.length - 1) lastElementRef(node)
                    if (highlightDreamId && String(dream.id) === String(highlightDreamId)) highlightRef.current = node
                  }}
                />
              ))}
            </div>
          )}
          {loadingMore && <Spin />}
        </>
      ) : profileTab === 'gunce' ? (
        <div className="p-4"><DiaryJournal lang={lang} currentUser={user} /></div>
      ) : (
        savedLoading && !savedLoaded ? <Spin /> : savedGoals.length === 0 ? <Empty text={tP.empty.saved} /> : (
          <div className="grid grid-cols-3">
            {savedGoals.map((goal) => <ProfileGridItem key={goal.id} imageUrl={goal.cover_image_url} title={goal.title} onClick={() => handleOpenGoal(goal)} />)}
          </div>
        )
      )}

      {showSettings && <ProfileSettingsSheet t={tP} lang={lang} user={user} onClose={() => setShowSettings(false)} />}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowLogoutConfirm(false)}>
          <div className="w-full max-w-sm rounded-[28px] bg-void-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">{tP.logoutTitle}</h3>
            <p className="mt-3 text-sm text-slate-400">{tP.logoutDesc}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowLogoutConfirm(false)} className="px-4 py-2 text-sm text-slate-400">{tP.cancel}</button>
              <button onClick={handleSignOut} className="px-4 py-2 text-sm font-bold text-shadowWork-rose">{tP.logout}</button>
            </div>
          </div>
        </div>
      )}

      {/* PROFİL EDİTÖRÜ MODALI (Gizlilik Toggleri Dahil) */}
      {showProfileEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-card p-6 max-w-lg w-full max-h-[92dvh] overflow-y-auto overscroll-contain pb-8">
            <h2 className="text-xl font-bold mb-4 gold-gradient-text">{getTranslation('profile.editProfile', lang)}</h2>
            
            <div className="mb-4">
              <label className="text-xs text-white/50 block mb-2 uppercase tracking-widest">{getTranslation('profile.username', lang)}</label>
              <input value={profileUsername} onChange={e => setProfileUsername(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded p-3 text-white text-sm" placeholder="dreamer" />
            </div>

            <div className="mb-4">
              <label className="text-xs text-white/50 block mb-2 uppercase tracking-widest">{getTranslation('profile.displayName', lang)}</label>
              <input value={profileDisplayName} onChange={e => setProfileDisplayName(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded p-3 text-white text-sm" placeholder="Display Name" />
            </div>

            {/* PROFİL GİZLİLİĞİ — herkese açık / sadece arkadaşlar / tamamen gizli.
                Bu seçim, rüya/vizyon/günce oluştururken sunulan gizlilik
                seçeneklerini kısıtlar (013 migration'daki DB trigger + ilgili
                API route'ları). */}
            <div id="stream-preferences" className="mb-4 scroll-mt-6">
              <label className="text-xs text-white/50 block mb-2 uppercase tracking-widest">
                {lang === 'tr' ? 'Profil Gizliliği' : 'Profile Visibility'}
              </label>
              <div className="space-y-2">
                {[
                  {
                    value: 'public',
                    title: lang === 'tr' ? '🌍 Herkese Açık' : '🌍 Public',
                    desc: lang === 'tr' ? 'Profilini ve paylaşımlarını herkes görebilir.' : 'Anyone can see your profile and posts.',
                  },
                  {
                    value: 'friends',
                    title: lang === 'tr' ? '👥 Sadece Arkadaşlar' : '👥 Friends Only',
                    desc: lang === 'tr' ? 'Profilini ve paylaşımlarını sadece onayladığın dostların görebilir.' : 'Only your approved friends can see your profile and posts.',
                  },
                  {
                    value: 'private',
                    title: lang === 'tr' ? '🔒 Tamamen Gizli' : '🔒 Fully Private',
                    desc: lang === 'tr' ? 'Profilini sadece sen görebilirsin; tüm paylaşımların da otomatik olarak gizli olur.' : 'Only you can see your profile; all your posts become private too.',
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 cursor-pointer select-none"
                  >
                    <input
                      type="radio"
                      name="profileVisibility"
                      checked={profileVisibility === option.value}
                      onChange={() => setProfileVisibility(option.value)}
                      className="mt-1 w-4 h-4 text-brand-primary-500 focus:ring-0 focus:outline-none"
                    />
                    <div>
                      <span className="text-sm font-semibold text-white block">{option.title}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{option.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* YENİ: DİL SEÇİMİ */}
            <div className="mb-4">
              <label className="text-xs text-white/50 block mb-2 uppercase tracking-widest">{getTranslation('profile.language', lang)}</label>
              {/* applyImmediately=false: burada bir dil seçmek sadece taslak
                  profileLanguage state'ini günceller — siteyi ANINDA o dile
                  çevirmiyor. Gerçek değişiklik yalnızca "Kaydet"e basılınca
                  (handleSaveProfile içindeki i18n.changeLanguage çağrısıyla)
                  uygulanıyor, tıpkı diğer tüm form alanları gibi. */}
              <LanguageSwitcher
                selectedCode={profileLanguage}
                applyImmediately={false}
                onLanguageChange={(code) => setProfileLanguage(code)}
              />
            </div>

            {/* YENİ: CİNSİYET SEÇİMİ */}
            <div className="mb-4">
              <label className="text-xs text-white/50 block mb-2 uppercase tracking-widest">{getTranslation('gender.label', lang)}</label>
              <select
                value={profileGender}
                onChange={(e) => setProfileGender(e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded p-3 text-white text-sm"
              >
                <option value="">{getTranslation('gender.select', lang)}</option>
                <option value="female">{getTranslation('gender.female', lang)}</option>
                <option value="male">{getTranslation('gender.male', lang)}</option>
                <option value="unspecified">{getTranslation('gender.unspecified', lang)}</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="text-xs text-white/50 block mb-2 uppercase tracking-widest">{getTranslation('profile.avatarUrl', lang) || 'Profil resmi'}</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-white/20 bg-white/5 shrink-0">
                  {displayAvatar ? <img src={displayAvatar} alt="preview" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-900 flex items-center justify-center">👤</div>}
                </div>
                <div className="flex-1">
                  <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="block w-full text-xs text-white file:mr-4 file:rounded-full file:border-0 file:bg-brand-accent-500/20 file:px-4 file:py-2 file:text-xs file:font-medium file:text-white" />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowProfileEditor(false)} className="flex-1 glass-card py-2.5 text-sm">{getTranslation('profile.cancel', lang)}</button>
              <button onClick={handleSaveProfile} disabled={profileSaving} className="flex-1 glass-card py-2.5 bg-brand-accent-500/20 text-sm">{profileSaving ? getTranslation('profile.saving', lang) : getTranslation('profile.saveProfile', lang)}</button>
            </div>
          </div>
        </div>
      )}

      {activeDream && (
        <DreamReelsFeed
          dreams={dreams}
          lang={lang}
          currentUserId={user?.id}
          initialDreamId={activeDream.id}
          owner={profile}
          onLoadMore={loadMoreDreams}
          hasMore={hasMore}
          loading={loadingMore}
          onClose={() => setActiveDream(null)}
        />
      )}
      {reelsGoalId && (
        <VisionReelsFeed
          goals={profileTab === 'saved' ? savedGoals : goals}
          lang={lang}
          t={tVision}
          currentUserId={user?.id}
          initialGoalId={reelsGoalId}
          hasMore={false}
          loading={false}
          onClose={() => setReelsGoalId(null)}
          onOpenGoal={(g) => { setReelsGoalId(null); setActiveGoal(g) }}
          onOpenSlides={(g) => { setReelsGoalId(null); setActiveSlidesGoal(g) }}
          onReacted={() => {}}
        />
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

      {activeVideoGoal && (
        <VisionVideoPlayer
          goal={activeVideoGoal}
          lang={lang}
          currentUserId={user?.id}
          onClose={() => setActiveVideoGoal(null)}
          onChanged={(updated) => {
            setActiveVideoGoal((g) => (g ? { ...g, ...updated } : g))
            setGoals((list) => list.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)))
          }}
          onOpenDetails={(g) => {
            setActiveVideoGoal(null)
            setActiveGoal(g || activeVideoGoal)
          }}
        />
      )}

      {diaryViewer && (
        <DiaryStoryViewer
          groups={diaryViewer.groups}
          startIndex={diaryViewer.startIndex}
          lang={lang}
          currentUserId={user?.id}
          onClose={() => setDiaryViewer(null)}
        />
      )}

      {activeSlidesGoal && (
        <SlidesViewer
          goal={activeSlidesGoal}
          lang={lang}
          currentUserId={user?.id}
          onClose={() => setActiveSlidesGoal(null)}
          onChanged={(updated) => {
            setActiveSlidesGoal((g) => (g ? { ...g, ...updated } : g))
            setGoals((list) => list.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)))
          }}
          onOpenDetails={() => {
            const goal = activeSlidesGoal
            setActiveSlidesGoal(null)
            setActiveGoal(goal)
          }}
          onEditSlides={() => {
            const goal = activeSlidesGoal
            setActiveSlidesGoal(null)
            setActiveGoal(goal)
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

      {/* Google Play Console "App content" formunun zorunlu kıldığı,
          uygulama içinden (mobil web dahil) erişilebilir Gizlilik
          Politikası + Kullanım Koşulları linki. Masaüstünde aynısı
          Sidebar.jsx'te de var; burası Sidebar'ın görünmediği mobil web
          için. */}
      <div className="mx-auto max-w-4xl px-4 pb-10 pt-6 text-center text-[11px] text-slate-600">
        <Link href="/privacy" className="hover:text-slate-400 transition-colors">
          {lang === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}
        </Link>
        <span className="mx-2">·</span>
        <Link href="/terms" className="hover:text-slate-400 transition-colors">
          {lang === 'tr' ? 'Kullanım Koşulları' : 'Terms of Service'}
        </Link>
        <span className="mx-2">·</span>
        <Link href="/delete-account" className="hover:text-slate-400 transition-colors">
          {lang === 'tr' ? 'Hesabı Sil' : 'Delete Account'}
        </Link>
      </div>
    </div>
  )
}
