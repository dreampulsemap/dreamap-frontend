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
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)

  const effectiveDream = useMemo(() => (analysisOverride ? { ...dream, ...analysisOverride } : dream), [dream, analysisOverride])
  const isOwner = useMemo(() => user?.id && effectiveDream?.user_id && user.id === effectiveDream.user_id, [user, effectiveDream])

  const triggerToast = (msg) => { setToastMessage(msg); setShowToast(true); setTimeout(() => setShowToast(false), 2800) }

  // ... (translateArchetype ve diğer yardımcı fonksiyonlar aynı kalacak) ...

  const handlePremiumButtonClick = async () => {
    setPremiumError('');
    if (!user) { router.push('/auth'); return; }
    if (premiumAnalysis) { setShowAnalysisModal(true); return; }
    setShowConfirmModal(true);
  }

  // --- DERİN ANALİZ VE GÖRSEL ÜRETİMİ (HEPSİ TEK BİR BUTONDA) ---
  async function handlePremiumAnalysisExecute() {
    setShowConfirmModal(false)
    setPremiumGenerating(true)
    setPremiumError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/generate-deep-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ dreamId: dream.id, lang: currentLang }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || t.errGeneric);

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
      <article className="glass-card p-6 sm:p-7">
        {/* RÜYA GÖRSELİ */}
        {effectiveDream.ai_image_url && (
            <div className="mb-6 rounded-2xl overflow-hidden">
                <img src={effectiveDream.ai_image_url} className="w-full h-auto" />
            </div>
        )}

        <p className="mb-6">{translated ? translatedContent : dream.content}</p>

        {/* 1. DERİN ANALİZ BUTONU */}
        <button
            onClick={handlePremiumButtonClick}
            disabled={premiumGenerating}
            className="w-full bg-fuchsia-600 p-4 rounded-xl text-white font-bold mb-3"
        >
            {premiumAnalysis ? t.exploreCards : t.getDeepAnalysis}
        </button>

        {/* 2. SADECE GÖRSEL BUTONU (Eğer görsel yoksa) */}
        {!premiumAnalysis && !effectiveDream.ai_image_url && (
            <button
                onClick={handleGenerateImageOnly} // Yukarıdaki handleGenerateImageOnly fonksiyonu buraya gelecek
                className="w-full bg-cyan-600 p-4 rounded-xl text-white font-bold mb-3"
            >
                {t.generateImage}
            </button>
        )}
        
        {premiumError && <p className="text-red-500 text-xs mb-4">{premiumError}</p>}
      </article>

      {/* MODALLER */}
      <DeepAnalysisCarouselModal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        premiumAnalysis={premiumAnalysis || effectiveDream?.premium_deep_analysis}
        lang={currentLang}
        dreamTitle={dream.ai_title}
        dreamImage={effectiveDream.ai_image_url}
        dreamId={dream.id}
      />
      <DeepAnalysisConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        auras={premiumAuras}
        onConfirm={handlePremiumAnalysisExecute}
        lang={currentLang}
        gumroadUrl={GUMROAD_PRODUCT_URL}
        isGift={!isOwner}
      />
    </>
  )
}