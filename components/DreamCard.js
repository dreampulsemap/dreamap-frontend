import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '../lib/translations'
import { auth } from '../lib/supabase' 

export default function DreamCard({ dream, lang, onTranslate, translating, translated, translatedContent, translatedAnalysis }) {
  const { i18n } = useTranslation()
  const [user, setUser] = useState(null)
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(dream.likes_count || 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentsCount, setCommentsCount] = useState(dream.comments_count || 0)

  const getDreamAnalysis = () => dream[`ai_summary_${lang}`] || dream.ai_summary || dream.ai_summary_en || ''
  const getDreamMotiv = () => dream[`ai_motiv_${lang}`] || dream.ai_motiv || dream.ai_motiv_en || ''
  const getDreamImage = () => dream.ai_image_url || null

  useEffect(() => {
    async function checkUser() {
      const currentUser = await auth.getUser()
      setUser(currentUser)
      if (currentUser) {
        checkIfLiked(currentUser.id)
      }
    }
    checkUser()
  }, [])

  async function checkIfLiked(userId) {
    try {
      const res = await fetch(`/api/like?dreamId=${dream.id}&userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setLiked(data.liked)
      }
    } catch (err) {
      console.error('Check like error:', err)
    }
  }

  async function handleLike() {
    if (!user) {
      alert(getTranslation('social.loginToLike', lang))
      return
    }

    const method = liked ? 'DELETE' : 'POST'
    try {
      const res = await fetch('/api/like', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dreamId: dream.id, userId: user.id })
      })

      if (res.ok) {
        const data = await res.json()
        setLiked(!liked)
        setLikesCount(data.count !== undefined ? data.count : (liked ? likesCount - 1 : likesCount + 1))
      }
    } catch (err) {
      console.error('Like error:', err)
    }
  }

  async function loadComments() {
    try {
      const res = await fetch(`/api/comment?dreamId=${dream.id}`)
      const data = await res.json()
      setComments(data.comments || [])
    } catch (err) {
      console.error('Load comments error:', err)
    }
  }

  async function handleAddComment() {
    if (!user) {
      alert(getTranslation('social.loginToComment', lang))
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
          content: newComment
        })
      })

      if (res.ok) {
        const data = await res.json()
        setComments([data.comment, ...comments])
        setNewComment('')
        setCommentsCount(commentsCount + 1)
      }
    } catch (err) {
      console.error('Add comment error:', err)
    }
  }

  async function handleDeleteComment(commentId) {
    if (!confirm('Yorumu silmek istediğine emin misin?')) return

    try {
      const res = await fetch('/api/comment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, userId: user.id })
      })

      if (res.ok) {
        setComments(comments.filter(c => c.id !== commentId))
        setCommentsCount(commentsCount - 1)
      }
    } catch (err) {
      console.error('Delete comment error:', err)
    }
  }

  const displayContent = translated ? translatedContent : dream.content
  const displayAnalysis = translated ? translatedAnalysis : getDreamAnalysis()

  return (
    <div className="glass-card overflow-hidden hover:scale-[1.01] transition-transform">
      {getDreamImage() && (
        <div className="relative w-full h-64 overflow-hidden bg-black">
          <img 
            src={getDreamImage()} 
            alt="Dream"
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        </div>
      )}
      
      <div className="p-6">
        {dream.ai_archetypes && dream.ai_archetypes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {dream.ai_archetypes.map((arch, i) => (
              <span key={i} className="glass-card px-3 py-1 text-xs text-purple-300 border border-purple-500/30">
                {arch}
              </span>
            ))}
          </div>
        )}

        <p className="text-white/90 text-lg mb-6 leading-relaxed whitespace-pre-wrap">
          {displayContent}
        </p>

        {dream.original_language !== lang && dream.content && (
          <button
            onClick={() => onTranslate && onTranslate(dream)}
            disabled={translating}
            className="w-full glass-card px-4 py-2 mb-4 text-sm hover:bg-purple-500/20 transition-all disabled:opacity-50"
          >
            {translating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                Çevriliyor...
              </span>
            ) : translated ? (
              '🔄 Orijinali Göster'
            ) : (
              `🌐 ${lang.toUpperCase()} Diline Çevir`
            )}
          </button>
        )}

        {displayAnalysis && (
          <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🔮</span>
              <span className="font-semibold text-purple-300">{getTranslation('feed.jungianAnalysis', lang)}</span>
            </div>
            <p className="text-white/80 text-sm leading-relaxed mb-2">{displayAnalysis}</p>
            {getDreamMotiv() && (
              <div className="pt-2 border-t border-purple-500/30 mt-2">
                <p className="text-white/60 text-xs italic">💫 {getDreamMotiv()}</p>
              </div>
            )}
          </div>
        )}

        {/* Beğeni ve Yorum Butonları */}
        <div className="flex items-center gap-4 pt-4 border-t border-white/10">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              liked ? 'bg-red-500/20 text-red-400' : 'glass-card hover:bg-red-500/10 text-white/80'
            }`}
          >
            <span>{liked ? '❤️' : '🤍'}</span>
            <span className="text-sm">{likesCount}</span>
          </button>

          <button
            onClick={() => {
              setShowComments(!showComments)
              if (!showComments) loadComments()
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card hover:bg-blue-500/10 text-white/80 transition-all"
          >
            <span>💬</span>
            <span className="text-sm">{commentsCount}</span>
          </button>
        </div>

        {/* Yorumlar Bölümü */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-white/10">
            {user && (
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder={getTranslation('social.addComment', lang)}
                  className="flex-1 bg-black/40 border border-white/20 rounded-lg px-4 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="glass-card px-4 py-2 text-sm hover:bg-purple-500/20 disabled:opacity-50"
                >
                  {getTranslation('social.send', lang)}
                </button>
              </div>
            )}

            {comments.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-4">
                {getTranslation('social.noComments', lang)}
              </p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="glass-card p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-purple-300">
                          {comment.user_profiles?.display_name || comment.user_profiles?.username || 'Anonim'}
                        </span>
                        <span className="text-xs text-white/40">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {user && user.id === comment.user_id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          {getTranslation('social.delete', lang)}
                        </button>
                      )}
                    </div>
                    <p className="text-white/80 text-sm">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/10 text-sm text-white/60 mt-4">
          <span>📅 {dream.dream_date}</span>
          <span>📍 {dream.location_name}</span>
          <span>🌐 {dream.original_language?.toUpperCase()}</span>
          {dream.user_selected_sentiment && <span>💭 {dream.user_selected_sentiment}</span>}
        </div>
      </div>
    </div>
  )
            }
