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
    if (dream?.ai_jungian_analysis && Object.keys(dream.ai_jungian_analysis).length > 0) {
      return dream.ai_jungian_analysis
    }

    if (
      dream?.ai_summary ||
      dream?.ai_summary_en ||
      dream?.ai_summary_tr ||
      dream?.ai_title ||
      dream?.ai_motiv
    ) {
      return {
        title: {
          en: dream?.ai_title_en || dream?.ai_title || '',
          tr: dream?.ai_title_tr || dream?.ai_title || '',
        },
        summary: {
          en: dream?.ai_summary_en || dream?.ai_summary || '',
          tr: dream?.ai_summary_tr || dream?.ai_summary || '',
        },
        motiv: {
          en: dream?.ai_motiv_en || dream?.ai_motiv || '',
          tr: dream?.ai_motiv_tr || dream?.ai_motiv || '',
        },
        sentiment: dream?.ai_sentiment || null,
        archetypes: Array.isArray(dream?.ai_archetypes) ? dream.ai_archetypes : [],
        teaser: true,
      }
    }

    return null
  }, [dream])

  const getDreamAnalysis = useCallback(() => {
    if (translated && translatedAnalysis) {
      return translatedAnalysis
    }

    return (
      dream[`ai_summary_${currentLang}`] ||
      teaserAnalysis?.summary?.[currentLang] ||
      dream.ai_summary ||
      dream.ai_summary_en ||
      teaserAnalysis?.summary?.en ||
      ''
    )
  }, [dream, currentLang, translated, translatedAnalysis, teaserAnalysis])

  const getDreamMotiv = useCallback(() => {
    return (
      dream[`ai_motiv_${currentLang}`] ||
      teaserAnalysis?.motiv?.[currentLang] ||
      dream.ai_motiv ||
      dream.ai_motiv_en ||
      teaserAnalysis?.motiv?.en ||
      ''
    )
  }, [dream, currentLang, teaserAnalysis])

  const getDreamTitle = useCallback(() => {
    return (
      dream[`ai_title_${currentLang}`] ||
      teaserAnalysis?.title?.[currentLang] ||
      dream.ai_title ||
      dream.ai_title_en ||
      teaserAnalysis?.title?.en ||
      ''
    )
  }, [dream, currentLang, teaserAnalysis])

  const hasTeaserAnalysis = useMemo(() => {
    return Boolean(teaserAnalysis && (getDreamAnalysis() || getDreamMotiv() || getDreamTitle()))
  }, [teaserAnalysis, getDreamAnalysis, getDreamMotiv, getDreamTitle])

  const dreamImage = useMemo(() => dream.ai_image_url || null, [dream])
  const dreamMotiv = useMemo(() => getDreamMotiv(), [getDreamMotiv])
  const dreamTitle = useMemo(() => getDreamTitle(), [getDreamTitle])

  const dreamForAnalysisView = useMemo(() => {
    return {
      ...dream,
      ai_jungian_analysis: teaserAnalysis || dream?.ai_jungian_analysis || null,
      premium_deep_analysis: premiumAnalysis || dream?.premium_deep_analysis || null,
    }
  }, [dream, teaserAnalysis, premiumAnalysis])

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

      if (premiumCredits <= 0) {
        window.open(GUMROAD_PRODUCT_URL, '_blank', 'noopener,noreferrer')
        return
      }

      if (premiumAnalysis) {
        setShowAnalysisModal(true)
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
        body: JSON.stringify({
          dreamId: dream.id,
          lang: currentLang,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        if (data?.error === 'no_credits') {
          setPremiumError(getPremiumErrorMessage(currentLang, 'no_credits'))
          setPremiumCredits(0)
          return
        }

        if (
          data?.error === 'unauthorized' ||
          data?.error === 'missing_token' ||
          data?.error === 'forbidden'
        ) {
          setPremiumError(getPremiumErrorMessage(currentLang, 'unauthorized'))
          return
        }

        setPremiumError(getPremiumErrorMessage(currentLang, 'generic'))
        return
      }

      if (data?.analysis) {
        setPremiumAnalysis(data.analysis)
      }

      if (typeof data?.creditsLeft === 'number') {
        setPremiumCredits(data.creditsLeft)
      } else {
        setPremiumCredits((prev) => Math.max(0, prev - 1))
      }

      setShowAnalysisModal(true)
    } catch (err) {
      console.error('Premium analysis error:', err)
      setPremiumError(getPremiumErrorMessage(currentLang, 'generic'))
    } finally {
      setPremiumGenerating(false)
    }
  }

  const displayContent = translated ? translatedContent : dream.content
  const displayAnalysis = getDreamAnalysis()

  const sentimentLabel = dream.user_selected_sentiment
    ? getTranslation(
        `emotion.${String(dream.user_selected_sentiment).toLowerCase()}`,
        currentLang
      )
    : null

  return (
    <>
      <article className="glass-card hover-lift overflow-hidden">
        {dreamImage && (
          <div className="dream-image relative h-64 w-full overflow-hidden bg-black">
            <img
              src={dreamImage}
              alt="Dream"
              className="h-full w-full object-cover"
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
            {Array.isArray(dream.ai_archetypes) && dream.ai_archetypes.length > 0 ? (
              dream.ai_archetypes.map((arch, i) => (
                <span
                  key={`${dream.id}-arch-${i}`}
                  className="rounded-full border border-violet-300/18 bg-violet-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-violet-100"
                >
                  {arch}
                </span>
              ))
            ) : Array.isArray(teaserAnalysis?.archetypes) && teaserAnalysis.archetypes.length > 0 ? (
              teaserAnalysis.archetypes.map((arch, i) => (
                <span
                  key={`${dream.id}-teaser-arch-${i}`}
                  className="rounded-full border border-violet-300/18 bg-violet-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-violet-100"
                >
                  {arch}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-cyan-300/16 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-cyan-100">
                Dream Fragment
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
                  {currentLang === 'tr'
                    ? 'Çevriliyor...'
                    : currentLang === 'es'
                    ? 'Traduciendo...'
                    : currentLang === 'fr'
                    ? 'Traduction...'
                    : currentLang === 'de'
                    ? 'Wird übersetzt...'
                    : currentLang === 'pt'
                    ? 'Traduzindo...'
                    : currentLang === 'ru'
                    ? 'Перевод...'
                    : currentLang === 'ja'
                    ? '翻訳中...'
                    : 'Translating...'}
                </span>
              ) : translated ? (
                currentLang === 'tr'
                  ? 'Orijinali Göster'
                  : currentLang === 'es'
                  ? 'Mostrar original'
                  : currentLang === 'fr'
                  ? 'Afficher l’original'
                  : currentLang === 'de'
                  ? 'Original anzeigen'
                  : currentLang === 'pt'
                  ? 'Mostrar original'
                  : currentLang === 'ru'
                  ? 'Показать оригинал'
                  : currentLang === 'ja'
                  ? '原文を表示'
                  : 'Show original'
              ) : (
                `${currentLang.toUpperCase()} ${
                  currentLang === 'tr'
                    ? 'diline çevir'
                    : currentLang === 'es'
                    ? 'traducir'
                    : currentLang === 'fr'
                    ? 'traduire'
                    : currentLang === 'de'
                    ? 'übersetzen'
                    : currentLang === 'pt'
                    ? 'traduzir'
                    : currentLang === 'ru'
                    ? 'перевести'
                    : currentLang === 'ja'
                    ? 'に翻訳'
                    : 'translate'
                }`
              )}
            </button>
          )}

          {hasTeaserAnalysis && (
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

          {(hasTeaserAnalysis || premiumAnalysis || dream?.premium_deep_analysis) && (
            <>
              <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-fuchsia-300/14 bg-fuchsia-500/8 px-4 py-3">
                <span className="text-xs uppercase tracking-[0.18em] text-fuchsia-100/82">
                  {getPremiumPanelLabel(currentLang)}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/80">
                  {creditsLoading
                    ? getCreditsLoadingLabel(currentLang)
                    : getCreditsLabel(currentLang, premiumCredits)}
                </span>
              </div>

              <button
                type="button"
                onClick={handlePremiumAnalysisClick}
                disabled={premiumGenerating}
                className="energy-button mb-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/18 bg-fuchsia-500/10 px-4 py-3 text-sm text-fuchsia-100 hover:bg-fuchsia-500/18 disabled:cursor-not-allowed disabled:opacity-60"
                aria-haspopup={premiumCredits > 0 ? 'dialog' : undefined}
                aria-expanded={showAnalysisModal}
              >
                <span>{premiumGenerating ? '⏳' : '✦'}</span>
                <span>
                  {getPremiumButtonLabel(currentLang, premiumCredits, premiumGenerating)}
                </span>
              </button>

              {premiumError ? (
                <p className="mb-5 -mt-2 text-sm leading-6 text-rose-200/90">{premiumError}</p>
              ) : null}
            </>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <button
              onClick={handleLike}
              className={`energy-button inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm transition-all ${
                liked
                  ? 'border border-red-400/20 bg-red-500/16 text-red-200'
                  : 'border border-white/10 bg-white/5 text-white/80 hover:bg-red-500/10'
              }`}
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

            {hasTeaserAnalysis && (
              <button
                type="button"
                onClick={() => setShowAnalysisModal(true)}
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
                  {currentLang === 'tr'
                    ? 'Yorumlar yükleniyor...'
                    : currentLang === 'es'
                    ? 'Cargando comentarios...'
                    : currentLang === 'fr'
                    ? 'Chargement des commentaires...'
                    : currentLang === 'de'
                    ? 'Kommentare werden geladen...'
                    : currentLang === 'pt'
                    ? 'Carregando comentários...'
                    : currentLang === 'ru'
                    ? 'Загрузка комментариев...'
                    : currentLang === 'ja'
                    ? 'コメントを読み込み中...'
                    : 'Loading comments...'}
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
                          <span className="text-sm font-semibold text-violet-200">
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

      {showAnalysisModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-md sm:p-6"
          onClick={() => setShowAnalysisModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label={getAnalysisButtonLabel(currentLang)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#070b14] shadow-[0_30px_100px_rgba(0,0,0,0.55)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowAnalysisModal(false)}
              className="sticky right-4 top-4 z-20 ml-auto mr-4 mt-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/80 backdrop-blur hover:bg-white/10"
              aria-label={getCloseLabel(currentLang)}
            >
              ✕
            </button>

            <DreamAnalysisView dream={dreamForAnalysisView} lang={currentLang} />
          </div>
        </div>
      )}
    </>
  )
}