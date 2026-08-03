import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import TagInput from '@/components/TagInput'

export default function AdminDreamEditModal({ dream, onClose, onSave, saving, onDelete, deleting }) {
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [inFeed, setInFeed] = useState(true)
  const [tags, setTags] = useState([])
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    if (dream) {
      setContent(dream.content || '')
      setLocation(dream.location_name || '')
      setVisibility(dream.visibility || 'public')
      setInFeed(dream.in_feed ?? true)
      setTags(Array.isArray(dream.tags) ? dream.tags : [])
      setConfirmingDelete(false)
    }
  }, [dream])

  if (!dream) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#141822] p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Rüya Düzenleyici</p>
            <h2 className="mt-1 text-lg font-bold text-white">#{dream.id}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Kapat"
          >
            <X size={16} />
          </button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mb-4 min-h-[160px] w-full rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white placeholder:text-white/30 focus:border-amber-500/40 focus:outline-none"
          placeholder="Rüyanın içeriği..."
        />

        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Konum"
          className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-amber-500/40 focus:outline-none"
        />

        <div className="mb-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <TagInput tags={tags} onChange={setTags} lang="tr" />
        </div>

        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white focus:border-amber-500/40 focus:outline-none"
        >
          <option value="public" className="bg-black">Herkese Açık</option>
          <option value="friends" className="bg-black">Arkadaşlar</option>
          <option value="private" className="bg-black">Gizli</option>
        </select>

        <label className="mb-6 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={inFeed}
            onChange={(e) => setInFeed(e.target.checked)}
            className="h-4 w-4 accent-amber-500"
          />
          Feed&apos;de göster
        </label>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          {!confirmingDelete ? (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300"
            >
              Rüyayı Sil
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-300">Emin misin? Bu geri alınamaz.</span>
              <button
                onClick={onDelete}
                disabled={deleting}
                className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-400 disabled:opacity-40"
              >
                {deleting ? 'Siliniyor…' : 'Evet, Sil'}
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Vazgeç
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
            >
              İptal
            </button>
            <button
              onClick={() =>
                onSave({
                  content,
                  location_name: location,
                  visibility,
                  in_feed: inFeed,
                  tags,
                })
              }
              disabled={saving}
              className="rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-40"
            >
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
