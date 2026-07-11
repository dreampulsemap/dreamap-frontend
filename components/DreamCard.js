import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '../lib/translations'
import { auth } from '../lib/supabase'

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
  const currentLang = lang || i18n.language || 'en'

  const [user, setUser] = useState(null)
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(dream.likes_count || 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentsCount, setCommentsCount] = useState(dream.comments_count || 0)
  const [commentsLoading, setCommentsLoading] = useState(false)

  const getDreamAnalysis = () =>
    dream[`ai_summary_${currentLang}`] ||
    dream.ai_summary ||
    dream.ai_summary_en ||
    ''

  const getDreamMotiv = () =>
    dream[`ai_motiv_${currentLang}`] ||
    dream.ai_motiv ||
    dream.ai_motiv_en ||
    ''

  const getDreamImage = () => dream.ai_image_url || null

  useEffect(() => {
    let mounted = true

    async function checkUser() {
      try {
        const currentUser = await auth.getUser()
        if (!mounted) return

        setUser(currentUser || null)

        if (currentUser) {
          await checkIfLiked(currentUser.id)
        }
      } catch (err) {
        console.error('User check error:', err)
      }
    }

    checkUser()

    return () => {
      mounted = false
    }
  }, [dream.id])

  async function checkIfLiked(userId) {
    try {
      const res = await fetch(`/api/like?dreamId=${dream.id}&userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setLiked(!!data.liked)
      }
    } catch (err) {
      console.error('Check like error:', err)
    }
  }

  async function handleLike() {
    if (!user) {
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

      if (res.ok) {
        const data = await res.json()
        setLiked(!liked)
        setLikesCount(
          data.count !== undefined
            ? data.count
            : liked
            ? likesCount - 1
            : likesCount + 1
        )
      }
    } catch (err) {
      console.error('Like error:', err)
    }
  }

  async function loadComments() {
    setCommentsLoading(true)

    try {
      const res = await fetch(`/api/comment?dreamId=${dream.id}`)
      const data = await res.json()
      setComments(data.comments || [])
    } catch (err) {
      console.error('Load comments error:', err)
    } finally {
      setCommentsLoading(false)
    }
  }

  async function handleAddComment() {
    if (!user) {
      alert(getTranslation('social.loginToComment', currentLang))
      return
    }

    if (!newComment.trim()) return

    try {
      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamId: dream.id,
          userId: user.id,
          content: newComment,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setComments([data.comment, ...comments])
        setNewComment('')
        setCommentsCount((prev) => prev + 1)
      }
    } catch (err) {
      console.error('Add comment error:', err)
    }
  }

  async function handleDeleteComment(commentId) {
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

    if (!confirm(confirmText)) return

    try {
      const res = await fetch('/api/comment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          userId: user.id,
        }),
      })

      if (res.ok) {
        setComments(comments.filter((c) => c.id !== commentId))
        setCommentsCount((prev) => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Delete comment error:', err)
    }
  }

  const displayContent = translated ? translatedContent : dream.content
  const displayAnalysis = translated ? translatedAnalysis : getDreamAnalysis()
  const dreamMotiv = useMemo(() => getDreamMotiv(), [dream, currentLang])
  const dreamImage = useMemo(() => getDreamImage(), [dream])

  const sentimentLabel = dream.user_selected_sentiment
    ? getTranslation(
        `emotion.${String(dream.user_selected_sentiment).toLowerCase()}`,
        currentLang
      )
    : null

  return (
    <article className="glass-card hover-lift overflow-hidden">
      {dreamImage && (
        <div className="dream-image relative h-64 w-full overflow-hidden bg-black">
          <img
            src={dreamImage}
            alt="Dream"
            className="h-full w-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none'
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
            onClick={() => onTranslate(dream)}
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

        {displayAnalysis && (
          <div className="mb-5 rounded-[1.5rem] border border-violet-300/18 bg-violet-500/8 p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg text-violet-200">🜂</span>
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-100">
                {getTranslation('feed.jungianAnalysis', currentLang)}
              </span>
            </div>

            <p className="text-sm leading-7 text-white/82">{displayAnalysis}</p>

            {dreamMotiv && (
              <div className="mt-4 border-t border-violet-300/14 pt-3">
                <p className="text-xs italic text-violet-100/78">💫 {dreamMotiv}</p>
              </div>
            )}
          </div>
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
              if (nextValue) {
                loadComments()
              }
            }}
            className="energy-button inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 hover:bg-cyan-500/10"
          >
            <span>💬</span>
            <span>{commentsCount}</span>
          </button>
        </div>

        {showComments && (
          <div className="mt-5 border-t border-white/10 pt-5">
            {user && (
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
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

                      {user && user.id === comment.user_id && (
                        <bu