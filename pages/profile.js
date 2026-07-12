import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { auth, supabase } from '../lib/supabase'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '../lib/translations'
import LanguageSwitcher from '../components/LanguageSwitcher'
import DreamCard from '../components/DreamCard'

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

  const [showProfileEditor, setShowProfileEditor] = useState(false)
  const [profileUsername, setProfileUsername] = useState('')
  const [profileDisplayName, setProfileDisplayName] = useState('')
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  useEffect(() => {
    let mounted = true

    async function loadData() {
      try {
        const authResult = await auth.getUser()

        const currentUser =
          authResult?.data?.user ||
          authResult?.user ||
          authResult ||
          null

        if (!currentUser?.id) {
          router.push('/auth')
          return
        }

        if (!mounted) return
        setUser(currentUser)

        const fetchedProfile = await auth.getProfile(currentUser.id)
        if (!mounted) return

        setProfile(fetchedProfile || null)

        setProfileUsername(
          fetchedProfile?.username ||
            fetchedProfile?.display_name ||
            currentUser?.user_metadata?.username ||
            ''
        )
        setProfileDisplayName(fetchedProfile?.display_name || '')
        setProfileAvatarUrl(
          fetchedProfile?.avatar_url ||
            fetchedProfile?.avatar ||
            currentUser?.user_metadata?.avatar_url ||
            ''
        )

        await loadDreams(currentUser.id)
        await loadFriends(currentUser.id)
      } catch (err) {
        console.error('Profile load error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [router])

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  async function loadDreams(userId) {
    try {
      const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDreams(data || [])
    } catch (err) {
      console.error('Load dreams error:', err)
      setDreams([])
    }
  }

  async function loadFriends(userId) {
    try {
      const [friendsRes, pendingRes] = await Promise.all([
        fetch(`/api/friends/list?userId=${userId}&type=accepted`),
        fetch(`/api/friends/list?userId=${userId}&type=pending`),
      ])

      const friendsData = await friendsRes.json()
      const pendingData = await pendingRes.json()

      setFriends(friendsData.friendships || [])
      setPendingRequests(pendingData.friendships || [])
    } catch (err) {
      console.error('Load friends error:', err)
      setFriends([])
      setPendingRequests([])
    }
  }

  async function reloadProfile() {
    if (!user) return

    try {
      const fetchedProfile = await auth.getProfile(user.id)
      setProfile(fetchedProfile || null)

      setProfileUsername(
        fetchedProfile?.username ||
          fetchedProfile?.display_name ||
          user?.user_metadata?.username ||
          ''
      )
      setProfileDisplayName(fetchedProfile?.display_name || '')
      setProfileAvatarUrl(
        fetchedProfile?.avatar_url ||
          fetchedProfile?.avatar ||
          user?.user_metadata?.avatar_url ||
          ''
      )
    } catch (err) {
      console.error('Reload profile error:', err)
    }
  }

  async function handleLogout() {
    await auth.signOut()
    router.push('/')
  }

  async function handleAvatarFileChange(e) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      alert('Lütfen bir görsel dosyası seç')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Görsel boyutu 5MB’dan küçük olmalı')
      return
    }

    if (avatarPreview) URL.revokeObjectURL(avatarPreview)

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function uploadAvatarIfNeeded() {
    if (!avatarFile || !user) return profileAvatarUrl

    setAvatarUploading(true)

    try {
      const fileExt = avatarFile.name.split('.').pop() || 'png'
      const filePath = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      return data?.publicUrl || ''
    } finally {
      setAvatarUploading(false)
    }
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

      if (!res.ok) throw new Error((await res.json()).error)

      await loadDreams(user.id)
      setEditingDream(null)
    } catch (err) {
      alert('Hata: ' + err.message)
    } finally {
      setSaving(false)
    }
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
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Profil güncellenemedi')
      }

      setProfileAvatarUrl(uploadedAvatarUrl || profileAvatarUrl)
      setAvatarFile(null)

      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
      setAvatarPreview('')

      await reloadProfile()
      setShowProfileEditor(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setProfileSaving(false)
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

      if (!res.ok) throw new Error((await res.json()).error)
      await loadDreams(user.id)
    } catch (err) {
      alert('Hata: ' + err.message)
    }
  }

  async function handleDeleteDream(dream) {
    if (!confirm(getTranslation('profile.deleteDreamConfirm', lang))) return

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

      if (!res.ok) throw new Error((await res.json()).error)
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
      alert(getTranslation('friends.requestSent', lang))
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
          ? getTranslation('friends.requestAccepted', lang)
          : getTranslation('friends.requestRejected', lang)
      )
      await loadFriends(user.id)
    }
  }

  async function handleRemoveFriend(friendshipId) {
    if (!confirm(getTranslation('friends.removeFriend', lang) + '?')) return

    const res = await fetch('/api/friends/respond', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        friendshipId,
        userId: user.id,
        action: 'rejected',
      }),
    })

    if (res.ok) {
      alert(getTranslation('friends.friendRemoved', lang))
      await loadFriends(user.id)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        {getTranslation('auth.loading', lang) || 'Yükleniyor...'}
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-[#050816]/90">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
          <a href="/" className="flex items-center gap-2 sm:gap-3 group min-w-0 shrink-0">
            <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 px-2 py-1.5 sm:px-3 sm:py-2 shadow-[0_0_30px_rgba(56,189,248,0.06)] transition-all duration-300 group-hover:border-cyan-300/20 group-hover:shadow-[0_0_40px_rgba(34,211,238,0.12)] shrink-0">
              <Image
                src="/logo.png"
                alt="Lunosfer"
                width={132}
                height={40}
                priority
                className="h-6 w-auto object-contain sm:h-8 md:h-10"
              />
            </div>

            <div className="min-w-0 flex flex-col leading-none">
              <span className="text-[0.75rem] sm:text-[1.1rem] md:text-[1.4rem] font-black tracking-[0.22em] sm:tracking-[0.32em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-cyan-200 to-violet-300 [text-shadow:0_0_8px_rgba(168,85,247,0.3),0_0_16px_rgba(34,211,238,0.15)] transition-all duration-300 group-hover:from-fuchsia-200 group-hover:via-cyan-100 group-hover:to-violet-200 whitespace-nowrap">
                LUNOSFER
              </span>
              <span className="mt-0.5 hidden md:block text-[10px] uppercase tracking-[0.42em] text-cyan-200/55 whitespace-nowrap">
                Dream Nexus
              </span>
            </div>
          </a>

          <nav className="hidden sm:flex items-center gap-2 sm:gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            <a href="/" className="glass-card px-3 sm:px-4 py-2 text-sm text-white/80 hover:text-white shrink-0 whitespace-nowrap">
              {getTranslation('nav.feed', lang) || 'Akış'}
            </a>
            <a href="/globe" className="glass-card px-3 sm:px-4 py-2 text-sm text-white/80 hover:text-white shrink-0 whitespace-nowrap">
              {getTranslation('nav.globe', lang)}
            </a>
            <LanguageSwitcher />
            <button
              onClick={handleLogout}
              className="glass-card px-3 sm:px-4 py-2 text-sm text-red-300 hover:text-red-200 shrink-0 whitespace-nowrap"
            >
              {getTranslation('auth.logout', lang) || 'Çıkış'}
            </button>
          </nav>

          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            aria-expanded={mobileMenuOpen}
            className="sm:hidden glass-card w-10 h-10 shrink-0 flex items-center justify-center text-white/80"
          >
            {mobileMenuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-white/10 bg-[#050816]/95 px-3 py-3">
            <div className="flex flex-col gap-2">
              <a href="/" className="glass-card px-4 py-3 text-sm text-white/80 hover:text-white text-center">
                {getTranslation('nav.feed', lang) || 'Akış'}
              </a>
              <a href="/globe" className="glass-card px-4 py-3 text-sm text-white/80 hover:text-white text-center">
                {getTranslation('nav.globe', lang)}
              </a>
              <div className="flex justify-center">
                <LanguageSwitcher />
              </div>
              <button
                onClick={handleLogout}
                className="glass-card px-4 py-3 text-sm text-red-300 hover:text-red-200 text-center"
              >
                {getTranslation('auth.logout', lang) || 'Çıkış'}
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
        <div className="glass-card p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10" />

          <div className="relative flex flex-col items-center text-center md:flex-row md:items-center md:text-left gap-4 sm:gap-6">
            <div className="shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden border border-purple-400/30 bg-white/5 shadow-[0_0_40px_rgba(139,92,246,0.15)] mx-auto">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={displayUsername}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl bg-gradient-to-br from-purple-500/20 to-pink-500/10">
                    🌌
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-col items-center md:items-start md:flex-row md:justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text break-words">
                    {displayUsername}
                  </h1>
                  {profile?.display_name && profile?.display_name !== displayUsername && (
                    <p className="text-white/55 mt-1.5 sm:mt-2 text-sm sm:text-base">{profile.display_name}</p>
                  )}
                  <p className="text-white/40 text-xs sm:text-sm mt-2 sm:mt-3">
                    {dreams.length} {getTranslation('profile.totalDreams', lang)}
                  </p>
                </div>

                <button
                  onClick={() => setShowProfileEditor(true)}
                  className="glass-card w-full md:w-auto px-4 py-2.5 text-sm text-white/85 hover:bg-purple-500/20 shrink-0"
                >
                  {getTranslation('profile.editProfile', lang)}
                </button>
              </div>

              <div className="mt-4 sm:mt-5 grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 w-full">
                <button
                  onClick={() => setShowFriends(!showFriends)}
                  className="glass-card px-3 sm:px-4 py-2.5 text-sm hover:bg-purple-500/20"
                >
                  {getTranslation('friends.title', lang)} ({friends.length})
                </button>

                <button
                  onClick={() => router.push('/add-dream')}
                  className="glass-card px-3 sm:px-4 py-2.5 text-sm hover:bg-purple-500/20"
                >
                  {getTranslation('dream.addTitle', lang)}
                </button>
              </div>
            </div>
          </div>
        </div>

        {showFriends && (
          <div className="glass-card p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={getTranslation('friends.searchPlaceholder', lang)}
                className="flex-1 bg-black/40 border border-white/20 rounded px-4 py-2.5 text-white text-sm sm:text-base"
              />
              <button
                onClick={handleSearch}
                className="glass-card px-4 py-2.5 hover:bg-purple-500/20 text-sm sm:text-base"
              >
                {getTranslation('friends.search', lang) || 'Ara'}
              </button>
            </div>

            {showSearch && searchResults.length > 0 && (
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-semibold mb-3">
                  {getTranslation('friends.searchResults', lang)}
                </h3>
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="glass-card p-3 flex items-center justify-between gap-3 sm:gap-4"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-sm sm:text-base truncate">{result.username}</div>
                        <div className="text-xs sm:text-sm text-white/60 truncate">{result.display_name}</div>
                      </div>

                      {result.friendshipStatus === null && (
                        <button
                          onClick={() => handleSendRequest(result.id)}
                          className="glass-card px-3 py-1.5 text-xs sm:text-sm hover:bg-purple-500/20 shrink-0"
                        >
                          {getTranslation('friends.sendRequest', lang)}
                        </button>
                      )}

                      {result.friendshipStatus === 'pending' && (
                        <span className="text-yellow-400 text-xs sm:text-sm shrink-0">
                          {getTranslation('friends.pending', lang)}
                        </span>
                      )}

                      {result.friendshipStatus === 'accepted' && (
                        <span className="text-green-400 text-xs sm:text-sm shrink-0">
                          {getTranslation('friends.accepted', lang)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingRequests.length > 0 && (
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-semibold mb-3">
                  {getTranslation('friends.incomingRequests', lang)} ({pendingRequests.length})
                </h3>
                <div className="space-y-2">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="glass-card p-3 flex items-center justify-between gap-3 sm:gap-4"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-sm sm:text-base truncate">{req.user_profiles?.username}</div>
                        <div className="text-xs sm:text-sm text-white/60 truncate">
                          {req.user_profiles?.display_name}
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleRespondRequest(req.id, 'accepted')}
                          className="glass-card px-3 py-1.5 text-xs sm:text-sm bg-green-500/20 hover:bg-green-500/30"
                        >
                          {getTranslation('friends.accept', lang)}
                        </button>
                        <button
                          onClick={() => handleRespondRequest(req.id, 'rejected')}
                          className="glass-card px-3 py-1.5 text-xs sm:text-sm bg-red-500/20 hover:bg-red-500/30"
                        >
                          {getTranslation('friends.reject', lang)}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3">
                {getTranslation('friends.title', lang)}
              </h3>

              {friends.length === 0 ? (
                <p className="text-white/60 text-sm sm:text-base">{getTranslation('friends.noFriends', lang)}</p>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="glass-card p-3 flex items-center justify-between gap-3 sm:gap-4"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-sm sm:text-base truncate">
                          {friend.user_profiles?.username || friend.friend_profiles?.username}
                        </div>
                        <div className="text-xs sm:text-sm text-white/60 truncate">
                          {friend.user_profiles?.display_name || friend.friend_profiles?.display_name}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="glass-card px-3 py-1.5 text-xs sm:text-sm text-red-400 hover:bg-red-500/20 shrink-0"
                      >
                        {getTranslation('friends.removeFriend', lang)}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4 sm:space-y-6">
          {dreams.map((dream) => (
            <div key={dream.id} className="space-y-3">
              <DreamCard
                dream={dream}
                lang={lang}
                onTranslate={() => {}}
                translating={false}
                translated={false}
                translatedContent=""
                translatedAnalysis=""
              />

              <div className="flex flex-wrap gap-2 px-1">
                <button
                  onClick={() => {
                    setEditingDream(dream)
                    setEditContent(dream.content || '')
                    setEditLocation(dream.location_name || '')
                    setEditVisibility(dream.visibility || 'public')
                    setEditInFeed(dream.in_feed !== false)
                  }}
                  className="text-xs glass-card px-3 py-1.5 text-blue-400 hover:bg-blue-500/20"
                >
                  {getTranslation('profile.editDream', lang)}
                </button>

                {dream.in_feed !== false && (
                  <button
                    onClick={() => handleRemoveFromFeed(dream)}
                    className="text-xs glass-card px-3 py-1.5 text-yellow-400 hover:bg-yellow-500/20"
                  >
                    {getTranslation('profile.removeFromFeed', lang)}
                  </button>
                )}

                <button
                  onClick={() => handleDeleteDream(dream)}
                  className="text-xs glass-card px-3 py-1.5 text-red-400 hover:bg-red-500/20"
                >
                  {getTranslation('social.delete', lang) || 'Sil'}
                </button>
              </div>
            </div>
          ))}

          {dreams.length === 0 && (
            <div className="text-center py-10 sm:py-12 text-white/60 text-sm sm:text-base">
              {getTranslation('journal.noDreams', lang)}
            </div>
          )}
        </div>
      </div>

      {showProfileEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80">
          <div className="glass-card p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-4 gradient-text">
              {getTranslation('profile.editProfile', lang)}
            </h2>

            <div className="mb-4">
              <label className="text-sm text-white/60 block mb-2">
                {getTranslation('profile.username', lang)}
              </label>
              <input
                value={profileUsername}
                onChange={(e) => setProfileUsername(e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded p-3 text-white text-sm sm:text-base"
                placeholder="dreamer"
              />
            </div>

            <div className="mb-4">
              <label className="text-sm text-white/60 block mb-2">
                {getTranslation('profile.displayName', lang)}
              </label>
              <input
                value={profileDisplayName}
                onChange={(e) => setProfileDisplayName(e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded p-3 text-white text-sm sm:text-base"
                placeholder={getTranslation('profile.displayName', lang)}
              />
            </div>

            <div className="mb-6">
              <label className="text-sm text-white/60 block mb-2">
                {getTranslation('profile.avatarUrl', lang) || 'Profil resmi'}
              </label>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-white/20 bg-white/5 shrink-0">
                  {displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt={displayUsername}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/10">
                      🌌
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="block w-full text-xs sm:text-sm text-white file:mr-3 sm:file:mr-4 file:rounded-full file:border-0 file:bg-purple-500/20 file:px-3 sm:file:px-4 file:py-2 file:text-xs sm:file:text-sm file:font-medium file:text-white hover:file:bg-purple-500/30"
                  />
                  <p className="text-xs text-white/40 mt-2">
                    {getTranslation('profile.changePhoto', lang) || 'Cihazından görsel yükle'}
                  </p>
                  {avatarUploading ? (
                    <p className="text-xs text-purple-300 mt-2">
                      {getTranslation('profile.uploading', lang) || 'Görsel yükleniyor...'}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (avatarPreview) URL.revokeObjectURL(avatarPreview)
                  setAvatarPreview('')
                  setAvatarFile(null)
                  setShowProfileEditor(false)
                }}
                className="flex-1 glass-card py-2.5 text-sm sm:text-base"
              >
                {getTranslation('profile.cancel', lang)}
              </button>

              <button
                onClick={handleSaveProfile}
                disabled={profileSaving || avatarUploading}
                className="flex-1 glass-card py-2.5 bg-purple-500/20 disabled:opacity-60 text-sm sm:text-base"
              >
                {profileSaving
                  ? getTranslation('profile.saving', lang)
                  : getTranslation('profile.saveProfile', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingDream && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80">
          <div className="glass-card p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-4 gradient-text">
              {getTranslation('profile.editDream', lang)}
            </h2>

            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-black/40 border border-white/20 rounded p-3 mb-4 h-32 text-white text-sm sm:text-base"
            />

            <input
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              className="w-full bg-black/40 border border-white/20 rounded p-3 mb-4 text-white text-sm sm:text-base"
              placeholder={getTranslation('dream.location', lang)}
            />

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm sm:text-base">
                <input
                  type="radio"
                  name="vis"
                  value="public"
                  checked={editVisibility === 'public'}
                  onChange={(e) => setEditVisibility(e.target.value)}
                />
                {getTranslation('dream.public', lang)}
              </label>

              <label className="flex items-center gap-2 text-sm sm:text-base">
                <input
                  type="radio"
                  name="vis"
                  value="friends"
                  checked={editVisibility === 'friends'}
                  onChange={(e) => setEditVisibility(e.target.value)}
                />
                {getTranslation('dream.friends', lang)}
              </label>

              <label className="flex items-center gap-2 text-sm sm:text-base">
                <input
                  type="radio"
                  name="vis"
                  value="private"
                  checked={editVisibility === 'private'}
                  onChange={(e) => setEditVisibility(e.target.value)}
                />
                {getTranslation('dream.private', lang)}
              </label>
            </div>

            <label className="flex items-center gap-2 mb-6 text-sm sm:text-base">
              <input
                type="checkbox"
                checked={editInFeed}
                onChange={(e) => setEditInFeed(e.target.checked)}
              />
              {getTranslation('profile.showInFeed', lang)}
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => setEditingDream(null)}
                className="flex-1 glass-card py-2.5 text-sm sm:text-base"
              >
                {getTranslation('profile.cancel', lang)}
              </button>

              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 glass-card py-2.5 bg-purple-500/20 text-sm sm:text-base"
              >
                {saving
                  ? getTranslation('profile.saving', lang)
                  : getTranslation('profile.saveDream', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}