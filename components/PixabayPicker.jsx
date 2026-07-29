import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Search, Loader2 } from 'lucide-react'
import { useModalA11y } from '@/lib/useModalA11y'

// Vizyon panosuna Pixabay'den görsel seçmek için arama modalı.
// Seçim yapıldığında gerçek indirme/kaydetme işini `onPick` (parent'ta
// tanımlı, /api/goals/add-image-from-pixabay çağıran async fonksiyon)
// yapar — bu bileşen sadece arama/seçim UI'ı.

const QUICK_TAGS = {
  tr: ['hayaller', 'hedefler', 'motivasyon', 'doğa', 'seyahat', 'başarı', 'meditasyon'],
  en: ['dreams', 'goals', 'motivation', 'nature', 'travel', 'success', 'meditation'],
}

export default function PixabayPicker({ lang = 'en', onPick, onClose }) {
  const modalRef = useRef(null)
  useModalA11y(modalRef, onClose)

  const [query, setQuery] = useState('')
  const [hits, setHits] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectingId, setSelectingId] = useState(null)
  const debounceRef = useRef(null)

  const search = useCallback(
    async (q, targetPage, replace) => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ q, page: String(targetPage), lang })
        const res = await fetch(`/api/pixabay/search?${params.toString()}`)
        const json = await res.json()
        if (!res.ok) {
          setError(json.error || 'error')
          return
        }
        setHits((prev) => (replace ? json.hits || [] : [...prev, ...(json.hits || [])]))
        setHasMore(!!json.hasMore)
        setPage(targetPage)
      } catch {
        setError('network_error')
      } finally {
        setLoading(false)
      }
    },
    [lang]
  )

  // İlk açılışta ilham verici bir varsayılan aramayla başla
  useEffect(() => {
    const initial = lang === 'tr' ? 'hayaller' : 'dreams'
    setQuery(initial)
    search(initial, 1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleQueryChange(value) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      search(value.trim(), 1, true)
    }, 450)
  }

  function handleQuickTag(tag) {
    setQuery(tag)
    search(tag, 1, true)
  }

  async function handleSelect(hit) {
    if (selectingId) return
    setSelectingId(hit.id)
    try {
      const ok = await onPick(hit)
      if (ok) onClose?.()
    } finally {
      setSelectingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Pixabay"
        className="glass-card w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto animate-scale-in"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-white font-bold text-lg">
              {lang === 'tr' ? 'Pixabay\u2019dan Görsel Seç' : 'Choose an Image From Pixabay'}
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              {lang === 'tr'
                ? 'Telifsiz, ücretsiz kullanılabilir görseller.'
                : 'Free-to-use, royalty-free images.'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={lang === 'tr' ? 'Kapat' : 'Close'}
            className="text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={lang === 'tr' ? 'Görsel ara...' : 'Search images...'}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {(QUICK_TAGS[lang] || QUICK_TAGS.en).map((tag) => (
            <button
              key={tag}
              onClick={() => handleQuickTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                query === tag ? 'bg-fuchsia-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {error && !loading && (
          <p className="text-rose-400 text-xs mb-3">
            {lang === 'tr' ? 'Görseller yüklenemedi.' : 'Could not load images.'}
          </p>
        )}

        {!error && !loading && hits.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-8">
            {lang === 'tr' ? 'Sonuç bulunamadı.' : 'No results found.'}
          </p>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {hits.map((hit) => (
            <button
              key={hit.id}
              onClick={() => handleSelect(hit)}
              disabled={!!selectingId}
              className="relative aspect-square rounded-lg overflow-hidden bg-black/30 group disabled:opacity-60"
            >
              <img
                src={hit.previewURL}
                alt={hit.tags?.join(', ') || 'Pixabay'}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              {selectingId === hit.id && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <Loader2 size={20} className="text-white animate-spin" />
                </div>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="text-slate-500 animate-spin" />
          </div>
        )}

        {!loading && hasMore && hits.length > 0 && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => search(query.trim(), page + 1, false)}
              className="px-6 py-2 rounded-full bg-white/5 text-slate-300 text-xs font-bold uppercase tracking-widest hover:bg-white/10"
            >
              {lang === 'tr' ? 'Daha Fazla' : 'Load More'}
            </button>
          </div>
        )}

        <p className="text-slate-600 text-[10px] text-center mt-5">
          {lang === 'tr' ? 'Görseller Pixabay tarafından sağlanmaktadır.' : 'Images provided by Pixabay.'}
        </p>
      </div>
    </div>
  )
}
