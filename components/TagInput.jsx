import { useState } from 'react'
import { X } from 'lucide-react'

const MAX_TAGS = 10
const MAX_TAG_LENGTH = 30

export default function TagInput({ tags = [], onChange, lang = 'en' }) {
  const [draft, setDraft] = useState('')

  function normalize(raw) {
    return String(raw || '').trim().toLowerCase().replace(/^#/, '').slice(0, MAX_TAG_LENGTH)
  }

  function addTag(raw) {
    const clean = normalize(raw)
    if (!clean) return
    if (tags.includes(clean)) {
      setDraft('')
      return
    }
    if (tags.length >= MAX_TAGS) return
    onChange([...tags, clean])
    setDraft('')
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag))
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(draft)
    } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const atLimit = tags.length >= MAX_TAGS

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
          {lang === 'tr' ? 'Etiketler' : 'Tags'}
        </label>
        <span className="text-[10px] font-mono text-slate-500">{tags.length} / {MAX_TAGS}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-400/30 px-3 py-1 text-xs text-fuchsia-100"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={lang === 'tr' ? `${tag} etiketini kaldır` : `Remove ${tag} tag`}
              className="text-fuchsia-300 hover:text-white"
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>

      {!atLimit && (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => draft && addTag(draft)}
          placeholder={lang === 'tr' ? 'Etiket yaz, Enter\u2019a bas...' : 'Type a tag, press Enter...'}
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-fuchsia-500/50 focus:outline-none"
        />
      )}
      {atLimit && (
        <p className="text-[10px] text-slate-500">
          {lang === 'tr' ? 'Maksimum etiket sayısına ulaştın.' : 'You\u2019ve reached the maximum number of tags.'}
        </p>
      )}
    </div>
  )
}
