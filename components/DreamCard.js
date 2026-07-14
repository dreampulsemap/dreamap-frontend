import { useEffect, useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/router'
import { getTranslation } from '../lib/translations'
import { supabase } from '../lib/supabase'
import DreamAnalysisView from './DreamAnalysisView'

const GUMROAD_PRODUCT_URL = 'https://lunosfer.gumroad.com/l/lunosfer-deep-analysis'

function getAnalysisButtonLabel(lang) {
  return lang === 'tr'
    ? 'Rüya Analizini Aç'
    : lang === 'es'
    ? 'Abrir análisis del sueño'
    : lang === 'fr'
    ? 'Ouvrir l’analyse du rêve'
    : lang === 'de'
    ? 'Traumanalyse öffnen'
    : lang === 'pt'
    ? 'Abrir análise do sonho'
    : lang === 'ru'
    ? 'Открыть анализ сна'
    : lang === 'ja'
    ? '夢の分析を開く'
    : 'Open Dream Analysis'
}

function getCloseLabel(lang) {
  return lang === 'tr' ? 'Kapat' : lang === 'es' ? 'Cerrar' : 'Close'
}

function getPremiumButtonLabel(lang, auras, loading) {
  if (loading) {
    return lang === 'tr'
      ? 'Derin analiz oluşturuluyor...'
      : 'Generating deep analysis...'
  }

  if (auras > 0) {
    return lang === 'tr'
      ? `Derin Analizi Aç · ${auras} Aura`
      : `Open Deep Analysis · ${auras} Auras`
  }

  return lang === 'tr'
    ? '10 Aura al ve derin analizi aç'
    : 'Buy 10 Auras and open deep analysis'
}

function getPremiumErrorMessage(lang, errorCode) {
  if (errorCode === 'login_required') {
    return lang === 'tr'
      ? 'Derin analiz için önce giriş yapmalısın.'
      : 'Please log in first to access deep analysis.'
  }

  if (errorCode === 'unauthorized') {
    return lang === 'tr'
      ? 'Oturum doğrulanamadı. Lütfen tekrar giriş yap.'
      : 'Your session could not be verified. Please log in again.'
  }

  if (errorCode === 'no_auras') {
    return lang === 'tr'
      ? 'Derin analiz için yeterli Aura bakiyeniz kalmamış.'
      : 'You have no deep analysis Auras left.'
  }

  return lang === 'tr'
    ? 'Derin analiz oluşturulurken bir hata oluştu.'
    : 'An error occurred while generating deep analysis.'
}

function getAnalysisProcessingLabel(lang) {
  return lang === 'tr' ? 'Rüyan analiz ediliyor...' : 'Analyzing your dream...'
}

function getAnalysisFailedLabel(lang) {
  return lang === 'tr' ? 'Rüya analizi şu anda tamamlanamadı.' : 'Dream analysis could not be completed.'
}

function getRetryAnalysisLabel(lang, loading) {
  if (loading) {
    return lang === 'tr' ? 'Tekrar deneniyor...' : 'Retrying...'
  }
  return lang === 'tr' ? 'Tekrar dene' : 'Retry'
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
  const currentLang = lang || i18n.language || 'en'

  const [user, setUser] = useState(null)
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(dream.likes_count || 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentsCount, setCommentsCount] = useState(dream.comments_count || 0)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [premiumAuras, setPremiumAuras] = useState(0)
  const [aurasLoading, setAurasLoading] = useState(false)
  const [premiumGenerating, setPremiumGenerating] = useState(false)
  const [premiumError, setPremiumError] = useState('')
  const [premiumAnalysis, setPremiumAnalysis] = useState(
    dream?.premium_deep_analysis || null
  )

  const [analysisOverride, setAnalysisOverride] = useState(null)
  const [retryingAnalysis, setRetryingAnalysis] = useState(false)
  const [retryError, setRetryError] = useState('')

  const effectiveDream = useMemo(
    () => (analysisOverride ? { ...dream, ...analysisOverride } : dream),
    [dream, analysisOverride]
  )

  useEffect(() => {
    setLikesCount(dream.likes_count || 0)
    setCommentsCount(dream.comments_count || 0)
    setComments([])
    setShowComments(false)
    setLiked(false)
    setShowAnalysisModal(false)
    setPremiumGenerating(false)
    setPremiumError('')
    setPremiumAnalysis(dream?.premium_deep_analysis || null)
    setAnalysisOverride(null)
    setRetryError('')
  }, [dream.id, dream.likes_count, dream.comments_count, dream?.premium_deep_analysis])

  useEffect(() => {
    if (!showAnalysisModal) return

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAnalysisModal(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [showAnalysisModal])

  const teaserAnalysis = useMemo(() => {
    if (
      effectiveDream?.ai_jungian_analysis &&
      Object.keys(effectiveDream.ai_jungian_analysis).length > 0
    ) {
      return effectiveDream.ai_jungian_analysis
    }

    if (
      effectiveDream?.ai_summary ||
      effectiveDream?.ai_summary_en ||
      effectiveDream?.ai_summary_tr ||
      effectiveDream?.ai_title ||
      effectiveDream?.ai_motiv
    ) {
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
        archetypes: Array.isArray(effectiveDream?.ai_archetypes)
          ? effectiveDream.ai_archetypes
          : [],
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

  const analysisStatus = effectiveDream?.analysis_status || null
  const isAnalysisProcessing = !hasTeaserAnalysis && analysisStatus === 'processing'
  const isAnalysisFailed =
    !hasTeaserAnalysis && !isAnalysisProcessing && (analysisStatus === 'failed' || !analysisStatus)

  const dreamImage = useMemo(() => effectiveDream.ai_image_url || null, [effectiveDream])
  const dreamMotiv = useMemo(() => getDreamMotiv(), [getDreamMotiv])
  const dreamTitle = useMemo(() => getDreamTitle(), [getDreamTitle])

  useEffect(() => {
    let mounted = true

    async function checkUser() {
      try {
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser()

        if (error) throw error
        if (!mounted) return

        setUser(currentUser || null)

        if (currentUser?.id) {
          await Promise.all([checkIfLiked(currentUser.id), loadPremiumAuras(currentUser.id)])
        } else {
          setPremiumAuras(0)
        }
      } catch (err) {
        console.error('User check error:', err)
        if (mounted) {
          setUser(null)
          setPremiumAuras(0)
        }
      }
    }

    checkUser()

    return () => {
      mounted = false
    }
  }, [dream.id])

  async function loadPremiumAuras(userId) {
    try {
      setAurasLoading(true)

      const { data, error } = await supabase
        .from('user_profiles')
        .select('premium_analysis_auras')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error
      setPremiumAuras(Number(data?.premium_analysis_auras || 0))
    } catch (err) {
      console.error('Load premium auras error:', err)
      setPremiumAuras(0)
    } finally {
      setAurasLoading(false)
    }
  }

  async function checkIfLiked(userId) {
    try {
      const res = await fetch(
        `/api/like?dreamId=${encodeURIComponent(dream.id)}&userId=${encodeURIComponent(userId)}`
      )

      if (!res.ok) return

      const data = await res.json()
      setLiked(Boolean(data.liked))
    } catch (err) {
      console.error('Check like error:', err)
    }
  }

  async function handleLike() {
    if (!user?.id) {
      alert(getTranslation('social.loginToLike', currentLang))
      return
    }

    const method = liked ? 'DELETE' : 'POST'

    try {
      const res = await fetch('/api/like', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamId: dream.id,
          userId: user.id,
        }),
      })

      if (!res.ok) throw new Error('Like request failed')

      const data = await res.json()

      setLiked((prevLiked) => {
        const nextLiked = !prevLiked

        setLikesCount((prevCount) =>
          data.count !== undefined
            ? data.count
            : nextLiked
            ? prevCount + 1
            : Math.max(0, prevCount - 1)
        )

        return nextLiked
      })
    } catch (err) {
      console.error('Like error:', err)
    }
  }

  async function loadComments() {
    setCommentsLoading(true)

    try {
      const res = await fetch(`/api/comment?dreamId=${encodeURIComponent(dream.id)}`)
      if (!res.ok) throw new Error('Comments request failed')

      const data = await res.json()
      setComments(Array.isArray(data.comments) ? data.comments : [])
    } catch (err) {
      console.error('Load comments error:', err)
      setComments([])
    } finally {
      setCommentsLoading(false)
    }
  }

  async function handleAddComment() {
    if (!user?.id) {
      alert(getTranslation('social.loginToComment', currentLang))
      return
    }

    const content = newComment.trim()
    if (!content) return

    try {
      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamId: dream.id,
          userId: user.id,
          content,
        }),
      })

      if (!res.ok) throw new Error('Add comment request failed')

      const data = await res.json()

      setComments((prev) => [data.comment, ...prev])
      setNewComment('')
      setCommentsCount((prev) => prev + 1)
    } catch (err) {
      console.error('Add comment error:', err)
    }
  }

  async function handleDeleteComment(commentId) {
    if (!user?.id) return

    const confirmText =
      currentLang === 'tr'
        ? 'Yorumu silmek istediğine emin misin?'
        : 'Are you sure you want to delete this comment?'

    if (!window.confirm(confirmText)) return

    try {
      const res = await fetch('/api/comment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          userId: user.id,
        }),
      })

      if (!res.ok) throw new Error('Delete comment request failed')

      setComments((prev) => prev.filter((c) => c.id !== commentId))
      setCommentsCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Delete comment error:', err)
    }
  }

  async function handleRetryAnalysis() {
    if (retryingAnalysis) return

    setRetryingAnalysis(true)
    setRetryError('')

    try {
      const res = await fetch('/api/analyze-dream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamId: dream.id,
          lang: currentLang,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'retry_failed')
      }

      if (data.dream) {
        setAnalysisOverride(data.dream)
      }
    } catch (err) {
      console.error('Retry analysis error:', err)
      setRetryError(getAnalysisFailedLabel(currentLang))
    } finally {
      setRetryingAnalysis(false)
    }
  }

  async function handlePremiumAnalysisClick() {
    setPremiumError('')

    try {
      const {
        data: { user: verifiedUser },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !verifiedUser?.id) {
        setUser(null)
        setPremiumError(getPremiumErrorMessage(currentLang, 'login_required'))
        router.push('/auth')
        return
      }

      setUser(verifiedUser)

      // Analiz zaten varsa, bakiye düşümü yapmadan doğrudan şablon penceresini aç
      if (premiumAnalysis) {
        setShowAnalysisModal(true)
        return
      }

      // Yeni analiz başlatılacaksa Aura bakiyesini denetle
      if (premiumAuras <= 0) {
        window.open(GUMROAD_PRODUCT_URL, '_blank', 'noopener,noreferrer')
        return
      }

      setPremiumGenerating(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

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