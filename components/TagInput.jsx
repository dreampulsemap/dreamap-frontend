import { useState } from 'react'
import { X } from 'lucide-react'

const MAX_TAGS = 10
const MAX_TAG_LENGTH = 30

// YENİ: 8 dile genişletildi (önceden sadece tr/en vardı)
const TEXT = {
  en: {
    label: 'Tags',
    removeAria: (tag) => `Remove ${tag} tag`,
    placeholder: 'Type a tag, press Enter...',
    limitReached: 'You\u2019ve reached the maximum number of tags.',
  },
  tr: {
    label: 'Etiketler',
    removeAria: (tag) => `${tag} etiketini kaldır`,
    placeholder: 'Etiket yaz, Enter\u2019a bas...',
    limitReached: 'Maksimum etiket sayısına ulaştın.',
  },
  es: {
    label: 'Etiquetas',
    removeAria: (tag) => `Quitar etiqueta ${tag}`,
    placeholder: 'Escribe una etiqueta y pulsa Enter...',
    limitReached: 'Has alcanzado el número máximo de etiquetas.',
  },
  fr: {
    label: 'Étiquettes',
    removeAria: (tag) => `Retirer l’étiquette ${tag}`,
    placeholder: 'Tape une étiquette et appuie sur Entrée...',
    limitReached: 'Tu as atteint le nombre maximum d’étiquettes.',
  },
  de: {
    label: 'Tags',
    removeAria: (tag) => `Tag ${tag} entfernen`,
    placeholder: 'Tag eingeben und Enter drücken...',
    limitReached: 'Du hast die maximale Anzahl an Tags erreicht.',
  },
  pt: {
    label: 'Etiquetas',
    removeAria: (tag) => `Remover etiqueta ${tag}`,
    placeholder: 'Digite uma etiqueta e pressione Enter...',
    limitReached: 'Você atingiu o número máximo de etiquetas.',
  },
  ru: {
    label: 'Теги',
    removeAria: (tag) => `Удалить тег ${tag}`,
    placeholder: 'Введите тег и нажмите Enter...',
    limitReached: 'Вы достигли максимального количества тегов.',
  },
  ja: {
    label: 'タグ',
    removeAria: (tag) => `${tag}タグを削除`,
    placeholder: 'タグを入力してEnterを押す...',
    limitReached: 'タグの上限に達しました。',
  },
}

function getText(lang) {
  const base = String(lang || 'en').toLowerCase().split('-')[0]
  return TEXT[base] || TEXT.en
}

export default function TagInput({ tags = [], onChange, lang = 'en' }) {
  const [draft, setDraft] = useState('')
  const text = getText(lang)

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
          {text.label}
        </label>
        <span className="text-[10px] font-mono text-slate-500">{tags.length} / {MAX_TAGS}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary-500/15 border border-brand-primary-400/30 px-3 py-1 text-xs text-brand-primary-100"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={text.removeAria(tag)}
              className="text-brand-primary-300 hover:text-white"
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
          placeholder={text.placeholder}
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-brand-primary-500/50 focus:outline-none"
        />
      )}
      {atLimit && (
        <p className="text-[10px] text-slate-500">
          {text.limitReached}
        </p>
      )}
    </div>
  )
}
