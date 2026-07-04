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

  // Arkadaşlık state'leri
  const [showFriends, setShowFriends] = useState(false)
  const [friends, setFriends] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)

  const getDreamAnalysis = (dream) => dream[`ai_summary_${lang}`] || dream.ai_summary || dream.ai_summary_en || ''
  const getDreamMotiv = (dream) => dream[`ai_motiv_${lang}`] || dream.ai_motiv || dream.ai_motiv_en || ''
  const getDreamImage = (dream) => dream.ai_image_url || null

  useEffect(() => {
    async function loadData() {
      const currentUser = await auth.getUser()
      if (!currentUser) { router.push('/auth'); return }
      setUser(currentUser)
      setProfile(await auth.getProfile(currentUser.id))
      await loadDreams(currentUser.id)
      await loadFriends(currentUser.id)
      setLoading(false)
    }
    loadData()
  }, [router])

  async function loadDreams(userId) {
    const { data } = await supabase.from('dreams').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    setDreams(data || [])
  }

  async function loadFriends(userId) {
    const [friendsRes, pendingRes] = await Promise.all([
      fetch(`/api/friends/list?userId=${userId}&type=accepted`),
      fetch(`/api/friends/list?userId=${userId}&type=pending`)
    ])
    const friendsData = await friendsRes.json()
    const pendingData = await pendingRes.json()
    setFriends(friendsData.friendships || [])
    setPendingRequests(pendingData.friendships || [])
  }

  async function handleLogout() { await auth.signOut(); router.push('/') }

  async function handleSaveEdit() {
    if (!editingDream || !user) return
    setSaving(true)
    try {
      const res = await fetch('/api/update-dream', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dreamId: editingDream.id, userId: user.id, content: editContent, location_name: editLocation, visibility: editVisibility, in_feed: editInFeed })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await loadDreams(user.id)
      setEditingDream(null)
    } catch (err) { alert('Hata: ' + err.message) } finally { setSaving(false) }
  }

  async function handleRemoveFromFeed(dream) {
    if (!confirm('Feed\'den kaldırılsın mı?')) return
    try {
      const res = await fetch('/api/delete-dream', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dreamId: dream.id, userId: user.id, softDelete: true }) })
      if (!res.ok) throw new Error((await res.json()).error)
      await loadDreams(user.id)
    } catch (err) { alert('Hata: ' + err.message) }
  }

  async function handleDeleteDream(dream) {
    if (!confirm('Tamamen silinsin mi?')) return
    try {
      const res = await fetch('/api/delete-dream', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dreamId: dream.id, userId: user.id, softDelete: false }) })
      if (!res.ok) throw new Error((await res.json()).error)
      await loadDreams(user.id)
    } catch (err) { alert('Hata: ' + err.message) }
  }

  // Arkadaşlık fonksiyonları
  async function handleSearch() {
    if (!searchQuery.trim() || !user) return
    const res = await fetch(`/api/friends/search?query=${encodeURIComponent(searchQuery)}&userId=${user.id}`)
    const data = await res.json()
    setSearchResults(data.users || [])
    setShowSearch(true)
  }

  async function handleSendRequest(friendId) {
    const res = await fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, friendId })
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
      body: JSON.stringify({ friendshipId, userId: user.id, action })
    })
    if (res.ok) {
      alert(action === 'accepted' ? getTranslation('friends.requestAccepted', lang) : getTranslation('friends.requestRejected', lang))
      await loadFriends(user.id)
    }
  }

  async function handleRemoveFriend(friendshipId) {
    if (!confirm(getTranslation('friends.removeFriend', lang) + '?')) return
    const res = await fetch('/api/friends/respond', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendshipId, userId: user.id, action: 'rejected' })
    })
    if (res.ok) {
      alert(getTranslation('friends.friendRemoved', lang))
      await loadFriends(user.id)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Yükleniyor...</div>
  if (!user) return null

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 glass-card border-b border-white/10" style={{ borderRadius: 0 }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2"><span className="text-3xl">🌙</span><span className="font-bold gradient-text">Dreamap</span></a>
          <nav className="flex gap-4">
            <a href="/" className="hover:text-purple-400">Akış</a>
            <a href="/globe" className="hover:text-purple-400">Küre</a>
            <button onClick={handleLogout} className="text-red-400 hover:text-red-300">Çıkış</button>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="glass-card p-6 mb-6">
          <h1 className="text-2xl font-bold gradient-text">{profile?.username || user.email}</h1>
          <p className="text-white/60">{user.email}</p>
          <button onClick={() => setShowFriends(!showFriends)} className="mt-4 glass-card px-4 py-2 hover:bg-purple-500/20">
            👥 {getTranslation('friends.title', lang)} ({friends.length})
          </button>
        </div>

        {/* Arkadaşlık Bölümü */}
        {showFriends && (
          <div className="glass-card p-6 mb-6">
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={getTranslation('friends.searchPlaceholder', lang)}
                className="flex-1 bg-black/40 border border-white/20 rounded px-4 py-2 text-white"
              />
              <button onClick={handleSearch} className="glass-card px-4 py-2 hover:bg-purple-500/20">
                🔍 Ara
              </button>
            </div>

            {/* Arama Sonuçları */}
            {showSearch && searchResults.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Arama Sonuçları</h3>
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <div key={result.id} className="glass-card p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{result.username}</div>
                        <div className="text-sm text-white/60">{result.display_name}</div>
                      </div>
                      {result.friendshipStatus === null && (
                        <button onClick={() => handleSendRequest(result.id)} className="glass-card px-3 py-1 text-sm hover:bg-purple-500/20">
                          {getTranslation('friends.sendRequest', lang)}
                        </button>
                      )}
                      {result.friendshipStatus === 'pending' && (
                        <span className="text-yellow-400 text-sm">{getTranslation('friends.pending', lang)}</span>
                      )}
                      {result.friendshipStatus === 'accepted' && (
                        <span className="text-green-400 text-sm">{getTranslation('friends.accepted', lang)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gelen İstekler */}
            {pendingRequests.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">{getTranslation('friends.incomingRequests', lang)} ({pendingRequests.length})</h3>
                <div className="space-y-2">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="glass-card p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{req.user_profiles?.username}</div>
                        <div className="text-sm text-white/60">{req.user_profiles?.display_name}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleRespondRequest(req.id, 'accepted')} className="glass-card px-3 py-1 text-sm bg-green-500/20 hover:bg-green-500/30">
                          {getTranslation('friends.accept', lang)}
                        </button>
                        <button onClick={() => handleRespondRequest(req.id, 'rejected')} className="glass-card px-3 py-1 text-sm bg-red-500/20 hover:bg-red-500/30">
                          {getTranslation('friends.reject', lang)}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Arkadaş Listesi */}
            <div>
              <h3 className="text-lg font-semibold mb-3">{getTranslation('friends.title', lang)}</h3>
              {friends.length === 0 ? (
                <p className="text-white/60">{getTranslation('friends.noFriends', lang)}</p>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <div key={friend.id} className="glass-card p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{friend.user_profiles?.username || friend.friend_profiles?.username}</div>
                        <div className="text-sm text-white/60">{friend.user_profiles?.display_name || friend.friend_profiles?.display_name}</div>
                      </div>
                      <button onClick={() => handleRemoveFriend(friend.id)} className="glass-card px-3 py-1 text-sm text-red-400 hover:bg-red-500/20">
                        {getTranslation('friends.removeFriend', lang)}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <button onClick={() => router.push('/add-dream')} className="w-full glass-card p-4 mb-6 text-center hover:bg-purple-500/20 transition-all text-lg">
          + {getTranslation('dream.addTitle', lang)}
        </button>

        <div className="space-y-6">
          {dreams.map((dream) => (
            <div key={dream.id} className="glass-card overflow-hidden">
              {getDreamImage(dream) && (
                <div className="h-48 overflow-hidden bg-black">
                  <img src={getDreamImage(dream)} className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                </div>
              )}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-white/60 text-sm">📅 {dream.dream_date} • 📍 {dream.location_name}</span>
                  <div className="flex gap-2">
                    <span className="text-xs glass-card px-2 py-1">{dream.visibility === 'public' ? '' : dream.visibility === 'friends' ? '' : '🔒'}</span>
                  </div>
                </div>

                {dream.content ? <p className="text-white/90 mb-4 whitespace-pre-wrap">{dream.content}</p> : <p className="text-white/40 italic mb-4">[İçerik silindi]</p>}

                {dream.ai_archetypes?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {dream.ai_archetypes.map((a, i) => <span key={i} className="text-xs glass-card px-2 py-1 text-purple-300">{a}</span>)}
                  </div>
                )}

                {getDreamAnalysis(dream) && (
                  <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30 mb-4">
                    <div className="font-semibold text-purple-300 mb-2 flex items-center gap-2"><span></span> Jungian Analiz</div>
                    <p className="text-white/80 text-sm">{getDreamAnalysis(dream)}</p>
                    {getDreamMotiv(dream) && <p className="text-white/60 text-xs italic mt-2 pt-2 border-t border-purple-500/30">💫 {getDreamMotiv(dream)}</p>}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                  <button onClick={() => { setEditingDream(dream); setEditContent(dream.content || ''); setEditLocation(dream.location_name || ''); setEditVisibility(dream.visibility || 'public'); setEditInFeed(dream.in_feed !== false) }} className="text-xs glass-card px-3 py-1 text-blue-400 hover:bg-blue-500/20">✏️ Düzenle</button>
                  {dream.in_feed !== false && <button onClick={() => handleRemoveFromFeed(dream)} className="text-xs glass-card px-3 py-1 text-yellow-400 hover:bg-yellow-500/20">📤 Feed'den Kaldır</button>}
                  <button onClick={() => handleDeleteDream(dream)} className="text-xs glass-card px-3 py-1 text-red-400 hover:bg-red-500/20">🗑️ Sil</button>
                </div>
              </div>
            </div>
          ))}
          {dreams.length === 0 && <div className="text-center py-12 text-white/60">{getTranslation('journal.noDreams', lang)}</div>}
        </div>
      </div>

      {editingDream && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 gradient-text">Rüyayı Düzenle</h2>
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded p-3 mb-4 h-32 text-white" />
            <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded p-3 mb-4 text-white" placeholder="Konum" />
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2"><input type="radio" name="vis" value="public" checked={editVisibility === 'public'} onChange={(e) => setEditVisibility(e.target.value)} /> Herkese Açık</label>
              <label className="flex items-center gap-2"><input type="radio" name="vis" value="friends" checked={editVisibility === 'friends'} onChange={(e) => setEditVisibility(e.target.value)} /> Arkadaşlar</label>
              <label className="flex items-center gap-2"><input type="radio" name="vis" value="private" checked={editVisibility === 'private'} onChange={(e) => setEditVisibility(e.target.value)} /> Gizli</label>
            </div>
            <label className="flex items-center gap-2 mb-6"><input type="checkbox" checked={editInFeed} onChange={(e) => setEditInFeed(e.target.checked)} /> Feed'de Göster</label>
            <div className="flex gap-3">
              <button onClick={() => setEditingDream(null)} className="flex-1 glass-card py-2">İptal</button>
              <button onClick={handleSaveEdit} disabled={saving} className="flex-1 glass-card py-2 bg-purple-500/20">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
  }
