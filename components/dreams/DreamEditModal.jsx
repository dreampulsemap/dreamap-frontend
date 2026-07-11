import { useEffect, useState } from 'react'

export default function DreamEditModal({ dream, onClose, onSave, saving }) {
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [inFeed, setInFeed] = useState(true)

  useEffect(() => {
    if (dream) {
      setContent(dream.content || '')
      setLocation(dream.location_name || '')
      setVisibility(dream.visibility || 'public')
      setInFeed(dream.in_feed ?? true)
    }
  }, [dream])

  if (!dream) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#060912]/95 p-6 shadow-[0_0_80px_rgba(139,92,246,0.18)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.12),transparent_28%)]" />

        <div className="relative">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-slate-500">
                Dream Editor
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Rüyayı Düzenle</h2>
            </div>

            <button
              onClick={onClose}
              className="energy-button inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mb-4 min-h-[180px] w-full rounded-[1.4rem] border border-white/10 bg-black/30 p-4 text-white placeholder:text-white/30 focus:border-violet-400/30 focus:outline-none"
            placeholder="Rüyanın içeriğini güncelle..."
          />

          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Konum"
            className="mb-4 w-full rounded-[1.2rem] border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-white/30 focus:border-cyan-400/30 focus:outline-none"
          />

          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="mb-4 w-full rounded-[1.2rem] border border-white/10 bg-black/30 px-4 py-3 text-white focus:border-violet-400/30 focus:outline-none"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="friends">Friends</option>
          </select>

          <label className="mb-6 flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={inFeed}
              onChange={(e) => setInFeed(e.target.checked)}
              className="h-4 w-4 accent-violet-500"
            />
            Feed'de göster
          </label>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={onClose}
              className="energy-button rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10"
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
                })
              }
              disabled={saving}
              className="energy-button rounded-full border border-violet-300/18 bg-violet-500/12 px-5 py-2.5 text-sm font-medium text-violet-100 hover:border-violet-300/34 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}