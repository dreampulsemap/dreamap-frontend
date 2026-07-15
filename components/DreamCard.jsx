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

function getAnalysisButtonLabel(lang) {
  const map = { tr: 'Rüya Analizini Aç', es: 'Abrir análisis', fr: 'Ouvrir l’analyse', de: 'Traumanalyse öffnen', pt: 'Abrir análise', ru: 'Открыть анализ', ja: '夢の分析を開く' }
  return map[lang] || 'Open Dream Analysis'
}

function getCloseLabel(lang) {
  return lang === 'tr' ? 'Kapat' : 'Close'
}

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

  useEffect(() => {
    setMounted(true)
  }, [])

  // Dil kodunu hydration tamamlanana kadar sabit 'en' tutar
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
  
  // Modaller
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showStoryMode, setShowStoryMode] = useState(false)

  // Bakiye, Görsel ve Analiz Durumları
  const [premiumAuras, setPremiumAuras] = useState(0)
  const [premiumGenerating, setPremiumGenerating] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [premiumError, setPremiumError] = useState('')
  const [premiumAnalysis, setPremiumAnalysis] = useState(
    dream?.premium_deep_analysis || null
  )

  // Onay modalının hangi modda açılacağını tutar ('analysis' veya 'image')
  const [confirmMode, setConfirmMode] = useState('analysis')

  const [analysisOverride, setAnalysisOverride] = useState(null)
  const [retryingAnalysis, setRetryingAnalysis] = useState(false)
  const [retryError, setRetryError] = useState('')

  // Toast
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)

  const effectiveDream = useMemo(
    () => (analysisOverride ? { ...dream, ...analysisOverride } : dream),
    [dream, analysisOverride]
  )

  // Rüyanın mülkiyet kontrolü
  const isOwner = useMemo(() => {
    return user?.id && dream?.user_id && user.id === dream.user_id
  }, [user, dream])

  const triggerToast = (msg) => {
    setToastMessage(msg)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 2800)
  }

  const translateArchetype = useCallback((arch) => {
    if (!arch) return ''
    const cleanArch = String(arch).trim()
    const localized = ARCHETYPE_LOCALIZATIONS[currentLang]?.[cleanArch]
    return localized || cleanArch
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
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!active) return
        setUser(currentUser || null)

        if (currentUser?.id) {
          const [likesRes, creditsRes] = await Promise.all([
            fetch(`/api/like?dreamId=${encodeURIComponent(dream.id)}&userId=${encodeURIComponent(currentUser.id)}`),
            supabase.from('user_profiles').select('premium_analysis_auras').eq('id', currentUser.id).maybeSingle()
          ])
          
          if (!active) return
          const likeData = await likesRes.json().catch(() => ({}))
          setLiked(Boolean(likeData?.liked))
          setPremiumAuras(Number(creditsRes?.data?.premium_analysis_auras || 0))
        }
      } catch (err) {
        console.error('User check error:', err)
      }
    }
    checkUser()

    const { data: authSubscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return
      if (session?.user) {
        setUser(session.user)
        const { data: profile } = await supabase.from('user_profiles').select('premium_analysis_auras').eq('id', session.user.id).maybeSingle()
        setPremiumAuras(Number(profile?.premium_analysis_auras || 0))
      } else {
        setUser(null)
        setPremiumAuras(0)
      }
    })

    return () => {
      active = false
      authSubscription?.subscription?.unsubscribe()
    }
  }, [dream.id, mounted])

  const teaserAnalysis = useMemo(() => {
    if (effectiveDream?.ai_jungian_analysis && Object.keys(effectiveDream.ai_jungian_analysis).length > 0) {
      return effectiveDream.ai_jungian_analysis
    }

    if (effectiveDream?.ai_summary || effectiveDream?.ai_summary_en || effectiveDream?.ai_summary_tr) {
      return {
        title: {
          en: effectiveDream?.ai_title_en || effectiveDream?.ai_title || '',
          tr: effectiveDream?.ai_title_tr || effectiveDream?.ai_title || '',
        },
        summary: {
          en: effectiveDream?.ai_summary_en || effectiveDream?.ai_summary || '',
          tr: effectiveDream?.ai_summary_tr || effectiveDream?.ai_summary || '',
        },
        motiv: {
          en: effectiveDream?.ai_motiv_en || effectiveDream?.ai_motiv || '',
          tr: effectiveDream?.ai_motiv_tr || effectiveDream?.ai_motiv || '',
        },
        sentiment: effectiveDream?.ai_sentiment || null,
        archetypes: Array.isArray(effectiveDream?.ai_archetypes) ? effectiveDream.ai_archetypes : [],
        teaser: true,
      }
    }

    return null
  }, [effectiveDream])

  const getDreamAnalysis = useCallback(() => {
    if (translated && translatedAnalysis) {
      return translatedAnalysis
    }

    return (
      effectiveDream[`ai_summary_${currentLang}`] ||
      teaserAnalysis?.summary?.[currentLang] ||
      effectiveDream.ai_summary ||
      effectiveDream.ai_summary_en ||
      teaserAnalysis?.summary?.en ||
      ''
    )
  }, [effectiveDream, currentLang, translated, translatedAnalysis, teaserAnalysis])

  const getDreamMotiv = useCallback(() => {
    return (
      effectiveDream[`ai_motiv_${currentLang}`] ||
      teaserAnalysis?.motiv?.[currentLang] ||
      effectiveDream.ai_motiv ||
      effectiveDream.ai_motiv_en ||
      teaserAnalysis?.motiv?.en ||
      ''
    )
  }, [effectiveDream, currentLang, teaserAnalysis])

  const getDreamTitle = useCallback(() => {
    return (
      effectiveDream[`ai_title_${currentLang}`] ||
      teaserAnalysis?.title?.[currentLang] ||
      effectiveDream.ai_title ||
      effectiveDream.ai_title_en ||
      teaserAnalysis?.title?.en ||
      ''
    )
  }, [effectiveDream, currentLang, teaserAnalysis])

  const hasTeaserAnalysis = useMemo(() => {
    return Boolean(teaserAnalysis && (getDreamAnalysis() || getDreamMotiv() || getDreamTitle()))
  }, [teaserAnalysis, getDreamAnalysis, getDreamMotiv, getDreamTitle])

  // ONARILAN DEĞİŞKEN TANIMI
  const analysisStatus = effectiveDream?.analysis_status || null
  const isAnalysisProcessing = !hasTeaserAnalysis && (analysisStatus === 'processing')
  const isAnalysisFailed = !hasTeaserAnalysis && !isAnalysisProcessing && (analysisStatus === 'failed' || !analysisStatus)

  const dreamImage = useMemo(() => effectiveDream.ai_image_url || null, [effectiveDream])
  const dreamMotiv = useMemo(() => getDreamMotiv(), [getDreamMotiv])
  const dreamTitle = useMemo(() => getDreamTitle(), [getDreamTitle])

  // Beğeni Yönetim Fonksiyonu
  const handleLike = async () => {
    if (!user?.id) {
      alert(getTranslation('social.loginToLike', currentLang))
      return
    }
    const method = liked ? 'DELETE' : 'POST'
    try {
      const res = await fetch('/api/like', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dreamId: dream.id, userId: user.id }),
      })

      if (!res.ok) throw new Error('Like request failed')
      const data = await res.json()

      setLiked((prevLiked) => {
        const nextLiked = !prevLiked
        setLikesCount((prevCount) =>
          data.count !== undefined ? data.count : nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1)
        )
        return nextLiked
      })
    } catch (err) {
      console.error('Like error:', err)
    }
  }

  // Derin Rüya Analizini/Hediyesini Tetikleme
  async function handlePremiumAnalysisExecute() {
    setShowConfirmModal(false)
    setPremiumGenerating(true)
    setPremiumError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setPremiumError(getPremiumErrorMessage(currentLang, 'unauthorized'))
        return
      }

      const res = await fetch('/api/generate-deep-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          dreamId: dream.id,
          lang: currentLang,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        if (data?.error === 'no_credits' || data?.error === 'no_auras') {
          setPremiumError(getPremiumErrorMessage(currentLang, 'no_auras'))
          setPremiumAuras(0)
          return
        }
        setPremiumError(getPremiumErrorMessage(currentLang, 'generic'))
        return
      }

      if (data?.analysis) {
        setPremiumAnalysis(data.analysis)
        if (!isOwner) {
          triggerToast(t.analysisGiftSuccess)
        } else {
          setShowAnalysisModal(true)
        }
      }

      if (typeof data?.aurasLeft === 'number') {
        setPremiumAuras(data.aurasLeft)
      } else {
        setPremiumAuras((prev) => Math.max(0, prev - 8))
      }
    } catch (err) {
      console.error('Premium analysis error:', err)
      setPremiumError(getPremiumErrorMessage(currentLang, 'generic'))
    } finally {
      setPremiumGenerating(false)
    }
  }

  // Sadece Rüya Görseli Üretme/Hediye Etme (Bağımsız 2 Aura Tetikleyicisi)
  const handleGenerateImageOnly = async () => {
    setPremiumError('')

    try {
      const { data: { user: verifiedUser } } = await supabase.auth.getUser()
      if (!verifiedUser?.id) {
        setUser(null)
        setPremiumError(getPremiumErrorMessage(currentLang, 'login_required'))
        router.push('/auth')
        return
      }

      setUser(verifiedUser)

      if (premiumAuras < 2) {
        setPremiumError(getPremiumErrorMessage(currentLang, 'no_auras'))
        return
      }

      setGeneratingImage(true)

      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setPremiumError(getPremiumErrorMessage(currentLang, 'unauthorized'))
        return
      }

      const res = await fetch('/api/generate-dream-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          dreamId: dream.id,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setPremiumError(t.imageFail)
        return
      }

      if (data?.imageUrl) {
        triggerToast(isOwner ? t.imageSuccess : t.imageGiftSuccess)
        setAnalysisOverride({ ...effectiveDream, ai_image_url: data.imageUrl })
      }

      if (typeof data?.aurasLeft === 'number') {
        setPremiumAuras(data.aurasLeft)
      } else {
        setPremiumAuras((prev) => Math.max(0, prev - 2))
      }
    } catch (err) {
      console.error('Image only generation error:', err)
      setPremiumError(getPremiumErrorMessage(currentLang, 'generic'))
    } finally {
      setGeneratingImage(false)
    }
  }

  // Butona tıklandığında bakiye durumuna göre Onay Modalı veya Gumroad açar
  async function handlePremiumButtonClick() {
    setPremiumError('')

    try {
      const { data: { user: verifiedUser } } = await supabase.auth.getUser()

      if (!verifiedUser?.id) {
        setUser(null)
        setPremiumError(getPremiumErrorMessage(currentLang, 'login_required'))
        router.push('/auth')
        return
      }

      setUser(verifiedUser)

      if (premiumAnalysis) {
        setShowAnalysisModal(true)
        return
      }

      // Analiz onay modunda modalı aç
      setConfirmMode('analysis')
      setShowConfirmModal(true)
    } catch (err) {
      console.error('User verification check failed:', err)
      setPremiumError(getPremiumErrorMessage(currentLang, 'generic'))
    }
  }

  // Görsel canlandırma onay ekranını açar (Sınırsız mobil webview uyumluluğu için modal eklendi!)
  const handleGenerateImageOnlyClick = async () => {
    setPremiumError('')
    try {
      const { data: { user: verifiedUser } } = await supabase.auth.getUser()
      if (!verifiedUser?.id) {
        setUser(null)
        setPremiumError(getPremiumErrorMessage(currentLang, 'login_required'))
        router.push('/auth')
        return
      }
      setUser(verifiedUser)
      
      // Görsel canlandırma modunda onay modalını tetikle ( confirmMode: 'image' )
      setConfirmMode('image')
      setShowConfirmModal(true)
    } catch (err) {
      console.error(err)
    }
  }

  // Lunosfer Sohbet Çemberi Paylaşımı
  const handleLunosferShare = async () => {
    if (!user?.id) {
      alert(getTranslation('social.loginToComment', currentLang))
      return
    }

    try {
      const shareMsg = t.lunosferShareMsg

      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamId: dream.id,
          userId: user.id,
          content: shareMsg,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setComments((prev) => [data.comment, ...prev])
        setCommentsCount((prev) => prev + 1)
        triggerToast(t.lunosferSuccess)
      } else {
        throw new Error('Sohbet paylaşımı başarısız')
      }
    } catch (err) {
      console.error('Lunosfer share error:', err)
      triggerToast(t.toastCopied)
    }
  }

  // Sosyal Medya & Instagram Paylaşım Fonksiyonu (Web Share API & Clipboard Fallback)
  const handleShareOnSocial = async () => {
    const dreamUrl = typeof window !== 'undefined' ? `${window.location.origin}/dreams/${dream.id}` : ''
    const shareText = t.shareText.replace('{url}', dreamUrl)

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Lunosfer Rüya Analizim 🔮',
          text: shareText,
          url: dreamUrl
        })
      } catch (err) {
        console.error('Native sharing failed:', err)
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText)
        triggerToast(t.toastCopied)
      } catch (err) {
        console.error('Clipboard copy failed:', err)
        alert('Bağlantı: ' + dreamUrl)
      }
    }
  }

  // Instagram Özel Paylaşım
  const handleInstagramShare = async () => {
    const dreamUrl = typeof window !== 'undefined' ? `${window.location.origin}/dreams/${dream.id}` : ''
    const shareText = t.shareText.replace('{url}', dreamUrl)

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Lunosfer Rüya Analizim 📸',
          text: shareText,
          url: dreamUrl
        })
        return
      } catch (err) {
        console.error('Native IG share failed:', err)
      }
    }

    try {
      await navigator.clipboard.writeText(shareText)
      triggerToast(t.toastInstagram)
    } catch (err) {
      console.error('IG copy failed:', err)
    }
  }

  const displayContent = translated ? translatedContent : dream.content
  const displayAnalysis = getDreamAnalysis()

  const sentimentLabel = dream.user_selected_sentiment
    ? translateEmotion(dream.user_selected_sentiment)
    : null

  return (
    <>
      <article className="glass-card hover-lift overflow-hidden">
        {dreamImage && (
          <div className="dream-image relative h-64 w-full overflow-hidden bg-black">
            <img
              src={dreamImage}
              alt="Dream"
              className="h-full w-full object-cover animate-fade-in"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-orange-100">
              <span className="signal-dot heat" />
              Rare Signal
            </div>
          </div>
        )}

        <div className="p-6 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {Array.isArray(effectiveDream.ai_archetypes) && effectiveDream.ai_archetypes.length > 0 ? (
              effectiveDream.ai_archetypes.map((arch, i) => (
                <span
                  key={`${dream.id}-arch-${i}`}
                  className="rounded-full border border-violet-300/18 bg-violet-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-violet-100"
                >
                  {translateArchetype(arch)}
                </span>
              ))
            ) : Array.isArray(teaserAnalysis?.archetypes) && teaserAnalysis.archetypes.length > 0 ? (
              teaserAnalysis.archetypes.map((arch, i) => (
                <span
                  key={`${dream.id}-teaser-arch-${i}`}
                  className="rounded-full border border-violet-300/18 bg-violet-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-violet-100"
                >
                  {translateArchetype(arch)}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-cyan-300/16 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-cyan-100">
                {currentLang === 'tr' ? 'Rüya Parçası' : 'Dream Fragment'}
              </span>
            )}
          </div>

          <p className="mb-6 whitespace-pre-wrap text-base leading-8 text-white/90 sm:text-lg">
            {displayContent || ''}
          </p>

          {dream.original_language !== currentLang && dream.content && (
            <button
              onClick={() => onTranslate?.(dream)}
              disabled={translating}
              className="energy-button mb-5 inline-flex w-full items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100 hover:bg-cyan-500/18 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {translating ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
                  {currentLang === 'tr' ? 'Çevriliyor...' : 'Translating...'}
                </span>
              ) : translated ? (
                currentLang === 'tr' ? 'Orijinali Göster' : 'Show original'
              ) : (
                `${currentLang.toUpperCase()} ${currentLang === 'tr' ? 'diline çevir' : 'translate'}`
              )}
            </button>
          )}

          {/* Sadece derin rüya analizi bulunmuyorsa Teaser yorum butonu gösterilir */}
          {hasTeaserAnalysis && !premiumAnalysis && (
            <div className="mb-5 rounded-[1.5rem] border border-violet-300/18 bg-violet-500/8 p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg text-violet-200">🜂</span>
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-100">
                  {getTranslation('feed.jungianAnalysis', currentLang)}
                </span>
              </div>

              {dreamTitle ? (
                <h3 className="mb-3 text-base font-semibold leading-7 text-violet-50 sm:text-lg">
                  {dreamTitle}
                </h3>
              ) : null}

              <p className="text-sm leading-7 text-white/82">{displayAnalysis}</p>

              {dreamMotiv && (
                <div className="mt-4 border-t border-violet-300/14 pt-3">
                  <p className="text-xs italic text-violet-100/78">💫 {dreamMotiv}</p>
                </div>
              )}
            </div>
          )}

          {isAnalysisProcessing && (
            <div className="mb-5 flex items-center gap-3 rounded-[1.5rem] border border-cyan-300/18 bg-cyan-500/8 p-4 sm:p-5">
              <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-cyan-200 border-t-transparent" />
              <p className="text-sm leading-6 text-cyan-100/90 font-sans">{getAnalysisProcessingLabel(currentLang)}</p>
            </div>
          )}

          {isAnalysisFailed && (
            <div className="mb-5 rounded-[1.5rem] border border-white/12 bg-white/4 p-4 sm:p-5">
              <p className="mb-3 text-sm leading-6 text-white/70">{getAnalysisFailedLabel(currentLang)}</p>
              <button
                type="button"
                onClick={handleRetryAnalysis}
                disabled={retryingAnalysis}
                className="energy-button inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/18 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100 hover:bg-cyan-500/18 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {retryingAnalysis && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-200 border-t-transparent" />
                )}
                <span>{getRetryAnalysisLabel(currentLang, retryingAnalysis)}</span>
              </button>
              {retryError ? (
                <p className="mt-2 text-xs leading-5 text-rose-200/90">{retryError}</p>
              ) : null}
            </div>
          )}

          {/* Derin Rüya Analizini Başlat/Aç Butonu */}
          <button
            type="button"
            onClick={handlePremiumButtonClick}
            disabled={premiumGenerating}
            className="energy-button mb-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/18 bg-fuchsia-500/10 px-4 py-3.5 text-sm font-semibold text-fuchsia-100 hover:bg-fuchsia-500/18 disabled:cursor-not-allowed disabled:opacity-60 shadow-[0_0_20px_rgba(240,73,214,0.15)]"
          >
            <span>{premiumGenerating ? '⏳' : '✦'}</span>
            <span>
              {premiumAnalysis 
                ? t.exploreCards
                : (isOwner ? t.getDeepAnalysis : t.giftDeepAnalysis)
              }
            </span>
          </button>

          {/* Sadece Rüya Görseli Üretme/Hediye Etme Butonu (Geliştirilmiş Onay Tetikleyicili) */}
          {!premiumAnalysis && !dreamImage && (
            <button
              type="button"
              onClick={handleGenerateImageOnlyClick} // window.confirm yerine artık güvenli onay modalını tetikliyor!
              disabled={generatingImage}
              className="energy-button mb-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/18 bg-cyan-500/10 px-4 py-3.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/18 disabled:cursor-not-allowed disabled:opacity-60 shadow-[0_0_20px_rgba(6,182,212,0.15)] animate-pulse"
            >
              <span>{generatingImage ? '⏳' : '🌌'}</span>
              <span>
                {generatingImage 
                  ? (isOwner ? t.generatingImage : t.giftingImage)
                  : (isOwner ? t.generateImage : t.giftDreamImage)
                }
              </span>
            </button>
          )}

          {premiumError ? (
            <p className="mb-5 -mt-2 text-sm leading-6 text-rose-200/90" role="alert">
              {premiumError}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <button
              onClick={handleLike}
              className={`energy-button inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm transition-all ${liked ? 'border border-red-400/20 bg-red-500/16 text-red-200' : 'border border-white/10 bg-white/5 text-white/80 hover:bg-red-500/10'}`}
            >
              <span>{liked ? '❤️' : '🤍'}</span>
              <span>{likesCount}</span>
            </button>

            <button
              onClick={() => {
                const nextValue = !showComments
                setShowComments(nextValue)
                if (nextValue && comments.length === 0) {
                  loadComments()
                }
              }}
              className="energy-button inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 hover:bg-cyan-500/10"
            >
              <span>💬</span>
              <span>{commentsCount}</span>
            </button>

            {/* Mükerrerliği önlemek adına; rüya analiz kartları varsa sadece premium carousel açılır, yoksa teaser açılır */}
            {hasTeaserAnalysis && !premiumAnalysis && (
              <button
                type="button"
                onClick={() => {
                  setShowAnalysisModal(true)
                }}
                className="energy-button inline-flex items-center gap-2 rounded-2xl border border-violet-300/18 bg-violet-500/10 px-4 py-2.5 text-sm text-violet-100 hover:bg-violet-500/18"
              >
                <span>🜂</span>
                <span>{getAnalysisButtonLabel(currentLang)}</span>
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-sm text-white/58">
            {dream.dream_date && (
              <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1">
                {dream.dream_date}
              </span>
            )}
            {dream.location_name && (
              <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1">
                {dream.location_name}
              </span>
            )}
            {dream.original_language && (
              <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1">
                {String(dream.original_language).toUpperCase()}
              </span>
            )}
            {sentimentLabel && (
              <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1">
                {sentimentLabel}
              </span>
            )}
          </div>

          {showComments && (
            <div className="mt-5 border-t border-white/10 pt-5">
              {user && (
                <div className="mb-4 flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddComment()
                      }
                    }}
                    placeholder={getTranslation('social.addComment', currentLang)}
                    className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-violet-400/30 focus:outline-none"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="energy-button rounded-2xl border border-violet-300/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100 hover:bg-violet-500/18 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {getTranslation('social.send', currentLang)}
                  </button>
                </div>
              )}

              {commentsLoading ? (
                <p className="py-4 text-center text-sm text-white/40">
                  {currentLang === 'tr' ? 'Yorumlar yükleniyor...' : 'Loading comments...'}
                </p>
              ) : comments.length === 0 ? (
                <p className="py-4 text-center text-sm text-white/40">
                  {getTranslation('social.noComments', currentLang)}
                </p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-[1.35rem] border border-white/10 bg-white/5 p-3.5"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-200">
                            {comment.user_profiles?.display_name ||
                              comment.user_profiles?.username ||
                              'Anonim'}
                          </span>
                          <span className="text-xs text-white/40">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {user?.id === comment.user_id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-xs text-red-400 transition-colors hover:text-red-300"
                          >
                            {getTranslation('social.delete', currentLang)}
                          </button>
                        )}
                      </div>

                      <p className="text-sm leading-7 text-white/82">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </article>

      {/* TOAST BİLDİRİMİ */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[250] pointer-events-none transition-all duration-300 animate-pulse">
          <div className="rounded-full border border-fuchsia-300/30 bg-fuchsia-950/90 px-6 py-3 text-sm font-medium text-fuchsia-100 shadow-[0_0_30px_rgba(240,73,214,0.3)] backdrop-blur-md">
            {toastMessage}
          </div>
        </div>
      )}

      {/* ONAY MODALİ (8 AURA / 2 AURA SATIN ALMA - HEDİYELEŞME DESTEKLİ) */}
      <DeepAnalysisConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        auras={premiumAuras}
        onConfirm={confirmMode === 'image' ? handleGenerateImageOnly : handlePremiumAnalysisExecute}
        lang={currentLang}
        gumroadUrl={GUMROAD_PRODUCT_URL}
        isGift={!isOwner}
        mode={confirmMode}
      />

      {/* HİBRİT ANALİZ İNCELEME MODALÜ (Premium ise 7 Slaytlı Carousel, Teaser ise Klasik Görünüm) */}
      {showAnalysisModal && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 backdrop-blur-md sm:items-center sm:p-4"
          onClick={() => {
            setShowAnalysisModal(false)
            setShowStoryMode(false)
          }}
          role="dialog"
          aria-modal="true"
        >
          {premiumAnalysis ? (
            /* Premium ise Gelişmiş 7 Slaytlı ve Sosyal Paylaşım Merkezli Instagram Carousel Modal */
            <DeepAnalysisCarouselModal
              isOpen={showAnalysisModal}
              onClose={() => setShowAnalysisModal(false)}
              premiumAnalysis={premiumAnalysis}
              lang={currentLang}
              dreamTitle={dreamTitle}
              dreamImage={dreamImage}
              dreamMotiv={dreamMotiv}
              dreamContent={dream.content}
              teaserSummary={teaserAnalysis?.summary?.[currentLang] || teaserAnalysis?.summary?.en || dream.ai_summary}
              onShare={handleShareOnSocial}
              onLunosferShare={handleLunosferShare}
              onInstagramShare={handleInstagramShare} // Instagram Paylaşım Hub Entegrasyonu
              onGenerateImageOnly={handleGenerateImageOnly} // Slayt İçi Bağımsız Görsel Tetikleyicisi
              generatingImage={generatingImage}
              translateArchetype={translateArchetype}
              onOpenStoryMode={() => setShowStoryMode(true)}
              dreamId={dream.id}
            />
          ) : (
            /* Ücretsiz Teaser ise Klasik DreamAnalysisView */
            <div
              className="relative max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#070b14] shadow-[0_30px_100px_rgba(0,0,0,0.55)] sm:rounded-[2rem]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowAnalysisModal(false)}
                className="sticky right-4 top-4 z-20 ml-auto mr-4 mt-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white hover:bg-white/10"
                aria-label={getCloseLabel(currentLang)}
              >
                ✕
              </button>
              <DreamAnalysisView 
                analysis={effectiveDream?.premium_deep_analysis || teaserAnalysis} 
                lang={currentLang} 
              />
            </div>
          )}
        </div>
      )}

      {/* HİKAYE MODU MODALİ (Screenshot uyumlu dikey görünüm) */}
      <StoryModeModal
        isOpen={showStoryMode && showAnalysisModal}
        onClose={() => setShowStoryMode(false)}
        dreamImage={dreamImage}
        dreamTitle={dreamTitle}
        dreamMotiv={dreamMotiv}
        premiumAnalysis={premiumAnalysis}
        lang={currentLang}
        translateArchetype={translateArchetype}
      />
    </>
  )
}