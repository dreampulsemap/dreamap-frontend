import { useCallback, useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ImageOff, Loader2, Pencil, Search, Upload } from 'lucide-react'
import AdminAuthGate, { useAdminAuth } from '@/components/admin/AdminAuthGate'
import AdminDreamEditModal from '@/components/admin/AdminDreamEditModal'
import PixabayPicker from '@/components/PixabayPicker'
import Seo from '@/components/Seo'

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

function DreamThumb({ dream }) {
  const broken = dream.image_status === 'broken'
  const hasImage = !!dream.ai_image_url && !broken

  if (hasImage) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={dream.ai_image_url} alt="" className="w-full h-full object-cover" />
  }

  return (
    <div className="w-full h-full flex flex-col justify-between p-2.5 bg-gradient-to-br from-slate-800/60 to-black">
      <span className={`text-[9px] uppercase tracking-widest font-bold ${broken ? 'text-rose-400' : 'text-slate-500'}`}>
        {broken ? 'Bozuk' : 'GÃ¶rselsiz'}
      </span>
      <p className="text-[10px] text-white/60 leading-snug line-clamp-4 font-light">{dream.content}</p>
    </div>
  )
}

function DreamCard({ dream, onOpenPicker, onTriggerUpload, onEdit, busy }) {
  const displayName = dream.user?.display_name || dream.user?.username || 'Bilinmeyen kullanÄ±cÄ±'
  const title = dream.title || dream.content?.slice(0, 60)

  return (
    <div className="bg-[#141822] border border-white/10 rounded-xl overflow-hidden flex flex-col">
      <div className="aspect-square relative">
        <DreamThumb dream={dream} />
        <button
          type="button"
          onClick={() => onEdit(dream)}
          aria-label="RÃ¼yayÄ± dÃ¼zenle"
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
        >
          <Pencil size={12} />
        </button>
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-white text-xs font-medium line-clamp-2 leading-snug">{title}</p>
        <p className="text-slate-500 text-[11px]">@{displayName}</p>
        {Array.isArray(dream.tags) && dream.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {dream.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-400">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => onOpenPicker(dream.id)}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[10px] font-semibold hover:bg-white/10 disabled:opacity-40"
          >
            <Search size={11} /> Pixabay
          </button>
          <button
            type="button"
            onClick={() => onTriggerUpload(dream.id)}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-semibold hover:bg-amber-500/20 disabled:opacity-40"
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />} YÃ¼kle
          </button>
        </div>
      </div>
    </div>
  )
}

function DreamImages() {
  const { token, logout } = useAdminAuth()

  const [filter, setFilter] = useState('missing')
  const [dreams, setDreams] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const [pickerForDreamId, setPickerForDreamId] = useState(null)
  const [uploadTargetId, setUploadTargetId] = useState(null)
  const [uploadingDreamId, setUploadingDreamId] = useState(null)
  const fileInputRef = useRef(null)

  const [editingDream, setEditingDream] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingEdit, setDeletingEdit] = useState(false)

  const authedFetch = useCallback(
    (url, options = {}) =>
      fetch(url, {
        ...options,
        
        headers: {
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...options.headers,
        },

      }),
    [token]
  )

  const load = useCallback(
    async (pageNum, replace) => {
      replace ? setLoading(true) : setLoadingMore(true)
      setError('')
      try {
        const res = await authedFetch(`/api/admin/dreams/list?filter=${filter}&page=${pageNum}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'error')
        setDreams((prev) => (replace ? json.dreams : [...prev, ...json.dreams]))
        setHasMore(json.hasMore)
        setTotal(json.total)
        setPage(pageNum)
      } catch (err) {
        setError(err.message || 'YÃ¼klenemedi.')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [authedFetch, filter]
  )

  useEffect(() => {
    load(0, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  function patchDreamImage(dreamId, patch) {
    setDreams((list) => list.map((d) => (d.id === dreamId ? { ...d, ...patch } : d)))
  }

  async function handlePixabayPick(hit) {
    const dreamId = pickerForDreamId
    try {
      const res = await authedFetch('/api/admin/dreams/attach-image', {
        method: 'POST',
        body: JSON.stringify({ dreamId, hit }),
      })
      const json = await res.json()
      if (!res.ok) return false
      patchDreamImage(dreamId, { ai_image_url: json.url, image_status: 'ok' })
      return true
    } catch {
      return false
    }
  }

  function triggerUpload(dreamId) {
    setUploadTargetId(dreamId)
    fileInputRef.current?.click()
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    const dreamId = uploadTargetId
    if (!file || !dreamId) return

    if (!file.type?.startsWith('image/')) {
      setError('LÃ¼tfen bir gÃ¶rsel dosyasÄ± seÃ§.')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('GÃ¶rsel Ã§ok bÃ¼yÃ¼k (maks. 15MB).')
      return
    }

    setUploadingDreamId(dreamId)
    setError('')
    try {
      const dataBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('read_failed'))
        reader.readAsDataURL(file)
      })

      const res = await authedFetch('/api/admin/dreams/upload-image', {
        method: 'POST',
        body: JSON.stringify({ dreamId, fileName: file.name, fileType: file.type, dataBase64 }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setError(json.error === 'image_too_large' ? 'GÃ¶rsel Ã§ok bÃ¼yÃ¼k (maks. 15MB).' : 'YÃ¼kleme baÅŸarÄ±sÄ±z oldu.')
        return
      }
      patchDreamImage(dreamId, { ai_image_url: json.url, image_status: 'ok' })
    } catch {
      setError('YÃ¼kleme baÅŸarÄ±sÄ±z oldu.')
    } finally {
      setUploadingDreamId(null)
    }
  }

  async function handleSaveEdit(patch) {
    if (!editingDream) return
    setSavingEdit(true)
    setError('')
    try {
      const res = await authedFetch('/api/admin/dreams/update', {
        method: 'POST',
        body: JSON.stringify({ dreamId: editingDream.id, ...patch }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setError('Kaydedilemedi.')
        return
      }
      setDreams((list) => list.map((d) => (d.id === editingDream.id ? { ...d, ...json.dream } : d)))
      setEditingDream(null)
    } catch {
      setError('Kaydedilemedi.')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDeleteEdit() {
    if (!editingDream) return
    setDeletingEdit(true)
    setError('')
    try {
      const res = await authedFetch('/api/admin/dreams/delete', {
        method: 'POST',
        body: JSON.stringify({ dreamId: editingDream.id }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setError('Silinemedi.')
        return
      }
      setDreams((list) => list.filter((d) => d.id !== editingDream.id))
      setTotal((t) => (t !== null ? Math.max(0, t - 1) : t))
      setEditingDream(null)
    } catch {
      setError('Silinemedi.')
    } finally {
      setDeletingEdit(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0e14] text-white">
      <Seo title="RÃ¼ya GÃ¶rselleri â€” YÃ¶netim" noindex />
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-500 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-lg font-bold">RÃ¼ya YÃ¶netimi</h1>
              <p className="text-slate-500 text-xs mt-0.5">{total !== null ? `${total} rÃ¼ya` : '\u00A0'}</p>
            </div>
          </div>
          <button onClick={logout} className="text-xs text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors">
            Ã‡Ä±kÄ±ÅŸ
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setFilter('missing')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              filter === 'missing' ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            GÃ¶rselsiz / Bozuk
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              filter === 'all' ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            TÃ¼mÃ¼
          </button>
        </div>

        {error && <p className="text-rose-400 text-sm mb-4">{error}</p>}

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 size={22} className="text-slate-600 animate-spin" />
          </div>
        ) : dreams.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-center">
            <ImageOff size={28} className="text-slate-700" />
            <p className="text-slate-500 text-sm">{filter === 'missing' ? 'GÃ¶rselsiz/bozuk rÃ¼ya kalmadÄ± ğŸ‰' : 'HiÃ§ rÃ¼ya yok.'}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {dreams.map((dream) => (
                <DreamCard
                  key={dream.id}
                  dream={dream}
                  onOpenPicker={setPickerForDreamId}
                  onTriggerUpload={triggerUpload}
                  onEdit={setEditingDream}
                  busy={uploadingDreamId === dream.id}
                />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => load(page + 1, false)}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-full bg-white/5 text-slate-300 text-xs font-bold uppercase tracking-widest hover:bg-white/10 disabled:opacity-40"
                >
                  {loadingMore ? 'YÃ¼kleniyorâ€¦' : 'Daha Fazla'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      {pickerForDreamId && (
        <PixabayPicker lang="tr" videoEnabled={false} onPickImage={handlePixabayPick} onClose={() => setPickerForDreamId(null)} />
      )}

      {editingDream && (
        <AdminDreamEditModal
          dream={editingDream}
          onClose={() => setEditingDream(null)}
          onSave={handleSaveEdit}
          saving={savingEdit}
          onDelete={handleDeleteEdit}
          deleting={deletingEdit}
        />
      )}
    </div>
  )
}

export default function DreamImagesPage() {
  return (
    <AdminAuthGate>
      <DreamImages />
    </AdminAuthGate>
  )
}





