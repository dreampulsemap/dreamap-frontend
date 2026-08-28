import Link from 'next/link'
import { Bookmark, BookOpen, Heart, MessageCircle, Moon, Sparkles, Users } from 'lucide-react'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase, auth, getAuthHeader } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '@/lib/translations'
import { getDreamCardText } from '@/lib/dreamCardTranslations'
import ProfileDreamTile from '@/components/ProfileDreamTile'
import GoalCard from '@/components/GoalCard'
import GoalDetailModal from '@/components/GoalDetailModal'
import VisionReelsFeed from '@/components/VisionReelsFeed'
import DreamReelsFeed from '@/components/DreamReelsFeed'
import CreateGoalModal from '@/components/CreateGoalModal'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import TextSkeleton from '@/components/TextSkeleton'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import SlidesViewer from '@/components/SlidesViewer'
import VisionVideoPlayer from '@/components/VisionVideoPlayer'
import DiaryStoryViewer from '@/components/DiaryStoryViewer'
import DiaryJournal from '@/components/DiaryJournal'
import PsycheMap from '@/components/PsycheMap'
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

  const lang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const tCard = getDreamCardText(lang)
  const tVision = getVisionBoardText(lang)

  // PROFİL SEKMELERİ — Instagram'ın grid/tagged sekmeleri gibi. Vizyon Panosu
  // varsayılan (ilk açılan), Rüyalar (DreamCard grid'i) yan sekme.
  const [profileTab, setProfileTab] = useState('vision') // 'vision' | 'dreams' | 'gunce' | 'saved'

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
      const res = await fetch(`/api/diary/list-for-user?userId=${userId}`)
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
        setProfileLanguage(fetchedProfile?.language || i18n.language || 'en') // YENİ

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

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Seo title={lang === 'tr' ? 'Profilim' : 'My Profile'} noindex lang={lang} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* INSTAGRAM TARZI PROFİL BAŞLIĞI */}
        <div className={`flex flex-col sm:flex-row items-center gap-6 sm:gap-10 border-b border-white/10 pb-8 mb-6 relative transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="shrink-0 relative group">
            <button
              type="button"
              onClick={diaryEntries && diaryEntries.length > 0 ? openOwnDiary : undefined}
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full ${diaryEntries && diaryEntries.length > 0 ? 'p-[2.5px] cursor-pointer' : 'cursor-default'}`}
              style={diaryEntries && diaryEntries.length > 0 ? { background: 'conic-gradient(from 0deg, #FFF6D6, #E6C687, #B89753, #E6C687, #FFF6D6)' } : undefined}
              aria-label={diaryEntries && diaryEntries.length > 0 ? (lang === 'tr' ? 'Güncemi gör' : 'View my diary') : undefined}
            >
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-brand-primary-500 bg-white/5 shadow-[0_0_20px_rgba(240,73,214,0.15)] flex items-center justify-center">
                {displayAvatar ? (
                  <img src={displayAvatar} alt={displayUsername} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">🌌</span>
                )}
              </div>
            </button>
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
              {(profile?.profile_visibility === 'private' || profile?.is_private) && (
                <span className="inline-block rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-brand-primary-300 border border-brand-primary-500/20 mt-1 uppercase tracking-widest">
                  🔒 {lang === 'tr' ? 'Gizli Profil' : 'Private Profile'}
                </span>
              )}
              {profile?.profile_visibility === 'friends' && (
                <span className="inline-block rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-brand-primary-300 border border-brand-primary-500/20 mt-1 uppercase tracking-widest">
                  👥 {lang === 'tr' ? 'Sadece Arkadaşlar' : 'Friends Only'}
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
              <button onClick={handleSearch} className="glass-card px-4 py-2 hover:bg-brand-accent-500/20 text-sm">
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

        {/* Rüya paylaşımı sonrası tam bu anda geri dönülüyor (highlightDreamId
            ?highlightDream= ile geliyor) — "içeriğim nereye gidiyor" merakının
            en yüksek olduğu an. Nav'a kalıcı bir globe ikonu eklemek yerine
            (mockup onu bilerek sadeleştirmişti) bu bağlam-duyarlı şeridi
            kullanıyoruz: her paylaşımda garanti çıkıyor, rastgele değil. */}
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

        {/* PROFİL SEKMELERİ (Instagram grid/tagged tarzı) — Vizyon Panosu varsayılan.
            4 sekme dar ekranlarda sığmıyordu (metin iki satıra bölünüyor / son
            sekme kırpılıyordu) — artık yatay kaydırılabilir; sm ve üzeri
            genişlikte zaten sığdığı için ortalanmış düzene geri dönüyor. */}
        <div className="flex items-center gap-6 sm:gap-8 sm:justify-center overflow-x-auto no-scrollbar scroll-smooth scroll-fade-x border-t border-white/10 mb-4">
          <button
            onClick={() => handleSelectTab('vision')}
            className={`flex shrink-0 items-center gap-1.5 py-3 text-xs font-bold uppercase tracking-widest border-t-2 -mt-px whitespace-nowrap transition-colors ${
              profileTab === 'vision' ? 'border-brand-primary-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Sparkles size={13} /> {mounted ? (lang === 'tr' ? 'Vizyon Panosu' : 'Vision Board') : <TextSkeleton width="w-20" />}
          </button>
          <button
            onClick={() => handleSelectTab('dreams')}
            className={`flex shrink-0 items-center gap-1.5 py-3 text-xs font-bold uppercase tracking-widest border-t-2 -mt-px whitespace-nowrap transition-colors ${
              profileTab === 'dreams' ? 'border-brand-primary-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Moon size={13} /> {mounted ? (lang === 'tr' ? 'Rüyalar' : 'Dreams') : <TextSkeleton width="w-14" />}
          </button>
          <button
            onClick={() => handleSelectTab('gunce')}
            className={`flex shrink-0 items-center gap-1.5 py-3 text-xs font-bold uppercase tracking-widest border-t-2 -mt-px whitespace-nowrap transition-colors ${
              profileTab === 'gunce' ? 'border-brand-primary-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <BookOpen size={13} /> {mounted ? (lang === 'tr' ? 'Günce' : 'Diary') : <TextSkeleton width="w-14" />}
          </button>
          <button
            onClick={() => handleSelectTab('saved')}
            className={`flex shrink-0 items-center gap-1.5 py-3 text-xs font-bold uppercase tracking-widest border-t-2 -mt-px whitespace-nowrap transition-colors ${
              profileTab === 'saved' ? 'border-brand-primary-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Bookmark size={13} /> {mounted ? (lang === 'tr' ? 'Kaydedilenler' : 'Saved') : <TextSkeleton width="w-16" />}
          </button>
        </div>

        {profileTab === 'vision' ? (
          <div className={`transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setShowCreateGoal(true)}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-brand-primary-500 to-brand-accent-500 text-white text-xs font-bold uppercase tracking-widest hover:opacity-90"
              >
                + {tVision.createGoalBtn}
              </button>
            </div>

            {goalsLoading && !goalsLoaded ? (
              <div className="py-20 flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary-400 border-t-transparent" />
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
                    onOpenGoal={handleOpenGoal}
                  />
                ))}
              </div>
            )}
          </div>
        ) : profileTab === 'dreams' ? (
        <>
        {mounted && <div className="mb-4"><PsycheMap lang={lang} /></div>}

        {/* Paylaşım-sonrası banner sadece highlightDreamId anında çıkıyor —
            bu ise HER ZAMAN burada, sessiz bir davet: rüya paylaşmamış olsan
            da haritayı merak edip keşfedebilmelisin. */}
        <Link
          href="/globe"
          className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-colors text-slate-300 hover:text-white text-xs font-medium w-fit"
        >
          🌐 {lang === 'tr' ? 'Bilinçaltı Haritasını Keşfet' : 'Explore the Subconscious Map'}
        </Link>

        {/* 3 KOLONLU PROFİL IZGARASI (INSTAGRAM GRID) */}
        {dreams.length === 0 ? (
          <div className="text-center py-20 text-white/40 text-sm">
            {getTranslation('journal.noDreams', lang)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            {dreams.map((dream, index) => {
              const isLast = index === dreams.length - 1
              const isHighlighted = highlightDreamId && String(dream.id) === String(highlightDreamId)

              return (
                <ProfileDreamTile
                  key={dream.id}
                  dream={dream}
                  lang={lang}
                  isHighlighted={isHighlighted}
                  onClick={() => setActiveDream(dream)}
                  tileRef={(node) => {
                    if (isLast) lastElementRef(node)
                    if (isHighlighted) highlightRef.current = node
                  }}
                />
              )
            })}
          </div>
        )}

        {loadingMore && (
          <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-primary-400 border-t-transparent" />
            <span className="text-xs uppercase tracking-widest">{lang === 'tr' ? 'Rüyalarınız Alınıyor...' : 'Loading More...'}</span>
          </div>
        )}
        </>
        ) : profileTab === 'gunce' ? (
          <div className={`transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <DiaryJournal lang={lang} currentUser={user} />
          </div>
        ) : (
          <div className={`transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            {savedLoading && !savedLoaded ? (
              <div className="py-20 flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary-400 border-t-transparent" />
              </div>
            ) : savedGoals.length === 0 ? (
              <div className="text-center py-20 text-white/40 text-sm">
                {lang === 'tr' ? 'Henüz kaydettiğin bir vizyon yok.' : "You haven't saved any visions yet."}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {savedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    lang={lang}
                    currentUserId={user?.id}
                    onOpenGoal={handleOpenGoal}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* PROFİL EDİTÖRÜ MODALI (Gizlilik Toggleri Dahil) */}
      {showProfileEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
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
            <div className="mb-4">
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
              <LanguageSwitcher onLanguageChange={(code) => setProfileLanguage(code)} />
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
              <button onClick={handleSaveProfile} disabled={profileSaving} className="flex-1 glass-card py-2.5 bg-brand-accent-500/20 text-sm">{profileSaving ? 'Saving...' : 'Save'}</button>
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