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
  return lang === 'tr'
    ? 'Kapat'
    : lang === 'es'
    ? 'Cerrar'
    : lang === 'fr'
    ? 'Fermer'
    : lang === 'de'
    ? 'Schließen'
    : lang === 'pt'
    ? 'Fechar'
    : lang === 'ru'
    ? 'Закрыть'
    : lang === 'ja'
    ? '閉じる'
    : 'Close'
}

function getPremiumButtonLabel(lang, credits, loading) {
  if (loading) {
    return lang === 'tr'
      ? 'Derin analiz oluşturuluyor...'
      : lang === 'es'
      ? 'Generando análisis profundo...'
      : lang === 'fr'
      ? 'Génération de l’analyse profonde...'
      : lang === 'de'
      ? 'Tiefenanalyse wird erstellt...'
      : lang === 'pt'
      ? 'Gerando análise profunda...'
      : lang === 'ru'
      ? 'Создаётся глубокий анализ...'
      : lang === 'ja'
      ? '詳細分析を生成中...'
      : 'Generating deep analysis...'
  }

  if (credits > 0) {
    return lang === 'tr'
      ? `Derin Analizi Aç · ${credits} kredi`
      : lang === 'es'
      ? `Abrir análisis profundo · ${credits} créditos`
      : lang === 'fr'
      ? `Ouvrir l’analyse profonde · ${credits} crédits`
      : lang === 'de'
      ? `Tiefenanalyse öffnen · ${credits} Credits`
      : lang === 'pt'
      ? `Abrir análise profunda · ${credits} créditos`
      : lang === 'ru'
      ? `Открыть глубокий анализ · ${credits} кредитов`
      : lang === 'ja'
      ? `詳細分析を開く · ${credits} クレジット`
      : `Open Deep Analysis · ${credits} credits`
  }

  return lang === 'tr'
    ? '10 kredi al ve derin analizi aç'
    : lang === 'es'
    ? 'Compra 10 créditos y abre el análisis profundo'
    : lang === 'fr'
    ? 'Acheter 10 crédits et ouvrir l’analyse profonde'
    : lang === 'de'
    ? '10 Credits kaufen und Tiefenanalyse öffnen'
    : lang === 'pt'
    ? 'Compre 10 créditos e abra a análise profunda'
    : lang === 'ru'
    ? 'Купить 10 кредитов и открыть глубокий анализ'
    : lang === 'ja'
    ? '10クレジットを購入して詳細分析を開く'
    : 'Buy 10 credits and open deep analysis'
}

function getPremiumPanelLabel(lang) {
  return lang === 'tr'
    ? 'Premium Derin Analiz'
    : lang === 'es'
    ? 'Análisis profundo premium'
    : lang === 'fr'
    ? 'Analyse profonde premium'
    : lang === 'de'
    ? 'Premium-Tiefenanalyse'
    : lang === 'pt'
    ? 'Análise profunda premium'
    : lang === 'ru'
    ? 'Премиум глубокий анализ'
    : lang === 'ja'
    ? 'プレミアム詳細分析'
    : 'Premium Deep Analysis'
}

function getCreditsLoadingLabel(lang) {
  return lang === 'tr'
    ? 'yükleniyor...'
    : lang === 'es'
    ? 'cargando...'
    : lang === 'fr'
    ? 'chargement...'
    : lang === 'de'
    ? 'wird geladen...'
    : lang === 'pt'
    ? 'carregando...'
    : lang === 'ru'
    ? 'загрузка...'
    : lang === 'ja'
    ? '読み込み中...'
    : 'loading...'
}

function getCreditsLabel(lang, credits) {
  return lang === 'tr'
    ? `${credits} kredi`
    : lang === 'es'
    ? `${credits} créditos`
    : lang === 'fr'
    ? `${credits} crédits`
    : lang === 'de'
    ? `${credits} Credits`
    : lang === 'pt'
    ? `${credits} créditos`
    : lang === 'ru'
    ? `${credits} кредитов`
    : lang === 'ja'
    ? `${credits} クレジット`
    : `${credits} credits`
}

function getPremiumErrorMessage(lang, errorCode) {
  if (errorCode === 'login_required') {
    return lang === 'tr'
      ? 'Derin analiz için önce giriş yapmalısın.'
      : lang === 'es'
      ? 'Primero debes iniciar sesión para el análisis profundo.'
      : lang === 'fr'
      ? 'Vous devez d’abord vous connecter pour l’analyse profonde.'
      : lang === 'de'
      ? 'Für die Tiefenanalyse musst du dich zuerst anmelden.'
      : lang === 'pt'
      ? 'Você precisa entrar primeiro para a análise profunda.'
      : lang === 'ru'
      ? 'Сначала войдите в систему для глубокого анализа.'
      : lang === 'ja'
      ? '詳細分析には先にログインが必要です。'
      : 'Please log in first to access deep analysis.'
  }

  if (errorCode === 'unauthorized') {
    return lang === 'tr'
      ? 'Oturum doğrulanamadı. Lütfen tekrar giriş yap.'
      : lang === 'es'
      ? 'No se pudo verificar tu sesión. Vuelve a iniciar sesión.'
      : lang === 'fr'
      ? 'Votre session n’a pas pu être vérifiée. Reconnectez-vous.'
      : lang === 'de'
      ? 'Deine Sitzung konnte nicht verifiziert werden. Bitte melde dich erneut an.'
      : lang === 'pt'
      ? 'Sua sessão não pôde ser verificada. Faça login novamente.'
      : lang === 'ru'
      ? 'Не удалось подтвердить вашу сессию. Войдите снова.'
      : lang === 'ja'
      ? 'セッションを確認できませんでした。もう一度ログインしてください。'
      : 'Your session could not be verified. Please log in again.'
  }

  if (errorCode === 'no_credits') {
    return lang === 'tr'
      ? 'Derin analiz kredin kalmamış.'
      : lang === 'es'
      ? 'No te quedan créditos para el análisis profundo.'
      : lang === 'fr'
      ? 'Vous n’avez plus de crédits pour l’analyse profonde.'
      : lang === 'de'
      ? 'Du hast keine Credits für die Tiefenanalyse mehr.'
      : lang === 'pt'
      ? 'Você não tem mais créditos para a análise profunda.'
      : lang === 'ru'
      ? 'У вас закончились кредиты на глубокий анализ.'
      : lang === 'ja'
      ? '詳細分析のクレジットが残っていません。'
      : 'You have no deep analysis credits left.'
  }

  return lang === 'tr'
    ? 'Derin analiz oluşturulurken bir hata oluştu.'
    : lang === 'es'
    ? 'Se produjo un error al generar el análisis profundo.'
    : lang === 'fr'
    ? 'Une erreur s’est produite lors de la génération de l’analyse profonde.'
    : lang === 'de'
    ? 'Beim Erstellen der Tiefenanalyse ist ein Fehler aufgetreten.'
    : lang === 'pt'
    ? 'Ocorreu um erro ao gerar a análise profunda.'
    : lang === 'ru'
    ? 'Произошла ошибка при создании глубокого анализа.'
    : lang === 'ja'
    ? '詳細分析の生成中にエラーが発生しました。'
    : 'An error occurred while generating deep analysis.'
}

function getAnalysisProcessingLabel(lang) {
  return lang === 'tr'
    ? 'Rüyan analiz ediliyor...'
    : lang === 'es'
    ? 'Analizando tu sueño...'
    : lang === 'fr'
    ? 'Analyse de votre rêve...'
    : lang === 'de'
    ? 'Dein Traum wird analysiert...'
    : lang === 'pt'
    ? 'Analisando seu sonho...'
    : lang === 'ru'
    ? 'Анализируем твой сон...'
    : lang === 'ja'
    ? '夢を分析中...'
    : 'Analyzing your dream...'
}

function getAnalysisFailedLabel(lang) {
  return lang === 'tr'
    ? 'Rüya analizi şu anda tamamlanamadı.'
    : lang === 'es'
    ? 'El análisis del sueño no se pudo completar.'
    : lang === 'fr'
    ? 'L’analyse du rêve n’a pas pu être terminée.'
    : lang === 'de'
    ? 'Die Traumanalyse konnte nicht abgeschlossen werden.'
    : lang === 'pt'
    ? 'A análise do sonho não pôde ser concluída.'
    : lang === 'ru'
    ? 'Не удалось завершить анализ сна.'
    : lang === 'ja'
    ? '夢の分析を完了できませんでした。'
    : 'Dream analysis could not be completed.'
}

function getRetryAnalysisLabel(lang, loading) {
  if (loading) {
    return lang === 'tr'
      ? 'Tekrar deneniyor...'
      : lang === 'es'
      ? 'Reintentando...'
      : lang === 'fr'
      ? 'Nouvelle tentative...'
      : lang === 'de'
      ? 'Wird erneut versucht...'
      : lang === 'pt'
      ? 'Tentando novamente...'
      : lang === 'ru'
      ? 'Повторная попытка...'
      : lang === 'ja'
      ? '再試行中...'
      : 'Retrying...'
  }

  return lang === 'tr'
    ? 'Tekrar dene'
    : lang === 'es'
    ? 'Reintentar'
    : lang === 'fr'
    ? 'Réessayer'
    : lang === 'de'
    ? 'Erneut versuchen'
    : lang === 'pt'
    ? 'Tentar novamente'
    : lang === 'ru'
    ? 'Повторить'
    : lang === 'ja'
    ? '再試行'
    : 'Retry'
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
  const [premiumCredits, setPremiumCredits] = useState(0)
  const [creditsLoading, setCreditsLoading] = useState(false)
  const [premiumGenerating, setPremiumGenerating] = useState(false)
  const [premiumError, setPremiumError] = useState('')
  const [premiumAnalysis, setPremiumAnalysis] = useState(
    dream?.premium_deep_analysis || null
  )

  // Holds a fresher copy of analysis fields after a retry, without waiting
  // for the parent list to reload. Merged on top of `dream` below.
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

  const dreamForAnalysisView = useMemo(() => {
    return {
      ...effectiveDream,
      ai_jungian_analysis: teaserAnalysis || effectiveDream?.ai_jungian_analysis || null,
      premium_deep_analysis: premiumAnalysis || effectiveDream?.premium_deep_analysis || null,
    }
  }, [effectiveDream, teaserAnalysis, premiumAnalysis])

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
          await Promise.all([checkIfLiked(currentUser.id), loadPremiumCredits(currentUser.id)])
        } else {
          setPremiumCredits(0)
        }
      } catch (err) {
        console.error('User check error:', err)
        if (mounted) {
          setUser(null)
          setPremiumCredits(0)
        }
      }
    }

    checkUser()

    return () => {
      mounted = false
    }
  }, [dream.id])

  async function loadPremiumCredits(userId) {
    try {
      setCreditsLoading(true)

      const { data, error } = await supabase
        .from('user_profiles')
        .select('premium_analysis_credits')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error
      setPremiumCredits(Number(data?.premium_analysis_credits || 0))
    } catch (err) {
      console.error('Load premium credits error:', err)
      setPremiumCredits(0)
    } finally {
      setCreditsLoading(false)
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
        : currentLang === 'es'
        ? '¿Seguro que quieres eliminar este comentario?'
        : currentLang === 'fr'
        ? 'Voulez-vous vraiment supprimer ce commentaire ?'
        : currentLang === 'de'
        ? 'Möchtest du diesen Kommentar wirklich löschen?'
        : currentLang === 'pt'
        ? 'Tem certeza de que deseja excluir este comentário?'
        : currentLang === 'ru'
        ? 'Вы уверены, что хотите удалить этот комментарий?'
        : currentLang === 'ja'
        ? 'このコメントを削除してもよろしいですか？'
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
      setRetryError(
