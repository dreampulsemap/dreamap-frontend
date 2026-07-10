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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6">
        <h2 className="text-xl font-bold mb-4">Rüyayı Düzenle</h2>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full border rounded-lg p-3 min-h-[140px] mb-3"
        />

        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Konum"
          className="w-full border rounded-lg px-3 py-2 mb-3"
        />

        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mb-3"
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
          <option value="friends">Friends</option>
        </select>

        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={inFeed}
            onChange={(e) => setInFeed(e.target.checked)}
          />
          Feed'de göster
        </label>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200"
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
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}