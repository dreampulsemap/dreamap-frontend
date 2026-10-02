import { useEffect, useState, useCallback, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import VisionGridCard from '@/components/VisionGridCard'
import VisionCompassCard from '@/components/VisionCompassCard'
import CreateGoalModal from '@/components/CreateGoalModal'
import GoalDetailModal from '@/components/GoalDetailModal'
import DailySeedsPanel from '@/components/DailySeedsPanel'
import AISummariesCard from '@/components/AISummariesCard'
import SlidesViewer from '@/components/SlidesViewer'
import VisionVideoPlayer from '@/components/VisionVideoPlayer'
import VisionReelsFeed from '@/components/VisionReelsFeed'
import Seo from '@/components/Seo'

export default function VisionBoardPage() {
  const router = useRouter()
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const lang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const t = getVisionBoardText(lang)

  const [user, setUser] = useState(null)
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [activeGoal, setActiveGoal] = useState(null)
  const [activeSlidesGoal, setActiveSlidesGoal] = useState(null)
  const [activeVideoGoal, setActiveVideoGoal] = useState(null)
  const [reelsGoalId, setReelsGoalId] = useState(null)
  const [ownActiveGoals, setOwnActiveGoals] = useState([])
  const [loadError, setLoadError] = useState('')
  const [authChecked, setAuthChecked] = useState(false)

  // BottomNav'daki "+" menüsünden "Yeni Vizyon" seçilince /vision-board?create=1
  // ile buraya geliniyor — modalı otomatik aç ve "Hedeflerim" sekmesine geç.
  useEffect(() => {
    if (!router.isReady || !authChecked) return
    if (router.query.create === '1') {
      if (user) {
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
    loadGoals('feed', 0, true)
  }, [loadGoals])

  function handleGoalUpdated(updatedGoal) {
    setGoals((list) => list.map((g) => (g.id === updatedGoal.id ? { ...g, ...updatedGoal } : g)))
  }

  function handleGoalDeleted(goalId) {
    setGoals((list) => list.filter((g) => g.id !== goalId))
  }

  // Bir vizyon kartına dokununca: video varsa doğrudan oto-oynayan
  // VisionVideoPlayer'a gir (Reels beslemesi video oynatmıyor, sadece kapak
  // görselini gösteriyor) — geri kalan HER ŞEY (slaytlı ya da düz görselli)
  // artık dikey kaydırmalı, tam ekran VisionReelsFeed'den açılıyor;
  // slayt/detay görüntüleyicileri beslemenin İÇİNDEN ikincil eylem olarak
  // tetikleniyor.
  function handleOpenGoal(goal) {
    if (goal.vision_video_url) setActiveVideoGoal(goal)
    else setReelsGoalId(goal.id)
  }

  const tr = lang === 'tr'
  const observerRef = useRef(null)
  const lastRef = useCallback((node) => {
    if (loading || !hasMore) return
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadGoals('feed', page + 1, false)
    })
    if (node) observerRef.current.observe(node)
  }, [loading, hasMore, page, loadGoals])

  // Android VisionScreen sırası: pusula > rüya özetleri > günün tohumları > herkese açık vizyonlar.
  return (
    <div className="min-h-screen bg-void-950">
      <Seo title={tr ? 'Vizyon' : 'Vision'} noindex lang={lang} />
      {loadError && goals.length === 0 && !loading ? (
        <div className="flex flex-col items-center px-6 py-24 text-center">
          <p className="font-serif text-base text-white">{tr ? 'Vizyonlar yüklenemedi' : 'Visions could not be loaded'}</p>
          <button onClick={() => loadGoals('feed', 0, true)} className="mt-4 flex items-center gap-2 rounded-full border border-astral-gold/40 px-5 py-2 text-sm text-astral-gold"><RefreshCw size={16} />{tr ? 'Tekrar Dene' : 'Retry'}</button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 p-4">
          {user && <VisionCompassCard lang={lang} />}
          <AISummariesCard lang={lang} user={user} />
          <DailySeedsPanel lang={lang} user={user} activeGoals={ownActiveGoals} onGoalClick={setActiveGoal} />

          <h2 className="mb-1 mt-2 font-serif text-lg font-bold text-astral-gold">{tr ? 'Herkese Açık Vizyonlar' : 'Public Visions'}</h2>
          {goals.length === 0 && !loading ? (
            <div className="py-8 text-center">
              <p className="font-serif text-base text-white">{tr ? 'Henüz herkese açık bir vizyon yok' : 'No public visions yet'}</p>
              <p className="mt-2 text-xs text-slate-400">{tr ? 'İlk vizyonu sen oluşturabilirsin.' : 'You can create the first vision yourself.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {goals.map((goal, i) => (
                <div key={goal.id} ref={i === goals.length - 1 ? lastRef : null}>
                  <VisionGridCard goal={goal} lang={lang} onClick={() => handleOpenGoal(goal)} />
                </div>
              ))}
            </div>
          )}
          {loading && (
            <div className="flex justify-center py-6"><span className="h-8 w-8 animate-spin rounded-full border-4 border-astral-gold/25 border-t-astral-gold" /></div>
          )}
        </div>
      )}

      {showCreate && (
        <CreateGoalModal
          lang={lang}
          onClose={() => setShowCreate(false)}
          onCreated={(goal) => {
            if (goal?.status === 'active' || !goal?.status) setOwnActiveGoals((g) => [goal, ...g])
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

      {reelsGoalId && (
        <VisionReelsFeed
          goals={goals}
          lang={lang}
          t={t}
          currentUserId={user?.id}
          initialGoalId={reelsGoalId}
          onLoadMore={() => loadGoals('feed', page + 1, false)}
          hasMore={hasMore}
          loading={loading}
          onClose={() => setReelsGoalId(null)}
          onOpenGoal={(g) => { setReelsGoalId(null); setActiveGoal(g) }}
          onOpenSlides={(g) => { setReelsGoalId(null); setActiveSlidesGoal(g) }}
          onReacted={() => {}}
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
            handleGoalUpdated(updated)
          }}
          onOpenDetails={(g) => {
            setActiveVideoGoal(null)
            setActiveGoal(g || activeVideoGoal)
          }}
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
            handleGoalUpdated(updated)
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
    </div>
  )
}
