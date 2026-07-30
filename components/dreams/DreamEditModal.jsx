import { useEffect, useState } from 'react'
import { Image as ImageIcon, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import TagInput from '@/components/TagInput'
import PixabayPicker from '@/components/PixabayPicker'

export default function DreamEditModal({ dream, onClose, onSave, saving, lang = 'tr' }) {
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [inFeed, setInFeed] = useState(true)
  const [tags, setTags] = useState([])
  const [image, setImage] = useState(null) // { url, width, height, source }
  const [showPixabayPicker, setShowPixabayPicker] = useState(false)
  const [pixabayError, setPixabayError] = useState('')

  useEffect(() => {
    if (dream) {
      setContent(dream.content || '')
      setLocation(dream.location_name || '')
      setVisibility(dream.visibility || 'public')
      setInFeed(dream.in_feed ?? true)
      setTags(Array.isArray(dream.tags) ? dream.tags : [])
      setImage(dream.ai_image_url ? { url: dream.ai_image_url, source: dream.image_source } : null)
    }
  }, [dream])

  async function handlePickPixabayImage(hit) {
    setPixabayError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/dreams/pixabay-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          pixabayId: hit.id,
          imageUrl: hit.largeImageURL || hit.webformatURL,
          tags: hit.tags,
          pixabayUser: hit.user,
          width: hit.width,
          height: hit.height,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setPixabayError(json.error || 'error')
        return false
      }
      setImage({ url: json.url, width: json.width, height: json.height, source: 'pixabay' })
      return true
    } catch {
      setPixabayError('network_error')
      return false
    }
  }

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

          <div className="mb-4 rounded-[1.2rem] border border-white/10 bg-black/30 p-4">
            <TagInput tags={tags} onChange={setTags} lang={lang} />
          </div>

          <div className="mb-4 rounded-[1.2rem] border border-white/10 bg-black/30 p-4">
            <p className="mb-3 text-xs uppercase tracking-widest text-slate-400 font-bold">
              {lang === 'tr' ? 'Kapak Görseli' : 'Cover Image'}
            </p>
            {image?.url ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                <img src={image.url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImage(null)}
                  aria-label={lang === 'tr' ? 'Görseli kaldır' : 'Remove image'}
                  className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPixabayPicker(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-5 text-sm text-slate-400 hover:border-fuchsia-400/40 hover:text-fuchsia-200 transition-all"
              >
                <ImageIcon size={16} />
                {lang === 'tr' ? "Pixabay'dan Seç" : 'Choose From Pixabay'}
              </button>
            )}
            {image?.url && (
              <button
                onClick={() => setShowPixabayPicker(true)}
                className="mt-2 text-xs text-fuchsia-300 hover:text-fuchsia-200"
              >
                {lang === 'tr' ? 'Değiştir' : 'Change'}
              </button>
            )}
            {pixabayError && (
              <p className="mt-2 text-[10px] text-rose-400">
                {lang === 'tr' ? 'Görsel eklenemedi, tekrar dene.' : 'Could not add the image, please try again.'}
              </p>
            )}
          </div>

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
                  tags,
                  ...((image?.url || null) !== (dream.ai_image_url || null) ? {
                    ai_image_url: image?.url || null,
                    image_source: image?.url ? (image.source || 'pixabay') : null,
                    image_width: image?.width || null,
                    image_height: image?.height || null,
                  } : {}),
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

      {showPixabayPicker && (
        <PixabayPicker
          lang={lang}
          videoEnabled={false}
          onPickImage={handlePickPixabayImage}
          onClose={() => setShowPixabayPicker(false)}
        />
      )}
    </div>
  )
}