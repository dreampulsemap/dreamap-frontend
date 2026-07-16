import { useEffect, useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/router'
import { getTranslation } from '@/lib/translations'
import { supabase } from '@/lib/supabase'
import { tAddDream } from '@/lib/addDreamTranslations'
import { ARCHETYPE_LOCALIZATIONS } from '@/lib/archetypeTranslations'
import { getDreamCardText } from '@/lib/dreamCardTranslations'
import DreamAnalysisView from '@/components/DreamAnalysisView'
import DeepAnalysisConfirmationModal from '@/components/DeepAnalysisConfirmationModal'
import DeepAnalysisCarouselModal from '@/components/DeepAnalysisCarouselModal'
import StoryModeModal from '@/components/StoryModeModal'

const GUMROAD_PRODUCT_URL = 'https://shop.lunosfer.com'

export default function DreamCard({
  dream,
  lang,
  onTranslate,
  translating,
  translated,
  translatedContent,
  translatedAnalysis,
}) {
  const { i18n } = useTranslation()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const currentLang = useMemo(() => {
    const rawLang = lang || (mounted ? (i18n?.language || 'en') : 'en')
    return String(rawLang).toLowerCase().split('-')[0]
  }, [lang, i18n, mounted])

  const t = getDreamCardText(currentLang)

  const [user, setUser] = useState(null)
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(dream.likes_count || 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentsCount, setCommentsCount] = useState(dream.comments_count || 0)
  const [commentsLoading, setCommentsLoading] = useState(false)
  
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showStoryMode, setShowStoryMode] = useState(false)

  const [premiumAuras, setPremiumAuras] = useState(0)
  const [premiumGenerating, setPremiumGenerating] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [premiumError, setPremiumError] = useState('')
  const [premiumAnalysis, setPremiumAnalysis] = useState(dream?.premium_deep_analysis || null)
  const [analysisOverride, setAnalysisOverride] = useState(null)
  const [retryingAnalysis, setRetryingAnalysis] = useState(false)
  const [retryError, setRetryError] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)

  const effectiveDream = useMemo(() => (analysisOverride ? { ...dream, ...analysisOverride } : dream), [dream, analysisOverride])
  const isOwner = useMemo(() => user?.id && dream?.user_id && user.id === dream.user_id, [user, dream])

  const triggerToast = (msg) => { setToastMessage(msg); setShowToast(true); setTimeout(() => setShowToast(false), 2800) }

  const translateArchetype = useCallback((arch) => {
    if (!arch) return ''
    const localized = ARCHETYPE_LOCALIZATIONS[currentLang]?.[String(arch).trim()]
    return localized || arch
  }, [currentLang])

  const translateEmotion = useCallback((sentiment) => {
    if (!sentiment) return ''
    const emotionKey = `emotion.${String(sentiment).toLowerCase()}`
    const localized = tAddDream(emotionKey, currentLang)
    return localized && localized !== emotionKey ? localized : sentiment
  }, [currentLang])

  useEffect(() => {
    if (!mounted) return
    setLikesCount(dream.likes_count || 0)
    setCommentsCount(dream.comments_count || 0)
    setComments([])
    setShowComments(false)
    setShowAnalysisModal(false)
    setShowConfirmModal(false)
    setShowStoryMode(false)
    setPremiumGenerating(false)
    setGeneratingImage(false)
    setPremiumError('')
    setPremiumAnalysis(dream?.premium_deep_analysis || null)
    setAnalysisOverride(null)
    setRetryError('')
  }, [dream.id, dream.likes_count, dream.comments_count, dream?.premium_deep_analysis, mounted])

  useEffect(() => {
    if (!mounted) return
    let active = true
    async function checkUser() {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!active) return
      setUser(currentUser || null)
      if (currentUser?.id) {
        const { data: profile } = await supabase.from('user_profiles').select('premium_analysis_auras').eq('id', currentUser.id).maybeSingle()
        setPremiumAuras(Number(profile?.premium_analysis_auras || 0))
      }
    }
    checkUser()
    return () => { active = false }
  }, [dream.id, mounted])

  const hasTeaserAnalysis = useMemo(() => {
    return !!(effectiveDream?.ai_summary || effectiveDream?.ai_summary_en || effectiveDream?.ai_summary_tr)
  }, [effectiveDream])

  async function handleGenerateImageOnly() {
    setPremiumError('')
    setGeneratingImage(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/generate-dream-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ dreamId: dream.id }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.details || data?.error || 'Failed to generate image.')
      
      setAnalysisOverride({ ...effectiveDream, ai_image_url: data.imageUrl })
      setPremiumAuras(data.aurasLeft)
      triggerToast(isOwner ? t.imageSuccess : t.imageGiftSuccess)
    } catch (err) {
      setPremiumError(err.message)
    } finally {
      setGeneratingImage(false)
    }
  }

  return (
    <>
      <article className="glass-card hover-lift overflow-hidden">
        {effectiveDream.ai_image_url && (
          <div className="dream-image relative h-64 w-full overflow-hidden bg-black">
            <img src={effectiveDream.ai_image_url} alt="Dream" className="h-full w-full object-cover animate-fade-in" onError={(e) => e.currentTarget.style.display = 'none'} />
          </div>
        )}

        <div className="p-6 sm:p-7">
          <p className="mb-6 whitespace-pre-wrap text-base leading-8 text-white/90">{translated ? translatedContent : dream.content}</p>

          <button
            type="button"
            onClick={handleGenerateImageOnly}
            disabled={generatingImage}
            className="energy-button mb-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/18 bg-cyan-500/10 px-4 py-3.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/18 disabled:opacity-50 shadow-[0_0_20px_rgba(6,182,212,0.15)] animate-pulse"
          >
            <span>{generatingImage ? '⏳' : '🌌'}</span>
            <span>{generatingImage ? (lang==='tr' ? 'Üretiliyor...' : 'Generating...') : (lang==='tr' ? 'Görseli Canlandır · 2 Aura' : 'Illuminate Artwork · 2 Auras')}</span>
          </button>

          {premiumError && <p className="mb-5 -mt-2 text-xs leading-6 text-rose-400 font-bold" role="alert">⚠️ {premiumError}</p>}
        </div>
      </article>

      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[250] pointer-events-none animate-pulse">
          <div className="rounded-full border border-fuchsia-300/30 bg-fuchsia-950/90 px-6 py-3 text-sm font-medium text-fuchsia-100 shadow-[0_0_30px_rgba(240,73,214,0.3)] backdrop-blur-md">
            {toastMessage}
          </div>
        </div>
      )}
    </>
  )
}