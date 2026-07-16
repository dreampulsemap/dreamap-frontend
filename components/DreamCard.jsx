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
  const [premiumAuras, setPremiumAuras] = useState(0)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showStoryMode, setShowStoryMode] = useState(false)
  const [premiumAnalysis, setPremiumAnalysis] = useState(dream?.premium_deep_analysis || null)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [premiumError, setPremiumError] = useState('')
  const [analysisOverride, setAnalysisOverride] = useState(null)

  const effectiveDream = useMemo(() => (analysisOverride ? { ...dream, ...analysisOverride } : dream), [dream, analysisOverride])
  const isOwner = useMemo(() => user?.id && effectiveDream?.user_id && user.id === effectiveDream.user_id, [user, effectiveDream])

  useEffect(() => {
    let active = true
    async function checkUser() {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!active || !currentUser) return
      setUser(currentUser)
      const { data: profile } = await supabase.from('user_profiles').select('premium_analysis_auras').eq('id', currentUser.id).maybeSingle()
      setPremiumAuras(Number(profile?.premium_analysis_auras || 0))
    }
    checkUser()
    return () => { active = false }
  }, [dream.id])

  async function handlePremiumAnalysisExecute() {
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
      setPremiumAuras(prev => Math.max(0, prev - 8))
      setShowAnalysisModal(true)
    } catch (err) {
      setPremiumError(err.message)
    }
  }

  async function handleGenerateImageOnly() {
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
    } catch (err) {
      setPremiumError(err.message)
    } finally {
      setGeneratingImage(false)
    }
  }

  return (
    <>
      <article className="glass-card p-6 rounded-3xl border border-white/10 bg-slate-900/40">
        {effectiveDream.ai_image_url && (
            <div className="mb-6 rounded-2xl overflow-hidden">
                <img src={effectiveDream.ai_image_url} className="w-full h-auto" />
            </div>
        )}
        <p className="mb-6 text-white/90">{translated ? translatedContent : dream.content}</p>
        
        <button onClick={() => premiumAnalysis ? setShowAnalysisModal(true) : setShowConfirmModal(true)} className="w-full bg-fuchsia-600 p-4 rounded-xl text-white font-bold mb-3 hover:bg-fuchsia-500 transition">
            {premiumAnalysis ? t.exploreCards : (isOwner ? t.getDeepAnalysis : t.giftDeepAnalysis)}
        </button>

        {!premiumAnalysis && !effectiveDream.ai_image_url && (
            <button onClick={handleGenerateImageOnly} disabled={generatingImage} className="w-full bg-cyan-600 p-4 rounded-xl text-white font-bold mb-3 hover:bg-cyan-500 transition">
                {generatingImage ? t.generatingImage : (isOwner ? t.generateImage : t.giftDreamImage)}
            </button>
        )}
        {premiumError && <p className="text-red-500 text-xs mb-4">{premiumError}</p>}
      </article>

      {/* Modaller */}
      <DeepAnalysisConfirmationModal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} auras={premiumAuras} onConfirm={handlePremiumAnalysisExecute} lang={currentLang} gumroadUrl={GUMROAD_PRODUCT_URL} isGift={!isOwner} />
      {showAnalysisModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setShowAnalysisModal(false)}>
           <DeepAnalysisCarouselModal isOpen={showAnalysisModal} onClose={() => setShowAnalysisModal(false)} premiumAnalysis={premiumAnalysis || effectiveDream?.premium_deep_analysis} lang={currentLang} dreamTitle={dream.ai_title} dreamImage={effectiveDream.ai_image_url} dreamId={dream.id} onGenerateImageOnly={handleGenerateImageOnly} generatingImage={generatingImage} premiumError={premiumError} />
        </div>
      )}
    </>
  )
}