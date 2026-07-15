import { useEffect, useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/router'
import { getTranslation } from '../lib/translations'
import { supabase } from '../lib/supabase'
import { tAddDream } from '../lib/addDreamTranslations'

const GUMROAD_PRODUCT_URL = 'https://lunosfer.gumroad.com/l/lunosfer-deep-analysis'

// 8 Dilde Arketip Çeviri Matrisi
const ARCHETYPE_LOCALIZATIONS = {
  tr: {
    "The Shadow": "Gölge", "Shadow": "Gölge",
    "The Persona": "Persona", "Persona": "Persona",
    "The Anima": "Anima", "Anima": "Anima",
    "The Animus": "Animus", "Animus": "Animus",
    "The Self": "Öz (Self)", "Self": "Öz (Self)",
    "The Trickster": "Hilekâr (Trickster)", "Trickster": "Hilekâr",
    "The Child": "Çocuk", "Inner Child": "İçsel Çocuk",
    "The Sage": "Bilge", "Sage": "Bilge",
    "The Hero": "Kahraman", "Hero": "Kahraman",
    "The Mother": "Büyük Anne / Anne", "Mother": "Anne",
    "The Father": "Baba", "Father": "Baba",
    "The Wanderer": "Gezgin", "Wanderer": "Gezgin",
    "The Explorer": "Kâşif", "Explorer": "Kâşif",
    "The Rebel": "Asi", "Rebel": "Asi",
    "The Innocent": "Masum", "Innocent": "Masum",
    "The Lover": "Âşık", "Lover": "Âşık",
    "The Magician": "Büyücü", "Magician": "Büyücü",
    "The Ruler": "Hükümdar", "Ruler": "Hükümdar",
    "The Caregiver": "Şefkatli", "Caregiver": "Şefkatli",
    "The Jester": "Soytarı", "Jester": "Soytarı"
  },
  es: {
    "The Shadow": "La Sombra", "Shadow": "La Sombra",
    "The Persona": "La Persona", "Persona": "La Persona",
    "The Anima": "El Ánima", "Anima": "El Ánima",
    "The Animus": "El Ánimus", "Animus": "El Ánimus",
    "The Self": "El Sí-Mismo", "Self": "El Sí-Mismo",
    "The Trickster": "El Pícaro", "Trickster": "El Pícaro",
    "The Child": "El Niño", "Inner Child": "El Niño Interior",
    "The Sage": "El Sabio", "Sage": "El Sabio",
    "The Hero": "El Héroe", "Hero": "El Héroe",
    "The Mother": "La Madre", "Mother": "La Madre",
    "The Father": "El Padre", "Father": "El Padre",
    "The Wanderer": "El Vagabundo", "Wanderer": "El Vagabundo",
    "The Explorer": "El Explorador", "Explorer": "El Explorador",
    "The Rebel": "El Rebelde", "Rebel": "El Rebelde",
    "The Innocent": "El Inocente", "Innocent": "El Inocente",
    "The Lover": "El Amante", "Lover": "El Amante",
    "The Magician": "El Mago", "Magician": "El Mago",
    "The Ruler": "El Gobernante", "Ruler": "El Gobernante",
    "The Caregiver": "El Cuidador", "Caregiver": "El Cuidador",
    "The Jester": "El Bufón", "Jester": "El Bufón"
  },
  fr: {
    "The Shadow": "L'Ombre", "Shadow": "L'Ombre",
    "The Persona": "La Persona", "Persona": "La Persona",
    "The Anima": "L'Anima", "Anima": "L'Anima",
    "The Animus": "L'Animus", "Animus": "L'Animus",
    "The Self": "Le Soi", "Self": "Le Soi",
    "The Trickster": "Le Fripon", "Trickster": "Le Fripon",
    "The Child": "L'Enfant", "Inner Child": "L'Enfant Intérieur",
    "The Sage": "Le Sage", "Sage": "Le Sage",
    "The Hero": "Le Héros", "Hero": "Le Héros",
    "The Mother": "La Mère", "Mother": "La Mère",
    "The Father": "Le Père", "Father": "Le Père",
    "The Wanderer": "Le Vagabond", "Wanderer": "Le Vagabond",
    "The Explorer": "L'Explorateur", "Explorer": "L'Explorateur",
    "The Rebel": "Le Rebelle", "Rebel": "Le Rebelle",
    "The Innocent": "L'Innocent", "Innocent": "L'Innocent",
    "The Lover": "L'Amant", "Lover": "L'Amant",
    "The Magician": "Le Magicien", "Magician": "Le Magicien",
    "The Ruler": "Le Souverain", "Ruler": "Le Souverain",
    "The Caregiver": "L'Ange Gardien", "Caregiver": "L'Ange Gardien",
    "The Jester": "Le Bouffon", "Jester": "Le Bouffon"
  },
  de: {
    "The Shadow": "Der Schatten", "Shadow": "Der Schatten",
    "The Persona": "Die Persona", "Persona": "Die Persona",
    "The Anima": "Die Anima", "Anima": "Die Anima",
    "The Animus": "Der Animus", "Animus": "Der Animus",
    "The Self": "Das Selbst", "Self": "Das Selbst",
    "The Trickster": "Der Schelm", "Trickster": "Der Schelm",
    "The Child": "Das Kind", "Inner Child": "Das innere Kind",
    "The Sage": "Der Weise", "Sage": "Der Weise",
    "The Hero": "Der Held", "Hero": "Der Held",
    "The Mother": "Die Mutter", "Mother": "Die Mutter",
    "The Father": "Der Vater", "Father": "Der Vater",
    "The Wanderer": "Der Wanderer", "Wanderer": "Der Wanderer",
    "The Explorer": "Der Entdecker", "Explorer": "Der Entdecker",
    "The Rebel": "Der Rebell", "Rebel": "Der Rebell",
    "The Innocent": "Der Unschuldige", "Innocent": "Der Unschuldige",
    "The Lover": "Der Liebende", "Lover": "Der Liebende",
    "The Magician": "Der Magier", "Magician": "Der Magier",
    "The Ruler": "Der Herrscher", "Ruler": "Der Herrscher",
    "The Caregiver": "Der Fürsorgliche", "Caregiver": "Der Fürsorgliche",
    "The Jester": "Der Narr", "Jester": "Der Narr"
  },
  pt: {
    "The Shadow": "A Sombra", "Shadow": "A Sombra",
    "The Persona": "A Persona", "Persona": "A Persona",
    "The Anima": "A Anima", "Anima": "A Anima",
    "The Animus": "O Animus", "Animus": "O Animus",
    "The Self": "O Self", "Self": "O Self",
    "The Trickster": "O Trapaceiro", "Trickster": "O Trapaceiro",
    "The Child": "A Criança", "Inner Child": "A Criança Interior",
    "The Sage": "O Sábio", "Sage": "O Sábio",
    "The Hero": "O Herói", "Hero": "O Herói",
    "The Mother": "A Mãe", "Mother": "A Mãe",
    "The Father": "O Pai", "Father": "O Pai",
    "The Wanderer": "O Vagabundo", "Wanderer": "O Vagabundo",
    "The Explorer": "O Explorador", "Explorer": "O Explorador",
    "The Rebel": "O Rebelde", "Rebel": "O Rebelde",
    "The Innocent": "O Inocente", "Innocent": "O Inocente",
    "The Lover": "O Amante", "Lover": "O Amante",
    "The Magician": "O Mago", "Magician": "O Mago",
    "The Ruler": "O Governante", "Ruler": "O Governante",
    "The Caregiver": "O Protetor", "Caregiver": "O Protetor",
    "The Jester": "O Bobo da Corte", "Jester": "O Bobo da Corte"
  },
  ru: {
    "The Shadow": "Тень", "Shadow": "Тень",
    "The Persona": "Персона", "Persona": "Персона",
    "The Anima": "Анима", "Anima": "Анима",
    "The Animus": "Анимус", "Animus": "Анимус",
    "The Self": "Самость", "Self": "Самость",
    "The Trickster": "Трикстер", "Trickster": "Трикстер",
    "The Child": "Дитя", "Inner Child": "Внутренний ребёнок",
    "The Sage": "Мудрец", "Sage": "Мудрец",
    "The Hero": "Герой", "Hero": "Герой",
    "The Mother": "Мать", "Mother": "Мать",
    "The Father": "Отец", "Father": "Отец",
    "The Wanderer": "Странник", "Wanderer": "Странник",
    "The Explorer": "Искатель", "Explorer": "Искатель",
    "The Rebel": "Бунтарь", "Rebel": "Бунтарь",
    "The Innocent": "Простодушный", "Innocent": "Простодушный",
    "The Lover": "Влюбленный", "Lover": "Влюбленный",
    "The Magician": "Маг", "Magician": "Маг",
    "The Ruler": "Правитель", "Ruler": "Правитель",
    "The Caregiver": "Заботливый", "Caregiver": "Заботливый",
    "The Jester": "Шут", "Jester": "Шут"
  },
  ja: {
    "The Shadow": "影 (シャドウ)", "Shadow": "影 (シャドウ)",
    "The Persona": "ペルソナ", "Persona": "ペルソナ",
    "The Anima": "アニマ", "Anima": "アニマ",
    "The Animus": "アニムス", "Animus": "アニムス",
    "The Self": "自己 (セルフ)", "Self": "自己 (セルフ)",
    "The Trickster": "トリックスター", "Trickster": "トリックスター",
    "The Child": "チャイルド", "Inner Child": "インナーチャイルド",
    "The Sage": "賢者", "Sage": "賢者",
    "The Hero": "英雄", "Hero": "英雄",
    "The Mother": "母", "Mother": "母",
    "The Father": "父", "Father": "父",
    "The Wanderer": "放浪者", "Wanderer": "放浪者",
    "The Explorer": "探求者", "Explorer": "探求者",
    "The Rebel": "反逆者", "Rebel": "反逆者",
    "The Innocent": "無垢なる者", "Innocent": "無垢なる者",
    "The Lover": "恋人", "Lover": "恋人",
    "The Magician": "魔術師", "Magician": "魔術師",
    "The Ruler": "支配者", "Ruler": "支配者",
    "The Caregiver": "世話役", "Caregiver": "世話役",
    "The Jester": "道化師", "Jester": "道化師"
  }
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
  
  // Modaller ve Onay Ekranları
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showStoryMode, setShowStoryMode] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  // Bakiye ve Analiz Durumları
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

  // Toast (Bildirim) State'i
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)

  // Dokunmatik Kaydırma (Swipe) Algılayıcıları
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  const effectiveDream = useMemo(
    () => (analysisOverride ? { ...dream, ...analysisOverride } : dream),
    [dream, analysisOverride]
  )

  const triggerToast = (msg) => {
    setToastMessage(msg)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 2800)
  }

  // Swipe İşleyicileri
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 55
    const isRightSwipe = distance < -55

    if (isLeftSwipe && currentSlide < 4) {
      setCurrentSlide((prev) => prev + 1)
    }
    if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1)
    }
    setTouchStart(null)
    setTouchEnd(null)
  }

  // 8 Dilde Arketip Çeviri Fonksiyonu
  const translateArchetype = useCallback((arch) => {
    if (!arch) return ''
    const cleanArch = String(arch).trim()
    const localized = ARCHETYPE_LOCALIZATIONS[currentLang]?.[cleanArch]
    return localized || cleanArch
  }, [currentLang])

  // Lib içindeki addDreamTranslations dosyasından pürüzsüz duygu çevirisi çekme
  const translateEmotion = useCallback((sentiment) => {
    if (!sentiment) return ''
    const emotionKey = `emotion.${String(sentiment).toLowerCase()}`
    const localized = tAddDream(emotionKey, currentLang)
    return localized && localized !== emotionKey ? localized : sentiment
  }, [currentLang])

  useEffect(() => {
    setLikesCount(dream.likes_count || 0)
    setCommentsCount(dream.comments_count || 0)
    setComments([])
    setShowComments(false)
    setLiked(false)
    setShowAnalysisModal(false)
    setShowConfirmModal(false)
    setShowStoryMode(false)
    setPremiumGenerating(false)
    setPremiumError('')
    setPremiumAnalysis(dream?.premium_deep_analysis || null)
    setAnalysisOverride(null)
    setRetryError('')
  }, [dream.id, dream.likes_count, dream.comments_count, dream?.premium_deep_analysis])

  useEffect(() => {
    if (!showAnalysisModal && !showConfirmModal) return

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAnalysisModal(false)
        setShowConfirmModal(false)
        setShowStoryMode(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [showAnalysisModal, showConfirmModal])

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

  // Derin Rüya Analizini Başlatma (Gerçek Üretim Tetikleyicisi)
  async function handlePremiumAnalysisExecute() {
    setShowConfirmModal(false)
    setPremiumGenerating(true)
    setPremiumError('')

    try {
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
        // Başarılı üretimden sonra doğrudan carousel modali ilk slayttan aç
        setCurrentSlide(0)
        setShowAnalysisModal(true)
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

  // Butona tıklandığında bakiye durumuna göre Onay Modalı veya Gumroad açar
  async function handlePremiumButtonClick() {
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

      // Eğer zaten analiz üretilmişse onay ekranı göstermeden doğrudan Instagram carousel'i aç
      if (premiumAnalysis) {
        setCurrentSlide(0)
        setShowAnalysisModal(true)
        return
      }

      // Analiz henüz üretilmemişse onay penceresini tetikle
      setShowConfirmModal(true)
    } catch (err) {
      console.error('User verification check failed:', err)
      setPremiumError(getPremiumErrorMessage(currentLang, 'generic'))
    }
  }

  // Sosyal Medya & Instagram Paylaşım Fonksiyonu (Web Share API & Clipboard Fallback)
  const handleShareOnSocial = async () => {
    const dreamUrl = typeof window !== 'undefined' ? `${window.location.origin}/dreams/${dream.id}` : ''
    const shareText = currentLang === 'tr'
      ? `✦ Lunosfer rüya ağına katıldım! 🌌\nRüyamın mistik Jungyen derin analizini ve yapay zeka illüstrasyonunu buradan gör:\n🔗 ${dreamUrl}\n\nSen de rüyalarının kozmik gizemini çözmek istersen Lunosfer'e katıl! ✨🔮`
      : `✦ I joined the Lunosfer dream network! 🌌\nSee my mystical Jungian deep analysis and AI dream illustration here:\n🔗 ${dreamUrl}\n\nUnravel the cosmic mystery of your dreams with Lunosfer! ✨🔮`

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
        triggerToast(currentLang === 'tr' ? 'Paylaşım bağlantısı ve davet metni kopyalandı! 🔮' : 'Share link and invitation copied to clipboard! 🔮')
      } catch (err) {
        console.error('Clipboard copy failed:', err)
        alert('Bağlantı: ' + dreamUrl)
      }
    }
  }

  const displayContent = translated ? translatedContent : dream.content
  const displayAnalysis = getDreamAnalysis()

  const sentimentLabel = dream.user_selected_sentiment
    ? translateEmotion(dream.user_selected_sentiment)
    : null

  // Aktif Slayt Verileri
  const slides = useMemo(() => {
    if (!premiumAnalysis) return []
    return [
      // Slayt 1: Rüya Sanat Kartı (Paylaşılmaya Hazır)
      {
        title: currentLang === 'tr' ? 'Rüya Kartı' : 'Dream Card',
        type: 'cover'
      },
      // Slayt 2: Sembolik Anlam
      {
        title: currentLang === 'tr' ? 'Genel & Sembolik Okuma' : 'Symbolic Reading',
        content: premiumAnalysis.symbolic_reading || premiumAnalysis.summary || ''
      },
      // Slayt 3: Gölge & Merkez Çatışma
      {
        title: currentLang === 'tr' ? 'Gölge & Çatışma' : 'Shadow & Core Conflict',
        shadow: premiumAnalysis.shadow_focus || '',
        conflict: premiumAnalysis.core_conflict || ''
      },
      // Slayt 4: Bireyleşme & Entegrasyon
      {
        title: currentLang === 'tr' ? 'Dönüşüm Yolu' : 'Path of Transformation',
        content: premiumAnalysis.individuation_path || ''
      },
      // Slayt 5: İçsel Meditasyon Soruları
      {
        title: currentLang === 'tr' ? 'Ruhsal Yansımalar' : 'Reflection Questions',
        questions: Array.isArray(premiumAnalysis.reflection_questions) ? premiumAnalysis.reflection_questions : []
      }
    ]
  }, [premiumAnalysis, currentLang])

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

          {isAnalysisProcessing && (
            <div className="mb-5 flex items-center gap-3 rounded-[1.5rem] border border-cyan-300/18 bg-cyan-500/8 p-4 sm:p-5">
              <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-cyan-200 border-t-transparent" />
              <p className="text-sm leading-6 text-cyan-100/90">
                {getAnalysisProcessingLabel(currentLang)}
              </p>
            </div>
          )}

          {isAnalysisFailed && (
            <div className="mb-5 rounded-[1.5rem] border border-white/12 bg-white/4 p-4 sm:p-5">
              <p className="mb-3 text-sm leading-6 text-white/70">
                {getAnalysisFailedLabel(currentLang)}
              </p>
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

          {/* Derin Rüya Analizi Butonu */}
          <button
            type="button"
            onClick={handlePremiumButtonClick}
            disabled={premiumGenerating}
            className="energy-button mb-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/18 bg-fuchsia-500/10 px-4 py-3.5 text-sm font-semibold text-fuchsia-100 hover:bg-fuchsia-500/18 disabled:cursor-not-allowed disabled:opacity-60 shadow-[0_0_20px_rgba(240,73,214,0.15)]"
          >
            <span>{premiumGenerating ? '⏳' : '✦'}</span>
            <span>
              {premiumAnalysis 
                ? (currentLang === 'tr' ? 'Derin Rüya Analizini İncele' : 'Explore Deep Dream Analysis')
                : (currentLang === 'tr' ? 'Derin Rüya Analizini Al' : 'Get Deep Dream Analysis')
              }
            </span>
          </button>

          {premiumError ? (
            <p className="mb-5 -mt-2 text-sm leading-6 text-rose-200/90" role="alert">
              {premiumError}
            </p>
          ) : null}

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
                onClick={() => {
                  setCurrentSlide(1) // Teaser tıklandığında doğrudan rüya yorum slaytına odaklar
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
                          <span className="text-sm font-semibold text-slate-200 font-sans">
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

      {/* ONAY MODALI (PREMIUM SATIN ALMA EKRANI - 8 AURA) */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#070b14] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.65)] sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* KAPATMA BUTONU */}
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 text-2xl text-white/60 hover:text-white"
            >
              ✕
            </button>

            {/* BAŞLIK */}
            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-300 mb-3 shadow-[0_0_15px_rgba(240,73,214,0.1)]">
                ✦ LUNOSFER ORACLE
              </span>
              <h3 className="text-2xl font-bold gradient-text">
                {currentLang === 'tr' ? 'Derin Rüya Analizini Al' : 'Unlock Deep Dream Analysis'}
              </h3>
            </div>

            {/* DETAYLAR */}
            <div className="space-y-4 mb-8 text-sm">
              <div className="flex gap-3">
                <span className="text-lg">🌌</span>
                <div>
                  <h4 className="font-semibold text-white">{currentLang === 'tr' ? 'Kozmik Rüya İllüstrasyonu' : 'Cosmic Dream Illustration'}</h4>
                  <p className="text-white/60 text-xs mt-0.5">{currentLang === 'tr' ? 'Rüyanızın mistik sembollerini yansıtan, paylaşmaya hazır harikulade bir sanat eseri.' : 'A beautiful, shareable artwork reflecting the subconscious symbols of your dream.'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-lg">🜂</span>
                <div>
                  <h4 className="font-semibold text-white">{currentLang === 'tr' ? 'Bilinçaltının Gölgeleri' : 'Shadow Focus'}</h4>
                  <p className="text-white/60 text-xs mt-0.5">{currentLang === 'tr' ? 'Kişiliğinizin bastırılmış, gizli kalmış gölge yönlerinin tespiti.' : 'Explore suppressed or unacknowledged shadow aspects of your psyche.'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-lg">💫</span>
                <div>
                  <h4 className="font-semibold text-white">{currentLang === 'tr' ? 'Bireyleşme ve Dönüşüm' : 'Path of Transformation'}</h4>
                  <p className="text-white/60 text-xs mt-0.5">{currentLang === 'tr' ? 'Ruhunuzun gelişim ve bütünleşme süreci için kişiselleştirilmiş rehberlik.' : 'Actionable and personal psychic guidance tied directly to your dream drama.'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-lg">💭</span>
                <div>
                  <h4 className="font-semibold text-white">{currentLang === 'tr' ? 'Derin Sembolik Okuma' : 'Detailed Symbolism & Emotion'}</h4>
                  <p className="text-white/60 text-xs mt-0.5">{currentLang === 'tr' ? 'Rüyanızdaki mistik sembollerin kodları ve detaylı duygu yoğunluk haritası.' : 'Decoding of central symbols and detailed mapping of emotional scores.'}</p>
                </div>
              </div>
            </div>

            {/* BAKİYE BİLGİSİ VE SATIN ALMA EYLEMİ */}
            <div className="border-t border-white/10 pt-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-400 text-xs uppercase tracking-wider">{currentLang === 'tr' ? 'Bakiyeniz:' : 'Your Balance:'}</span>
                <span className="text-sm font-semibold text-white">✦ {premiumAuras} Aura</span>
              </div>

              {premiumAuras >= 8 ? (
                <button
                  onClick={handlePremiumAnalysisExecute}
                  className="w-full inline-flex min-h-[50px] items-center justify-center rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-6 py-3.5 text-sm font-bold text-white transition hover:scale-[1.01] hover:brightness-110 shadow-[0_0_20px_rgba(240,73,214,0.3)]"
                >
                  {currentLang === 'tr' ? 'Analizi Başlat · 8 Aura' : 'Start Analysis · 8 Auras'}
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
                    {currentLang === 'tr' ? 'Derin analiz için yeterli bakiyeniz bulunmuyor. Oracle analizi başlatmak için Gumroad üzerinden bakiye paketi alabilirsiniz.' : 'Insufficient balance. Purchase an Aura package to start this Oracle analysis.'}
                  </p>
                  <a
                    href={GUMROAD_PRODUCT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex min-h-[50px] items-center justify-center rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-6 py-3.5 text-sm font-bold text-white transition hover:scale-[1.01]"
                  >
                    {currentLang === 'tr' ? 'Aura Satın Al (Gumroad)' : 'Buy Auras (Gumroad)'}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* INSTAGRAM CAROUSEL MODALI (PREMIUM ANALİZ İNCELEME) */}
      {showAnalysisModal && slides.length > 0 && (
        <div
          className="fixed inset-0 z-[160] flex items-end justify-center bg-black/90 backdrop-blur-lg sm:items-center sm:p-4"
          onClick={() => {
            setShowAnalysisModal(false)
            setShowStoryMode(false)
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative h-[95vh] w-full max-w-4xl overflow-hidden rounded-t-[2.5rem] border border-white/10 bg-[#040711] shadow-[0_30px_120px_rgba(0,0,0,0.85)] sm:h-[85vh] sm:rounded-[2.5rem]"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* KAPATMA BUTONU */}
            <button
              onClick={() => {
                setShowAnalysisModal(false)
                setShowStoryMode(false)
              }}
              className="absolute top-4 right-4 z-[180] inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white hover:bg-white/10 transition-all"
            >
              ✕
            </button>

            {/* BAŞLIK & İNDİKATÖR BAR (INSTAGRAM STYLE) */}
            <div className="absolute top-4 left-6 z-[180] flex items-center gap-2">
              <span className="text-xs font-bold text-fuchsia-300 uppercase tracking-widest">{slides[currentSlide]?.title}</span>
              <span className="text-[10px] text-white/40 font-mono">({currentSlide + 1}/5)</span>
            </div>

            {/* INSTAGRAM HİKAYE MODU BUTONU (Sadece ilk slaytta) */}
            {currentSlide === 0 && (
              <button
                type="button"
                onClick={() => setShowStoryMode(!showStoryMode)}
                className="absolute top-18 right-4 z-[180] inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-200 hover:bg-cyan-500/20"
              >
                📱 {currentLang === 'tr' ? 'HİKAYE MODU' : 'STORY MODE'}
              </button>
            )}

            {/* SLAYT İÇERİKLERİ HÜCRESİ */}
            <div className="relative w-full h-[calc(100%-80px)] mt-16 px-6 py-4 overflow-y-auto sm:px-12 select-none">
              
              {/* SLAYT 1: KOZMİK RÜYA KARTI */}
              {currentSlide === 0 && (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <div className="relative w-full max-w-md h-[45vh] rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl">
                    {dreamImage ? (
                      <img src={dreamImage} alt="Dream Visual" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-purple-900 to-black">🌌</div>
                    )}
                    {/* Büyülü alt katman kaplaması */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#040711] via-transparent to-transparent" />
                    
                    <div className="absolute bottom-6 left-6 right-6">
                      {dream.location_name && (
                        <span className="text-[10px] tracking-widest text-cyan-200 font-bold uppercase mb-1.5 block">📍 {dream.location_name}</span>
                      )}
                      <h4 className="text-xl font-bold text-white mb-2 leading-tight font-serif">{dreamTitle || (currentLang === 'tr' ? 'Bilinmeyen Rüya' : 'Unknown Dream')}</h4>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(premiumAnalysis.archetypes) && premiumAnalysis.archetypes.map((arch, i) => (
                          <span key={i} className="text-[9px] font-semibold bg-violet-500/20 border border-violet-400/30 px-2 py-0.5 rounded-full text-violet-100">
                            ✦ {translateArchetype(arch)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SLAYT 2: GENEL & SEMBOLİK OKUMA */}
              {currentSlide === 1 && (
                <div className="h-full flex flex-col justify-center max-w-xl mx-auto">
                  <span className="text-2xl mb-3 text-indigo-400">🜂</span>
                  <h4 className="text-lg font-bold uppercase tracking-wider text-slate-400 mb-3">{currentLang === 'tr' ? 'Rüyanın Sembolik Yol Haritası' : 'Symbolic Roadmap'}</h4>
                  <p className="text-sm leading-8 text-slate-200 font-light whitespace-pre-wrap">{getVal(premiumAnalysis.symbolic_reading, currentLang) || getVal(premiumAnalysis.summary, currentLang)}</p>
                </div>
              )}

              {/* SLAYT 3: GÖLGE VE MERKEZ ÇATIŞMA */}
              {currentSlide === 2 && (
                <div className="h-full flex flex-col justify-center gap-6 max-w-2xl mx-auto">
                  <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/[0.02]">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      {currentLang === 'tr' ? 'Bastırılmış Benlik (Gölge)' : 'Shadow Focus'}
                    </h5>
                    <p className="text-xs leading-6 text-slate-300 font-light">{getVal(premiumAnalysis.shadow_focus, currentLang)}</p>
                  </div>

                  <div className="p-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.02]">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      {currentLang === 'tr' ? 'Temel Gerilim (Çatışma)' : 'Core Conflict'}
                    </h5>
                    <p className="text-xs leading-6 text-slate-300 font-light">{getVal(premiumAnalysis.core_conflict, currentLang)}</p>
                  </div>
                </div>
              )}

              {/* SLAYT 4: BİREYLEŞME & DÖNÜŞÜM */}
              {currentSlide === 3 && (
                <div className="h-full flex flex-col justify-center max-w-xl mx-auto">
                  <span className="text-2xl mb-3 text-violet-400">💫</span>
                  <h4 className="text-lg font-bold uppercase tracking-wider text-slate-400 mb-3">{currentLang === 'tr' ? 'Uyanık Hayata Entegrasyon' : 'Path of Transformation'}</h4>
                  <p className="text-sm leading-8 text-slate-200 font-light whitespace-pre-wrap">{getVal(premiumAnalysis.individuation_path, currentLang)}</p>
                </div>
              )}

              {/* SLAYT 5: MEDİTASYON SORULARI */}
              {currentSlide === 4 && (
                <div className="h-full flex flex-col justify-center gap-4 max-w-xl mx-auto">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">{currentLang === 'tr' ? 'Kendinize Sormanız Gereken Sorular' : 'Reflection Questions'}</h4>
                  {Array.isArray(premiumAnalysis.reflection_questions) && premiumAnalysis.reflection_questions.slice(0, 3).map((q, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-fuchsia-400/40" />
                      <span className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest block mb-1">{currentLang === 'tr' ? `Yansıma ${idx + 1}` : `Reflection ${idx + 1}`}</span>
                      <p className="text-xs text-slate-300 leading-relaxed italic">"{q}"</p>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* NAVİGASYON KONTROLLERİ VE VİRAL PAYLAŞIM ALANI */}
            <div className="absolute bottom-6 left-0 right-0 px-6 flex flex-col items-center gap-4">
              
              {/* Instagram Noktaları */}
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`Slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-5 bg-fuchsia-400 shadow-[0_0_10px_rgba(240,73,214,0.4)]' : 'w-1.5 bg-white/20'}`}
                  />
                ))}
              </div>

              {/* Paylaşım & İleri/Geri Buton Grubu */}
              <div className="w-full flex items-center justify-between gap-4 max-w-md">
                <button
                  type="button"
                  disabled={currentSlide === 0}
                  onClick={() => setCurrentSlide((prev) => prev - 1)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
                >
                  ←
                </button>

                <button
                  type="button"
                  onClick={handleShareOnSocial}
                  className="flex-1 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-2.5 text-xs font-bold text-white transition hover:scale-[1.01] hover:brightness-110 shadow-[0_0_15px_rgba(240,73,214,0.2)]"
                >
                  <span>✦</span>
                  <span>{currentLang === 'tr' ? 'Instagram & Sosyal Medyada Paylaş' : 'Share on Instagram'}</span>
                </button>

                <button
                  type="button"
                  disabled={currentSlide === 4}
                  onClick={() => setCurrentSlide((prev) => prev + 1)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
                >
                  →
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* DETAYLI INSTAGRAM HİKAYE MODU ÖNİZLEMESİ (9:16 KART ŞABLONU) */}
      {showStoryMode && showAnalysisModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"
          onClick={() => setShowStoryMode(false)}
        >
          <div
            className="relative w-full max-w-[360px] aspect-[9/16] rounded-3xl overflow-hidden border border-white/10 bg-[#050711] shadow-[0_30px_100px_rgba(0,0,0,0.95)] flex flex-col justify-between p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* KAPATMA BUTONU */}
            <button
              onClick={() => setShowStoryMode(false)}
              className="absolute top-4 right-4 z-[220] text-xl text-white/60 hover:text-white"
            >
              ✕
            </button>

            {/* Arka plan rüya resmi kaplaması */}
            {dreamImage && (
              <div className="absolute inset-0 z-0">
                <img src={dreamImage} alt="Story bg" className="w-full h-full object-cover opacity-35 filter blur-xs" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-[#050711]" />
              </div>
            )}

            <div className="relative z-10 flex flex-col h-full justify-between pointer-events-none select-none">
              {/* ÜST BAŞLIK */}
              <div className="text-center pt-4">
                <span className="text-[10px] tracking-[0.24em] font-black text-cyan-300 uppercase block mb-1">LUNOSFER ORACLE</span>
                <span className="text-[9px] tracking-widest text-white/50 uppercase block">Collective Subconscious</span>
              </div>

              {/* RÜYA KARTI (9:16) */}
              <div className="my-auto flex flex-col items-center">
                <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl relative">
                  {dreamImage ? (
                    <img src={dreamImage} alt="Dream Visual" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-purple-900 to-black">🌌</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h4 className="text-lg font-bold text-white mb-1.5 leading-tight font-serif">{dreamTitle || (currentLang === 'tr' ? 'Bilinmeyen Rüya' : 'Unknown Dream')}</h4>
                    <p className="text-[9px] text-slate-300 italic mb-2">"{getDreamMotiv()}"</p>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(premiumAnalysis.archetypes) && premiumAnalysis.archetypes.slice(0, 2).map((arch, i) => (
                        <span key={i} className="text-[8px] font-semibold bg-violet-500/30 border border-violet-400/40 px-2 py-0.5 rounded-full text-violet-100">
                          ✦ {translateArchetype(arch)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ALT ÇAĞRI (SCREENSHOT BAĞLANTISI) */}
              <div className="text-center pb-2">
                <p className="text-[9px] text-white/40 tracking-wider mb-2">{currentLang === 'tr' ? 'Ekran görüntüsü al ve hikayende paylaş' : 'Screenshot and share on your story'}</p>
                <span className="inline-block px-3 py-1 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 text-[9px] font-bold text-fuchsia-300">
                  🔗 lunosfer.com
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Güvenli Dil Değer Okuma Yardımcısı
function getVal(obj, targetLang = 'en') {
  if (!obj) return ''
  if (typeof obj === 'string') return obj
  return obj[targetLang] || obj['en'] || Object.values(obj)[0] || ''
}
