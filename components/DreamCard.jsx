import { useEffect, useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/router'
import { getTranslation } from '@/lib/translations'
import { supabase } from '@/lib/supabase'
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
  const [premiumAuras, setPremiumAuras] = useState(0)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showStoryMode, setShowStoryMode] = useState(false)
  const [premiumAnalysis, setPremiumAnalysis] = useState(dream?.premium_deep_analysis || null)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [premiumError, setPremiumError] = useState('')
  const [analysisOverride, setAnalysisOverride] = useState(null)
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)

  const effectiveDream = useMemo(() => (analysisOverride ? { ...dream, ...analysisOverride } : dream), [dream, analysisOverride])
  const isOwner = useMemo(() => user?.id && effectiveDream?.user_id && user.id === effectiveDream.user_id, [user, effectiveDream])

  // --- FONKSİYONLAR ---
  const triggerToast = (msg) => { setToastMessage(msg); setShowToast(true); setTimeout(() => setShowToast(false), 2800) }

  const handleGenerateImageOnly = async () => {
    setPremiumError('')
    setGeneratingImage(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/generate-dream-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ dreamId: dream.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.details || 'Hata')
      setAnalysisOverride({ ...effectiveDream, ai_image_url: data.imageUrl })
      setPremiumAuras(data.aurasLeft)
      triggerToast(t.imageSuccess)
    } catch (err) {
      setPremiumError(err.message)
    } finally {
      setGeneratingImage(false)
    }
  }

  const handlePremiumAnalysisExecute = async () => {
    setShowConfirmModal(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/generate-deep-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ dreamId: dream.id, lang: currentLang }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPremiumAnalysis(data.analysis)
      setAnalysisOverride({ ...effectiveDream, ai_image_url: data.imageUrl })
      setShowAnalysisModal(true)
    } catch (err) {
      setPremiumError(err.message)
    }
  }

  return (
    <div className="glass-card p-6">
      {effectiveDream.ai_image_url && <img src={effectiveDream.ai_image_url} className="rounded-xl mb-4" />}
      <p className="mb-4 text-white/90">{translated ? translatedContent : dream.content}</p>
      
      {/* BUTONLAR */}
      <button onClick={() => premiumAnalysis ? setShowAnalysisModal(true) : setShowConfirmModal(true)} className="w-full p-4 bg-fuchsia-600 rounded-xl mb-2 text-white font-bold">
        {premiumAnalysis ? t.exploreCards : t.getDeepAnalysis}
      </button>

      {!premiumAnalysis && !effectiveDream.ai_image_url && (
        <button onClick={handleGenerateImageOnly} disabled={generatingImage} className="w-full p-4 bg-cyan-600 rounded-xl text-white font-bold">
          {generatingImage ? t.generatingImage : t.generateImage}
        </button>
      )}

      {premiumError && <p className="text-red-400 text-xs mt-2">{premiumError}</p>}

      {/* MODALLER */}
      <DeepAnalysisConfirmationModal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} auras={premiumAuras} onConfirm={handlePremiumAnalysisExecute} lang={currentLang} gumroadUrl={GUMROAD_PRODUCT_URL} isGift={!isOwner} />
      <DeepAnalysisCarouselModal isOpen={showAnalysisModal} onClose={() => setShowAnalysisModal(false)} premiumAnalysis={premiumAnalysis || effectiveDream?.premium_deep_analysis} lang={currentLang} dreamTitle={dream.ai_title} dreamImage={effectiveDream.ai_image_url} dreamId={dream.id} onGenerateImageOnly={handleGenerateImageOnly} />
    </div>
  )
}