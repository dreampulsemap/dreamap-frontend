import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import GoalCard from '@/components/GoalCard'
import CreateGoalModal from '@/components/CreateGoalModal'
import GoalDetailModal from '@/components/GoalDetailModal'
import DailySeedsPanel from '@/components/DailySeedsPanel'
import MentalWallPanel from '@/components/MentalWallPanel'
import ReferralWidget from '@/components/ReferralWidget'
import EmptyState from '@/components/EmptyState'
import ErrorState from '@/components/ErrorState'
import Navbar from '@/components/Navbar'

export default function VisionBoardPage() {
  const router = useRouter()
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const lang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const t = getVisionBoardText(lang)

  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('feed') // 'feed' | 'own'
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [activeGoal, setActiveGoal] = useState(null)
  const [ownActiveGoals, setOwnActiveGoals] = useState([])
  const [loadError, setLoadError] = useState('')
  const [authChecked, setAuthChecked] = useState(false)

  // BottomNav'daki "+" menüsünden "Yeni Vizyon" seçilince /vision-board?create=1
  // ile buraya geliniyor — modalı otomatik aç ve "Hedeflerim" sekmesine geç.
  useEffect(() => {
    if (!router.isReady || !authChecked) return
    if (router.query.create === '1') {
      if (user) {
        setTab('own')
        setShowCreate(true)
      } else {
        router.replace('/auth')
        return
      }
      // URL'i temizle (paylaşılırsa/yenilenirse modal tekrar açılmasın)
      router.replace('/vision-board', undefined, { shallow: true })
    }
  }, [router.isReady, router.query.create, user, authChecked])

  useEffect(() => {
    if (!user?.id) { setOwnActiveGoals([]); return }
    let active = true
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      try {
        const res = await fetch('/api/goals/list?mode=own&status=active', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const json = await res.json()
        if (active && res.ok) setOwnActiveGoals(json.goals || [])
      } catch {
        // sessiz
      }
    })
    return () => { active = false }
  }, [user])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) {
        setUser(session?.user || null)
        setAuthChecked(true)
      }
    })
    const { data: authListener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (active) setUser(session?.user || null)
    })
    return () => {
      active = false
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  const loadGoals = useCallback(async (targetTab, targetPage, replace) => {
    setLoading(true)
    setLoadError('')
    try {
      let url = `/api/goals/list?mode=${targetTab === 'own' ? 'own' : 'feed'}&page=${targetPage}`
      const headers = {}
      const { data: { session } } = await supabase.auth.getSession()
      if (targetTab === 'own' && !session) { setLoading(false); return }
      if (session) headers.Authorization = `Bearer ${session.access_token}`
      const res = await fetch(url, { headers })
      const json = await res.json()
      if (!res.ok) {
        setLoadError(json.error || 'error')
        setLoading(false)
        return
      }

      setGoals((prev) => (replace ? (json.goals || []) : [...prev, ...(json.goals || [])]))
      setHasMore(!!json.hasMore)
      setPage(targetPage)
    } catch {
      setLoadError('network_error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGoals(tab, 0, true)
  }, [tab, loadGoals])

  function handleGoalUpdated(updatedGoal) {
    setGoals((list) => list.map((g) => (g.id === updatedGoal.id ? { ...g, ...updatedGoal } : g)))
  }

  function handleGoalDeleted(goalId) {
    setGoals((list) => list.filter((g) => g.id !== goalId))
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 pt-24 pb-16">
        <div className={`mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div>
            <h1 className="text-h1 text-white">{t.pageTitle}</h1>
            <p className="text-slate-400 text-sm mt-1">{t.pageSubtitle}</p>
          </div>
          <button
            onClick={() => (user ? setShowCreate(true) : (window.location.href = '/auth'))}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white text-sm font-bold uppercase tracking-widest hover:opacity-90 self-start sm:self-auto"
          >
            + {t.createGoalBtn}
          </button>
        </div>

        <DailySeedsPanel lang={lang} user={user} activeGoals={ownActiveGoals} />
        <MentalWallPanel lang={lang} user={user} />
        <ReferralWidget lang={lang} user={user} />

        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setTab('feed')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              tab === 'feed' ? 'bg-fuchsia-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {t.feedTab}
          </button>
          <button
            onClick={() => (user ? setTab('own') : (window.location.href = '/auth'))}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              tab === 'own' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {t.myGoalsTab}
          </button>
        </div>

        {loadError && !loading && (
          <ErrorState lang={lang} onRetry={() => loadGoals(tab, 0, true)} />
        )}

        {!loadError && goals.length === 0 && !loading && (
          <EmptyState
            icon="🌠"
            title={tab === 'own' ? t.emptyMyGoals : t.emptyFeed}
            actionLabel={tab === 'own' ? `+ ${t.createGoalBtn}` : undefined}
            onAction={tab === 'own' ? () => (user ? setShowCreate(true) : (window.location.href = '/auth')) : undefined}
          />
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              lang={lang}
              currentUserId={user?.id}
              onOpenGoal={setActiveGoal}
              onReacted={() => {}}
            />
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <span className="text-slate-500 text-xs uppercase tracking-widest animate-pulse">...</span>
          </div>
        )}

        {!loading && hasMore && goals.length > 0 && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => loadGoals(tab, page + 1, false)}
              className="px-6 py-2.5 rounded-full bg-white/5 text-slate-300 text-xs font-bold uppercase tracking-widest hover:bg-white/10"
            >
              {lang === 'tr' ? 'Daha Fazla' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateGoalModal
          lang={lang}
          onClose={() => setShowCreate(false)}
          onCreated={(goal) => {
            if (tab === 'own') setGoals((g) => [goal, ...g])
          }}
        />
      )}

      {activeGoal && (
        <GoalDetailModal
          goal={activeGoal}
          lang={lang}
          currentUserId={user?.id}
          onClose={() => setActiveGoal(null)}
          onChanged={handleGoalUpdated}
          onDeleted={handleGoalDeleted}
        />
      )}
    </div>
  )
}
