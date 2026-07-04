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
  const [weeklyProphecy, setWeeklyProphecy] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Düzenleme state'leri
  const [editingDream, setEditingDream] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editVisibility, setEditVisibility] = useState('public')
  const [editMapDetail, setEditMapDetail] = useState('full')
  const [editInFeed, setEditInFeed] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadData() {
      const currentUser = await auth.getUser()
      if (!currentUser) {
        router.push('/auth')
        return
      }
      
      setUser(currentUser)
      
      const profileData = await auth.getProfile(currentUser.id)
      setProfile(profileData)

      await loadDreams(currentUser.id)

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      
      const { data: prophecyData } = await supabase
        .from('weekly_prophecies')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('week_start', weekStart.toISOString().split('T')[0])
        .single()
      
      setWeeklyProphecy(prophecyData)
      setLoading(false)
    }
    loadData()
  }, [router])

  async function loadDreams(userId) {
    const { data: dreamsData } = await supabase
      .from('dreams')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    setDreams(dreamsData || [])
  }

  async function handleLogout() {
    await auth.signOut()
    router.push('/')
  }

  // Düzenleme modal aç
  function openEditModal(dream) {
    setEditingDream(dream)
    setEditContent(dream.content || '')
    setEditLocation(dream.location_name || '')
    setEditVisibility(dream.visibility || 'public')
    setEditMapDetail(dream.map_detail || 'full')
    setEditInFeed(dream.in_feed !== false)
  }

  // Düzenlemeyi kaydet
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
          map_detail: editMapDetail,
          in_feed: editInFeed
        })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      // Listeyi güncelle
      await loadDreams(user.id)
      setEditingDream(null)
    } catch (err) {
      alert('Hata: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Feed'den kaldır (soft delete)
  async function handleRemoveFromFeed(dream) {
    if (!user) return
    if (!confirm(getTranslation('dream.confirmRemoveFeed', lang) || 'Bu rüyayı feed\'den kaldırmak istediğine emin misin? Rüya dream journal\'ında kalacak.')) return
    
    try {
      const res = await fetch('/api/delete-dream', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamId: dream.id,
          userId: user.id,
          softDelete: true
        })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      await loadDreams(user.id)
    } catch (err) {
      alert('Hata: ' + err.message)
    }
  }

  // Tamamen sil
  async function handleDeleteDream(dream) {
    if (!user) return
    if (!confirm(getTranslation('dream.confirmDelete', lang) || 'Bu rüyayı tamamen silmek istediğine emin misin? Bu işlem geri alınamaz!')) return
    
    try {
      const res = await fetch('/api/delete-dream', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamId: dream.id,
          userId: user.id,
          softDelete: false
        })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      await loadDreams(user.id)
    } catch (err) {
      alert('Hata: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-xl animate-pulse">{getTranslation('auth.loading', lang)}</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-white/10" style={{ borderRadius: 0 }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-all">
              <span className="text-3xl">🌙</span>
              <span className="text-xl font-bold gradient-text">Dreamap</span>
            </a>
          </div>
          <nav className="flex items-center gap-4">
            <a href="/" className="text-white/80 hover:text-white transition-all flex items-center gap-2">
              <span>✨</span>
              <span className="hidden sm:inline">Akış</span>
            </a>
            <a href="/globe" className="text-white/80 hover:text-white transition-all flex items-center gap-2">
              <span>🌍</span>
              <span className="hidden sm:inline">Küre</span>
            </a>
            <button
              onClick={handleLogout}
              className="glass-card px-4 py-2 text-white/80 hover:text-white transition-all flex items-center gap-2"
            >
              <span>🚪</span>
              <span className="hidden sm:inline">{getTranslation('auth.logout', lang)}</span>
            </button>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        {/* Profil Başlığı */}
        <div className="glass-card p-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text mb-2">
                {profile?.display_name || profile?.username || user.email}
              </h1>
              <p className="text-white/60">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Haftalık Kehanet */}
        {weeklyProphecy && (
          <div className="glass-card p-6 mb-6 border-2 border-purple-500/30">
            <h2 className="text-xl font-bold gradient-text mb-4">
              {getTranslation('journal.weeklyProphecy', lang)}
            </h2>
            <p className="text-white/90 leading-relaxed">
              {weeklyProphecy[`content_${lang}`] || weeklyProphecy.content_en}
            </p>
            <div className="mt-4 p-4 bg-purple-500/10 rounded-lg">
              <p className="text-white/80 text-sm">
                {weeklyProphecy[`advice_${lang}`] || weeklyProphecy.advice_en}
              </p>
            </div>
          </div>
        )}

        {/* Rüya Ekle Butonu */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/add-dream')}
            className="glass-card px-6 py-3 text-white hover:bg-purple-500/20 transition-all"
          >
            + {getTranslation('dream.addTitle', lang)}
          </button>
        </div>

        {/* Rüya Günlüğü */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold gradient-text">
              {getTranslation('journal.title', lang)}
            </h2>
            <span className="text-white/60">
              {dreams.length} {getTranslation('journal.totalDreams', lang).toLowerCase()}
            </span>
          </div>

          {dreams.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4"></div>
              <p className="text-white/60">{getTranslation('journal.noDreams', lang)}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dreams.map((dream) => (
                <div key={dream.id} className="glass-card p-4 hover:bg-white/5 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🌙</span>
                      <span className="text-white/60 text-sm">{dream.dream_date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs glass-card px-2 py-1">
                        {dream.visibility === 'public' ? '🌍' : dream.visibility === 'friends' ? '👥' : '🔒'}
                      </span>
                      <span className="text-xs glass-card px-2 py-1">
                        {dream.map_detail === 'full' ? '📝' : '📋'}
                      </span>
                      {dream.in_feed === false && (
                        <span className="text-xs glass-card px-2 py-1 bg-yellow-500/20">
                          Feed'de Yok
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {dream.content ? (
                    <p className="text-white/90 line-clamp-3 mb-2">{dream.content}</p>
                  ) : (
                    <p className="text-white/40 italic mb-2">[İçerik silindi - sadece arketipler görünüyor]</p>
                  )}
                  
                  {dream.ai_sentiment && (
                    <div className="text-sm text-purple-300 mb-2">
                      💭 {dream.ai_sentiment}
                    </div>
                  )}
                  
                  {dream.ai_archetypes && dream.ai_archetypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {dream.ai_archetypes.map((arch, i) => (
                        <span key={i} className="text-xs glass-card px-2 py-1">{arch}</span>
                      ))}
                    </div>
                  )}

                  {/* Aksiyon Butonları */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-white/10">
                    <button
                      onClick={() => openEditModal(dream)}
                      className="text-xs glass-card px-3 py-1 text-blue-400 hover:bg-blue-500/20 transition-all"
                    >
                      ✏️ Düzenle
                    </button>
                    {dream.in_feed !== false && (
                      <button
                        onClick={() => handleRemoveFromFeed(dream)}
                        className="text-xs glass-card px-3 py-1 text-yellow-400 hover:bg-yellow-500/20 transition-all"
                      >
                        📤 Feed'den Kaldır
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteDream(dream)}
                      className="text-xs glass-card px-3 py-1 text-red-400 hover:bg-red-500/20 transition-all"
                    >
                      🗑️ Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Düzenleme Modal */}
      {editingDream && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div 
            className="absolute inset-0 bg-black/70"
            onClick={() => setEditingDream(null)}
          />
          <div className="relative glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setEditingDream(null)}
              className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl"
            >
              ×
            </button>
            
            <h2 className="text-2xl font-bold gradient-text mb-6">
              {getTranslation('dream.editTitle', lang) || 'Rüyayı Düzenle'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/60 block mb-2">
                  {getTranslation('dream.dreamText', lang)}
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none h-32"
                />
              </div>

              <div>
                <label className="text-sm text-white/60 block mb-2">
                  {getTranslation('dream.location', lang)}
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-white/60 block mb-2">
                  {getTranslation('dream.mapDetail', lang)}
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editMapDetail"
                      value="full"
                      checked={editMapDetail === 'full'}
                      onChange={(e) => setEditMapDetail(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-white/80">{getTranslation('dream.fullText', lang)}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editMapDetail"
                      value="summary"
                      checked={editMapDetail === 'summary'}
                      onChange={(e) => setEditMapDetail(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-white/80">{getTranslation('dream.summaryOnly', lang)}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60 block mb-2">
                  {getTranslation('dream.visibility', lang)}
                </label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editVisibility"
                      value="public"
                      checked={editVisibility === 'public'}
                      onChange={(e) => setEditVisibility(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-white/80">{getTranslation('dream.public', lang)}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editVisibility"
                      value="friends"
                      checked={editVisibility === 'friends'}
                      onChange={(e) => setEditVisibility(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-white/80">{getTranslation('dream.friends', lang)}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editVisibility"
                      value="private"
                      checked={editVisibility === 'private'}
                      onChange={(e) => setEditVisibility(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-white/80">{getTranslation('dream.private', lang)}</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="editInFeed"
                  checked={editInFeed}
                  onChange={(e) => setEditInFeed(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="editInFeed" className="text-white/80 cursor-pointer">
                  {getTranslation('dream.shareInFeed', lang)}
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditingDream(null)}
                  className="flex-1 glass-card px-6 py-3 text-white/80 hover:bg-white/10 transition-all"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 glass-card px-6 py-3 text-white bg-purple-500/20 hover:bg-purple-500/40 transition-all disabled:opacity-50"
                >
                  {saving ? getTranslation('auth.loading', lang) : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
  }
