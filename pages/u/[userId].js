import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import Link from 'next/link'
import { MessageCircle, MoreHorizontal, Flag, Ban, ShieldOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase, getAuthHeader } from '@/lib/supabase'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import { REPORT_REASONS } from '@/lib/reportReasons'
import GoalCard from '@/components/GoalCard'
import GoalDetailModal from '@/components/GoalDetailModal'
import DreamCard from '@/components/DreamCard'
import TextSkeleton from '@/components/TextSkeleton'
import SlidesViewer from '@/components/SlidesViewer'
import VisionVideoPlayer from '@/components/VisionVideoPlayer'
import DiaryStoryViewer from '@/components/DiaryStoryViewer'
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
  // Google Play UGC politikası: kullanıcı engelleme + şikayet etme.
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [blockedByMe, setBlockedByMe] = useState(false)
  const [blockBusy, setBlockBusy] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [showReportSheet, setShowReportSheet] = useState(false)
  const [reportReason, setReportReason] = useState(null)
  const [reportNote, setReportNote] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const [activeDream, setActiveDream] = useState(null)
  const [activeGoal, setActiveGoal] = useState(null)
  const [activeSlidesGoal, setActiveSlidesGoal] = useState(null)
  const [activeVideoGoal, setActiveVideoGoal] = useState(null)
  const [diaryEntries, setDiaryEntries] = useState(null) // null = henüz kontrol edilmedi
  const [diaryViewer, setDiaryViewer] = useState(null)
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

      const [profileRes, goalsRes, diaryRes] = await Promise.all([
        fetch(`/api/public-profile/${userId}`, { headers }),
        fetch(`/api/goals/list?mode=user&userId=${userId}`, { headers }),
        fetch(`/api/diary/list-for-user?userId=${userId}`, { headers }),
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

      // Engelleme durumu — Google Play UGC politikası. Hata olursa
      // sessizce yutulur, buton "Engelle" varsayılanında kalır.
      try {
        const blockHeaders = await getAuthHeader()
        if (blockHeaders?.Authorization) {
          const statusRes = await fetch(`/api/blocks/status?targetUserId=${userId}`, { headers: blockHeaders })
          const statusJson = await statusRes.json()
          if (statusRes.ok) setBlockedByMe(!!statusJson.blockedByMe)
        }
      } catch (_) {}

      const goalsJson = await goalsRes.json()
      if (goalsRes.ok) setGoals(goalsJson.goals || [])

      const diaryJson = await diaryRes.json()
      if (diaryRes.ok) setDiaryEntries(diaryJson.entries || [])
    } catch (err) {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [userId, router])

  useEffect(() => {
    if (router.isReady) loadProfile()
  }, [router.isReady, loadProfile])

  function openDiary() {
    if (!diaryEntries || diaryEntries.length === 0 || !profile) return
    setDiaryViewer({
      groups: [{ userId, displayName: profile.display_name, username: profile.username, avatarUrl: profile.avatar_url }],
      startIndex: 0,
    })
  }

  async function handleFollow() {
    if (!viewer) { router.push('/auth'); return }
    setFollowBusy(true)
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
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

  // Google Play UGC politikası: kullanıcı engelleme.
  async function handleToggleBlock() {
    if (!viewer) { router.push('/auth'); return }
    setBlockBusy(true)
    try {
      const res = await fetch(blockedByMe ? '/api/blocks/unblock' : '/api/blocks/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify({ blockedUserId: userId }),
      })
      if (res.ok) setBlockedByMe((prev) => !prev)
    } catch (_) {
      // sessiz — buton eski durumunda kalır, kullanıcı tekrar deneyebilir
    } finally {
      setBlockBusy(false)
      setShowBlockConfirm(false)
    }
  }

  // Google Play UGC politikası: kullanıcı şikayeti.
  async function handleSubmitReport() {
    if (!reportReason || submittingReport) return
    setSubmittingReport(true)
    try {
      const headers = await getAuthHeader()
      if (!headers.Authorization) { router.push('/auth'); return }
      const res = await fetch('/api/reports/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ userId, reason: reportReason, note: reportNote.trim() || undefined }),
      })
      if (res.ok) {
        setReportSubmitted(true)
        setTimeout(() => {
          setShowReportSheet(false)
          setReportSubmitted(false)
          setReportReason(null)
          setReportNote('')
        }, 1600)
      }
    } catch (_) {} finally {
      setSubmittingReport(false)
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
              <button
                type="button"
                onClick={diaryEntries && diaryEntries.length > 0 ? openDiary : undefined}
                className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full shrink-0 ${diaryEntries && diaryEntries.length > 0 ? 'p-[2.5px] cursor-pointer' : 'cursor-default'}`}
                style={diaryEntries && diaryEntries.length > 0 ? { background: 'conic-gradient(from 0deg, #FFF6D6, #E6C687, #B89753, #E6C687, #FFF6D6)' } : undefined}
                aria-label={diaryEntries && diaryEntries.length > 0 ? (lang === 'tr' ? 'Güncesini gör' : 'View diary') : undefined}
              >
                <div className="w-full h-full rounded-full bg-gradient-to-br from-brand-primary-600 to-brand-accent-800 flex items-center justify-center text-white font-bold text-3xl overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                  ) : (
                    (profile.display_name || profile.username || '?').charAt(0).toUpperCase()
                  )}
                </div>
              </button>
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

                  {/* Google Play UGC politikası: "..." menüsü — Bildir / Engelle. */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowMoreMenu((v) => !v)}
                      aria-label={lang === 'tr' ? 'Diğer seçenekler' : 'More options'}
                      className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {showMoreMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                        <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/10 bg-void-900 shadow-2xl z-50 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => { setShowMoreMenu(false); setShowReportSheet(true) }}
                            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-200 hover:bg-white/5 transition-colors"
                          >
                            <Flag size={15} className="text-shadowWork-rose shrink-0" />
                            {lang === 'tr' ? 'Kullanıcıyı Şikayet Et' : 'Report User'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowMoreMenu(false); setShowBlockConfirm(true) }}
                            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-200 hover:bg-white/5 transition-colors border-t border-white/5"
                          >
                            {blockedByMe ? (
                              <ShieldOff size={15} className="text-shadowWork-rose shrink-0" />
                            ) : (
                              <Ban size={15} className="text-shadowWork-rose shrink-0" />
                            )}
                            {blockedByMe
                              ? (lang === 'tr' ? 'Engeli Kaldır' : 'Unblock')
                              : (lang === 'tr' ? 'Kullanıcıyı Engelle' : 'Block User')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
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

      {diaryViewer && (
        <DiaryStoryViewer
          groups={diaryViewer.groups}
          startIndex={diaryViewer.startIndex}
          lang={lang}
          currentUserId={viewer?.id}
          onClose={() => setDiaryViewer(null)}
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
            <DreamCard dream={activeDream} lang={lang} currentUserId={viewer?.id} owner={profile} onClose={() => setActiveDream(null)} onTranslate={() => {}} translating={false} translated={false} />
          </div>
        </div>
      )}

      {/* Kullanıcı Engelleme onay diyaloğu — Google Play UGC politikası. */}
      {showBlockConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setShowBlockConfirm(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-void-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold mb-2">
              {blockedByMe
                ? (lang === 'tr' ? 'Engeli kaldırmak istiyor musunuz?' : 'Unblock this user?')
                : (lang === 'tr' ? 'Bu kullanıcıyı engellemek istiyor musunuz?' : 'Block this user?')}
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              {blockedByMe
                ? (lang === 'tr' ? 'Birbirinizin paylaşımlarını ve mesajlarını tekrar görebileceksiniz.' : "You'll be able to see each other's public content and messages again.")
                : (lang === 'tr' ? 'Size mesaj gönderemez ve paylaşımlarınızı göremez, siz de onunkileri göremezsiniz.' : "They won't be able to message you or see your public content, and you won't see theirs.")}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBlockConfirm(false)}
                className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
              >
                {lang === 'tr' ? 'Vazgeç' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleToggleBlock}
                disabled={blockBusy}
                className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-shadowWork-rose text-white hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {blockedByMe ? (lang === 'tr' ? 'Engeli Kaldır' : 'Unblock') : (lang === 'tr' ? 'Engelle' : 'Block')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kullanıcı Şikayeti sheet'i — Google Play UGC politikası. Aynı
          REPORT_REASONS listesi ve tasarım dili SlidesViewer/VisionVideoPlayer
          ile paylaşılıyor. */}
      {showReportSheet && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md" onClick={() => !submittingReport && setShowReportSheet(false)}>
          <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-white/10 bg-void-900 p-6" onClick={(e) => e.stopPropagation()}>
            {reportSubmitted ? (
              <p className="text-center text-sm text-slate-200 py-6">
                {lang === 'tr' ? 'Şikayetiniz alındı. Teşekkürler.' : "Report submitted. Thank you."}
              </p>
            ) : (
              <>
                <h3 className="text-white font-bold mb-1">{lang === 'tr' ? 'Kullanıcıyı Şikayet Et' : 'Report User'}</h3>
                <p className="text-xs text-slate-500 mb-4">
                  {lang === 'tr' ? 'Bu kullanıcıyı neden şikayet ettiğinizin sebebini seçin.' : 'Select a reason why you are reporting this user.'}
                </p>
                <div className="flex flex-col gap-1.5 mb-4">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setReportReason(r.value)}
                      className={`text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        reportReason === r.value ? 'bg-astral-gold/15 text-astral-gold' : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      {lang === 'tr' ? r.tr : r.en}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder={lang === 'tr' ? 'Ek ayrıntı (opsiyonel)…' : 'Additional details (optional)…'}
                  rows={2}
                  className="w-full rounded-lg bg-black/30 border border-white/10 text-sm text-white px-3 py-2 mb-4 resize-none focus:outline-none focus:border-astral-gold/50"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReportSheet(false)}
                    className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                  >
                    {lang === 'tr' ? 'Vazgeç' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitReport}
                    disabled={!reportReason || submittingReport}
                    className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-astral-gold text-void-950 hover:brightness-110 disabled:opacity-40 transition-all"
                  >
                    {lang === 'tr' ? 'Gönder' : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
