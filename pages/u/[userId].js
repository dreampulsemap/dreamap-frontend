import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import GoalCard from '@/components/GoalCard'
import GoalDetailModal from '@/components/GoalDetailModal'
import DreamCard from '@/components/DreamCard'
import TextSkeleton from '@/components/TextSkeleton'
import SlidesViewer from '@/components/SlidesViewer'
import VisionVideoPlayer from '@/components/VisionVideoPlayer'
import Seo from '@/components/Seo'

export default function PublicProfilePage() {
  const router = useRouter()
  const { userId } = router.query
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const lang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const tVision = getVisionBoardText(lang)

  const [viewer, setViewer] = useState(null)
  const [profile, setProfile] = useState(null)
  const [dreams, setDreams] = useState([])
  const [goals, setGoals] = useState([])
  const [tab, setTab] = useState('vision')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [friendshipStatus, setFriendshipStatus] = useState(null)
  const [followsViewer, setFollowsViewer] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [activeDream, setActiveDream] = useState(null)
  const [activeGoal, setActiveGoal] = useState(null)
  const [activeSlidesGoal, setActiveSlidesGoal] = useState(null)
  const [activeVideoGoal, setActiveVideoGoal] = useState(null)
  // Video varsa oynatıcıya, yoksa eski slaytı varsa SlidesViewer'a, o da
  // yoksa detay modalına düş — bkz. vision-board.js'teki aynı desen.
  function handleOpenGoal(goal) {
    if (goal.vision_video_url) setActiveVideoGoal(goal)
    else if (goal.slide_count > 0) setActiveSlidesGoal(goal)
    else setActiveGoal(goal)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setViewer(session?.user || null)
    })
  }, [])

  const loadProfile = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {}

      const [profileRes, goalsRes] = await Promise.all([
        fetch(`/api/public-profile/${userId}`, { headers }),
        fetch(`/api/goals/list?mode=user&userId=${userId}`, { headers }),
      ])

      const profileJson = await profileRes.json()
      if (!profileRes.ok) {
        setNotFound(true)
        return
      }
      setProfile(profileJson.profile)
      setDreams(profileJson.dreams || [])
      setFriendshipStatus(profileJson.friendshipStatus)
      setFollowsViewer(!!profileJson.followsViewer)

      // Kendi profiline gelindiyse asıl (düzenlenebilir) profile.js'e yönlendir
      if (profileJson.isSelf) {
        router.replace('/profile')
        return
      }

      const goalsJson = await goalsRes.json()
      if (goalsRes.ok) setGoals(goalsJson.goals || [])
    } catch (err) {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [userId, router])

  useEffect(() => {
    if (router.isReady) loadProfile()
  }, [router.isReady, loadProfile])

  async function handleFollow() {
    if (!viewer) { router.push('/auth'); return }
    setFollowBusy(true)
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: viewer.id, friendId: userId }),
      })
      const json = await res.json()
      if (res.ok) setFriendshipStatus(json.status)
    } catch (err) {
      // sessiz
    } finally {
      setFollowBusy(false)
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <p className="text-slate-400 text-sm">
          {lang === 'tr' ? 'Kullanıcı bulunamadı.' : 'User not found.'}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* noindex: bu rota şu anda oturum açmamış ziyaretçiyi /auth'a
          yönlendiriyor (yukarıda `if (!viewer) router.push('/auth')`), yani
          Google'ın görebileceği bir şey yok. İleride profiller herkese açık
          (girişsiz görüntülenebilir) hale getirilirse noindex kaldırılıp
          sitemap.xml'e eklenebilir — kullanıcı adı bazlı profil sayfaları
          sosyal bir uygulama için değerli bir SEO yüzeyi olurdu. */}
      <Seo title="Kullanıcı Profili" noindex />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading || !profile ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary-400 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* PROFİL BAŞLIĞI */}
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 border-b border-white/10 pb-8 mb-6">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-brand-primary-600 to-brand-accent-800 flex items-center justify-center text-white font-bold text-3xl overflow-hidden shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  (profile.display_name || profile.username || '?').charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold text-white">{profile.display_name || profile.username}</h1>
                {profile.username && <p className="text-slate-500 text-sm">@{profile.username}</p>}
                {followsViewer && (
                  <span className="inline-block mt-1 rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] text-slate-400 uppercase tracking-widest">
                    {lang === 'tr' ? 'Seni takip ediyor' : 'Follows you'}
                  </span>
                )}
                {profile.bio && <p className="text-slate-300 text-sm mt-2 max-w-md">{profile.bio}</p>}

                <div className="flex items-center justify-center sm:justify-start gap-2 mt-4">
                  <button
                    onClick={handleFollow}
                    disabled={followBusy || friendshipStatus === 'accepted' || friendshipStatus === 'pending'}
                    className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                      friendshipStatus === 'accepted'
                        ? 'bg-white/5 text-slate-400 cursor-default'
                        : friendshipStatus === 'pending'
                        ? 'bg-white/5 text-amber-400 cursor-default'
                        : 'bg-brand-secondary-500 text-black hover:bg-brand-secondary-400 disabled:opacity-50'
                    }`}
                  >
                    {friendshipStatus === 'accepted'
                      ? (lang === 'tr' ? 'Takipte' : 'Following')
                      : friendshipStatus === 'pending'
                      ? (lang === 'tr' ? 'Bekliyor' : 'Pending')
                      : (lang === 'tr' ? 'Takip Et' : 'Follow')}
                  </button>
                  <Link
                    href={`/messages?with=${userId}`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-white/5 text-white hover:bg-white/10 transition-all"
                  >
                    <MessageCircle size={13} />
                    {lang === 'tr' ? 'Mesaj' : 'Message'}
                  </Link>
                </div>
              </div>
            </div>

            {/* SEKMELER — profile.js ile aynı format */}
            <div className="flex items-center justify-center gap-8 border-t border-white/10 mb-4">
              <button
                onClick={() => setTab('vision')}
                className={`flex items-center gap-1.5 py-3 text-xs font-bold uppercase tracking-widest border-t-2 -mt-px transition-colors ${
                  tab === 'vision' ? 'border-brand-primary-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                ✦ {mounted ? (lang === 'tr' ? 'Vizyon Panosu' : 'Vision Board') : <TextSkeleton width="w-20" />}
              </button>
              <button
                onClick={() => setTab('dreams')}
                className={`flex items-center gap-1.5 py-3 text-xs font-bold uppercase tracking-widest border-t-2 -mt-px transition-colors ${
                  tab === 'dreams' ? 'border-brand-primary-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                🌙 {mounted ? (lang === 'tr' ? 'Rüyalar' : 'Dreams') : <TextSkeleton width="w-14" />}
              </button>
            </div>

            {tab === 'vision' ? (
              goals.length === 0 ? (
                <div className="text-center py-20 text-white/40 text-sm">{tVision.emptyFeed}</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {goals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} lang={lang} currentUserId={viewer?.id} onOpenGoal={handleOpenGoal} />
                  ))}
                </div>
              )
            ) : dreams.length === 0 ? (
              <div className="text-center py-20 text-white/40 text-sm">
                {lang === 'tr' ? 'Herkese açık rüya yok.' : 'No public dreams.'}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                {dreams.map((dream) => (
                  <div
                    key={dream.id}
                    onClick={() => setActiveDream(dream)}
                    className="group aspect-square relative overflow-hidden rounded-xl border border-white/5 bg-slate-900/40 hover:border-brand-primary-500/45 cursor-pointer"
                  >
                    {dream.ai_image_url ? (
                      <Image src={dream.ai_image_url} alt="" fill sizes="(max-width: 640px) 33vw, 300px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center p-3 bg-gradient-to-br from-brand-accent-950/20 to-black">
                        <p className="text-[10px] text-white/70 line-clamp-4">"{dream.content}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {activeGoal && (
        <GoalDetailModal
          goal={activeGoal}
          lang={lang}
          currentUserId={viewer?.id}
          onClose={() => setActiveGoal(null)}
          onChanged={(u) => setGoals((l) => l.map((g) => (g.id === u.id ? { ...g, ...u } : g)))}
          onDeleted={(id) => setGoals((l) => l.filter((g) => g.id !== id))}
        />
      )}

      {activeVideoGoal && (
        <VisionVideoPlayer
          goal={activeVideoGoal}
          lang={lang}
          currentUserId={viewer?.id}
          onClose={() => setActiveVideoGoal(null)}
          onChanged={(u) => {
            setActiveVideoGoal((g) => (g ? { ...g, ...u } : g))
            setGoals((l) => l.map((g) => (g.id === u.id ? { ...g, ...u } : g)))
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
          currentUserId={viewer?.id}
          onClose={() => setActiveSlidesGoal(null)}
          onChanged={(u) => {
            setActiveSlidesGoal((g) => (g ? { ...g, ...u } : g))
            setGoals((l) => l.map((g) => (g.id === u.id ? { ...g, ...u } : g)))
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

      {activeDream && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setActiveDream(null)}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <DreamCard dream={activeDream} lang={lang} currentUserId={viewer?.id} owner={profile} onTranslate={() => {}} translating={false} translated={false} />
          </div>
        </div>
      )}
    </div>
  )
}
