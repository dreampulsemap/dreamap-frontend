import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

export default function GoalDetailModal({ goal: initialGoal, lang = 'en', currentUserId, onClose, onChanged, onDeleted }) {
  const t = getVisionBoardText(lang)
  const [goal, setGoal] = useState(initialGoal)
  const [microGoals, setMicroGoals] = useState(initialGoal.micro_goals || [])
  const [newStep, setNewStep] = useState('')
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [resolveMode, setResolveMode] = useState(null) // 'completed' | 'abandoned' | null
  const [story, setStory] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isOwner = currentUserId && goal.user_id === currentUserId

  useEffect(() => {
    let active = true
    authHeader().then((headers) => {
      fetch(`/api/goals/comment?goalId=${goal.id}`, { headers: headers || {} })
        .then((r) => r.json())
        .then((json) => { if (active) setComments(json.comments || []) })
        .catch(() => {})
    })
    return () => { active = false }
  }, [goal.id])

  async function toggleStep(microGoalId) {
    const headers = await authHeader()
    if (!headers) return setError(t.loginRequired)
    try {
      const res = await fetch('/api/micro-goals/toggle', {
        method: 'POST',
        headers,
        body: JSON.stringify({ microGoalId }),
      })
      const json = await res.json()
      if (!res.ok) return setError(json.error)

      setMicroGoals((list) => list.map((m) => (m.id === microGoalId ? json.microGoal : m)))
      if (json.goal) {
        const updated = { ...goal, completion_percentage: json.goal.completion_percentage }
        setGoal(updated)
        onChanged?.(updated)
      }
    } catch {
      setError('network_error')
    }
  }

  async function addStep() {
    const clean = newStep.trim()
    if (!clean || !isOwner) return
    const headers = await authHeader()
    if (!headers) return setError(t.loginRequired)
    try {
      const res = await fetch('/api/micro-goals/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({ goalId: goal.id, title: clean }),
      })
      const json = await res.json()
      if (!res.ok) return setError(json.error)
      setMicroGoals((list) => [...list, json.microGoal])
      setNewStep('')
    } catch {
      setError('network_error')
    }
  }

  async function postComment() {
    const clean = newComment.trim()
    if (!clean) return
    const headers = await authHeader()
    if (!headers) return setError(t.loginRequired)
    try {
      const res = await fetch('/api/goals/comment', {
        method: 'POST',
        headers,
        body: JSON.stringify({ goalId: goal.id, content: clean }),
      })
      const json = await res.json()
      if (!res.ok) return setError(json.error)
      setComments((c) => [json.comment, ...c])
      setNewComment('')
    } catch {
      setError('network_error')
    }
  }

  async function resolveGoal() {
    setBusy(true)
    setError('')
    try {
      const headers = await authHeader()
      if (!headers) { setError(t.loginRequired); return }
      const res = await fetch('/api/goals/update-status', {
        method: 'POST',
        headers,
        body: JSON.stringify({ goalId: goal.id, status: resolveMode, story: story.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); return }
      setGoal(json.goal)
      onChanged?.(json.goal)
      setResolveMode(null)
    } catch {
      setError('network_error')
    } finally {
      setBusy(false)
    }
  }

  async function deleteGoal() {
    if (!window.confirm(t.deleteConfirm)) return
    setBusy(true)
    try {
      const headers = await authHeader()
      if (!headers) { setError(t.loginRequired); return }
      const res = await fetch('/api/goals/delete', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ goalId: goal.id }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); return }
      onDeleted?.(goal.id)
      onClose?.()
    } catch {
      setError('network_error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="glass-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-white font-bold text-lg">{goal.title}</h2>
            {goal.description && <p className="text-slate-400 text-sm mt-1">{goal.description}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        {goal.status === 'completed' && goal.victory_story && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1">{t.victoryWallTitle}</p>
            <p className="text-slate-200 text-sm">{goal.victory_story}</p>
          </div>
        )}
        {goal.status === 'abandoned' && goal.abandon_reason && (
          <div className="mb-4 p-3 rounded-xl bg-slate-500/10 border border-slate-500/20">
            <p className="text-slate-300 text-xs font-bold uppercase tracking-widest mb-1">{t.phoenixWallTitle}</p>
            <p className="text-slate-200 text-sm">{goal.abandon_reason}</p>
          </div>
        )}

        {/* YOL HARİTASI */}
        <div className="mb-5">
          <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-2">{t.roadmapSectionTitle}</h3>
          {microGoals.length === 0 && <p className="text-slate-500 text-sm">{t.noSteps}</p>}
          <ul className="space-y-1.5">
            {microGoals.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <button
                  onClick={() => toggleStep(m.id)}
                  disabled={!isOwner}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs shrink-0 ${
                    m.is_completed ? 'bg-cyan-400 border-cyan-400 text-black' : 'border-white/20 text-transparent'
                  } ${isOwner ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  ✓
                </button>
                <span className={`text-sm ${m.is_completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                  {m.title}
                </span>
              </li>
            ))}
          </ul>
          {isOwner && goal.status === 'active' && (
            <div className="flex gap-2 mt-2">
              <input
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addStep() }}
                placeholder={t.addStepPlaceholder}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <button onClick={addStep} className="px-3 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20">+</button>
            </div>
          )}
        </div>

        {/* SAHİP AKSİYONLARI */}
        {isOwner && goal.status === 'active' && (
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setResolveMode('completed')}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500/90 text-black text-xs font-bold uppercase tracking-widest hover:opacity-90"
            >
              {t.markCompleteBtn}
            </button>
            <button
              onClick={() => setResolveMode('abandoned')}
              className="flex-1 py-2.5 rounded-xl bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-widest hover:bg-white/20"
            >
              {t.releaseGoalBtn}
            </button>
          </div>
        )}

        {resolveMode && (
          <div className="mb-5 p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="text-white font-bold text-sm mb-1">
              {resolveMode === 'completed' ? t.completeModalTitle : t.releaseModalTitle}
            </h4>
            <p className="text-slate-400 text-xs mb-3">
              {resolveMode === 'completed' ? t.completeModalDesc : t.releaseModalDesc}
            </p>
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder={t.storyPlaceholder}
              rows={3}
              maxLength={2000}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none resize-none mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={resolveGoal}
                disabled={busy}
                className="flex-1 py-2 rounded-lg bg-fuchsia-500 text-white text-xs font-bold uppercase tracking-widest disabled:opacity-40"
              >
                {t.confirmBtn}
              </button>
              <button
                onClick={() => setResolveMode(null)}
                className="flex-1 py-2 rounded-lg bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-widest"
              >
                {t.cancelBtn}
              </button>
            </div>
          </div>
        )}

        {isOwner && (
          <button
            onClick={deleteGoal}
            disabled={busy}
            className="text-rose-400 text-xs font-bold uppercase tracking-widest mb-5 hover:text-rose-300"
          >
            {t.deleteGoalBtn}
          </button>
        )}

        {error && <p className="text-rose-400 text-sm mb-3">{error}</p>}

        {/* YORUMLAR */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-2">💬 {comments.length}</h3>
          <div className="flex gap-2 mb-3">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') postComment() }}
              placeholder="..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none"
            />
            <button onClick={postComment} className="px-3 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20">↑</button>
          </div>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {comments.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="text-cyan-300 font-semibold">
                  {c.user_profiles?.display_name || c.user_profiles?.username || '...'}
                </span>{' '}
                <span className="text-slate-300">{c.content}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
