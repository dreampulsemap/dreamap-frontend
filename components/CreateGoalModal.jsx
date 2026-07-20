import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import { useModalA11y } from '@/lib/useModalA11y'

export default function CreateGoalModal({ lang = 'en', onClose, onCreated }) {
  const t = getVisionBoardText(lang)
  const modalRef = useRef(null)
  useModalA11y(modalRef, onClose)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [roadmapInput, setRoadmapInput] = useState('')
  const [roadmap, setRoadmap] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function addRoadmapStep() {
    const clean = roadmapInput.trim()
    if (!clean) return
    setRoadmap((r) => [...r, clean])
    setRoadmapInput('')
  }

  function removeStep(index) {
    setRoadmap((r) => r.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    const cleanTitle = title.trim()
    if (!cleanTitle || submitting) return

    setSubmitting(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError(t.loginRequired)
        return
      }

      const res = await fetch('/api/goals/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: cleanTitle,
          description: description.trim() || null,
          target_date: targetDate || null,
          visibility,
          roadmap,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'error')
        return
      }

      onCreated?.(json.goal)
      onClose?.()
    } catch (err) {
      setError('network_error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label={t.createModalTitle} className="glass-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg">{t.createModalTitle}</h2>
          <button onClick={onClose} aria-label={lang === 'tr' ? 'Kapat' : 'Close'} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400 mb-1.5 block">{t.titleLabel}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.titlePlaceholder}
              maxLength={120}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500/50"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400 mb-1.5 block">{t.descriptionLabel}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.descriptionPlaceholder}
              maxLength={2000}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-400 mb-1.5 block">{t.targetDateLabel}</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-fuchsia-500/50"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-400 mb-1.5 block">{t.visibilityLabel}</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-fuchsia-500/50"
              >
                <option value="public" className="bg-black">{t.visibilityPublic}</option>
                <option value="friends" className="bg-black">{t.visibilityFriends}</option>
                <option value="private" className="bg-black">{t.visibilityPrivate}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400 mb-1.5 block">{t.roadmapLabel}</label>
            <div className="flex gap-2">
              <input
                value={roadmapInput}
                onChange={(e) => setRoadmapInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRoadmapStep() } }}
                placeholder={t.roadmapPlaceholder}
                maxLength={200}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500/50"
              />
              <button
                onClick={addRoadmapStep}
                type="button"
                className="px-4 rounded-xl bg-white/10 text-white hover:bg-white/20"
              >
                +
              </button>
            </div>
            {roadmap.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {roadmap.map((step, i) => (
                  <li key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5 text-sm text-slate-300">
                    <span className="truncate">{step}</span>
                    <button onClick={() => removeStep(i)} className="text-slate-500 hover:text-rose-400 ml-2">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white font-bold uppercase tracking-widest text-sm hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {submitting ? t.creating : t.createSubmitBtn}
          </button>
        </div>
      </div>
    </div>
  )
}
