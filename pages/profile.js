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

      const { data: dreamsData } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
      
      setDreams(dreamsData || [])

      // Haftalık kehanet
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

  async function handleLogout() {
    await auth.signOut()
    router.push('/')
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
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-4xl mx-auto">
        {/* Profil Başlığı */}
        <div className="glass-card p-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text mb-2">
                {profile?.display_name || profile?.username || user.email}
              </h1>
              <p className="text-white/60">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="glass-card px-4 py-2 text-white/80 hover:text-white"
            >
              {getTranslation('auth.logout', lang)}
            </button>
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
                        {dream.visibility === 'public' ? '' : dream.visibility === 'friends' ? '👥' : '🔒'}
                      </span>
                      <span className="text-xs glass-card px-2 py-1">
                        {dream.map_detail === 'full' ? '' : '📋'}
                      </span>
                    </div>
                  </div>
                  <p className="text-white/90 line-clamp-3">{dream.content}</p>
                  {dream.ai_sentiment && (
                    <div className="mt-2 text-sm text-purple-300">
                       {dream.ai_sentiment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
          }
