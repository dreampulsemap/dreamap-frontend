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

export default function DreamCard({ dream, lang, onTranslate, translating, translated, translatedContent, translatedAnalysis }) {
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
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)

  const effectiveDream = useMemo(() => (analysisOverride ? { ...dream, ...analysisOverride } : dream), [dream, analysisOverride])
  const isOwner = useMemo(() => user?.id && effectiveDream?.user_id && user.id === effectiveDream.user_id, [user, effectiveDream])

  useEffect(() => {
    let active = true
    const loadUserAndAuras = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!active) return
      setUser(currentUser)
      if (currentUser) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('premium_analysis_auras')
          .eq('id', currentUser.id)
          .single()
        if (active && profile) setPremiumAuras(profile.premium_analysis_auras || 0)
      }
    }
    loadUserAndAuras()
    return () => { active = false }
  }, [])

  const triggerToast = (msg) => { setToastMessage(msg); setShowToast(true); setTimeout(() => setShowToast(false), 2800) }

  const translateArchetype = useCallback((arch) => {
    const cleanArch = String(arch).trim()
    return ARCHETYPE_LOCALIZATIONS[currentLang]?.[cleanArch] || cleanArch
  }, [currentLang])

  const translateEmotion = useCallback((sentiment) => {
    const emotionKey = `emotion.${String(sentiment).toLowerCase()}`
    const localized = tAddDream(emotionKey, currentLang)
    return localized && localized !== emotionKey ? localized : sentiment
  }, [currentLang])

  const handleGenerateImageOnly = async () => {
    setPremiumError('')
    setGeneratingImage(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(t.loginRequired || 'Please log in to continue')
      const res = await fetch('/api/generate-dream-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ dreamId: dream.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.details || data.error || 'Failed to generate')
      setAnalysisOverride({ ...effectiveDream, ai_image_url: data.imageUrl })
      setPremiumAuras(data.aurasLeft)
      triggerToast(isOwner ? t.imageSuccess : t.imageGiftSuccess)
    } catch (err) {
      setPremiumError(err.message)
    } finally {
      setGeneratingImage(false)
    }
  }

  const handlePremiumAnalysisExecute = async () => {
    setShowConfirmModal(false)
    setPremiumGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(t.loginRequired || 'Please log in to continue')
      const res = await fetch('/api/generate-deep-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ dreamId: dream.id, lang: currentLang }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setPremiumAnalysis(data.analysis)
      setAnalysisOverride({ ...effectiveDream, ai_image_url: data.imageUrl })
      setPremiumAuras(data.aurasLeft)
      setShowAnalysisModal(true)
    } catch (err) {
      setPremiumError(err.message)
    } finally {
      setPremiumGenerating(false)
    }
  }

  return (
    <>
      <article className="glass-card p-6 rounded-3xl border border-white/10 bg-slate-900/40">
        {effectiveDream.ai_image_url && <img src={effectiveDream.ai_image_url} className="w-full rounded-2xl mb-4" />}
        <p className="mb-6">{translated ? translatedContent : dream.content}</p>
        
        <button onClick={() => premiumAnalysis ? setShowAnalysisModal(true) : setShowConfirmModal(true)} className="w-full bg-fuchsia-600 p-4 rounded-xl text-white font-bold mb-3">
          {premiumAnalysis ? t.exploreCards : (isOwner ? t.getDeepAnalysis : t.giftDeepAnalysis)}
        </button>

        {!premiumAnalysis && !effectiveDream.ai_image_url && (
            <button onClick={handleGenerateImageOnly} disabled={generatingImage} className="w-full bg-cyan-600 p-4 rounded-xl text-white font-bold mb-3 hover:bg-cyan-500 transition">
                {generatingImage ? t.generatingImage : (isOwner ? t.generateImage : t.giftDreamImage)}
            </button>
        )}
        {premiumError && <p className="text-red-500 text-xs mb-4">{premiumError}</p>}
      </article>

      {showConfirmModal && <DeepAnalysisConfirmationModal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} auras={premiumAuras} onConfirm={handlePremiumAnalysisExecute} lang={currentLang} gumroadUrl={GUMROAD_PRODUCT_URL} isGift={!isOwner} />}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setShowAnalysisModal(false)}>
           <DeepAnalysisCarouselModal isOpen={showAnalysisModal} onClose={() => setShowAnalysisModal(false)} premiumAnalysis={premiumAnalysis || effectiveDream?.premium_deep_analysis} lang={currentLang} dreamTitle={dream.ai_title} dreamContent={translated ? translatedContent : dream.content} dreamImage={effectiveDream.ai_image_url} dreamId={dream.id} onGenerateImageOnly={handleGenerateImageOnly} generatingImage={generatingImage} premiumError={premiumError} translateArchetype={translateArchetype} onOpenStoryMode={() => setShowStoryMode(true)} />
        </div>
      )}
      {showStoryMode && (
        <StoryModeModal
          isOpen={showStoryMode}
          onClose={() => setShowStoryMode(false)}
          dream={effectiveDream}
          premiumAnalysis={premiumAnalysis || effectiveDream?.premium_deep_analysis}
          lang={currentLang}
        />
      )}
    </>
  )
}