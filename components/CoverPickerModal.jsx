import { useState, useRef } from 'react'
import { X, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useModalA11y } from '@/lib/useModalA11y'

// Vizyon oluşturma akışının SON adımı: videoya eklenen GÖRSELLER (videolar
// hariç — bir video karesinden kapak çıkarmıyoruz, basit tutuyoruz) arasından
// tek dokunuşla kapak seçtirir. /api/goals/set-cover'a kaydeder. "Atla"
// dendiğinde goal kapaksız kalır (create.js zaten null kapakla oluşturuyor,
// bu ekran sadece opsiyonel bir tamamlama adımı).
export default function CoverPickerModal({ lang = 'en', goalId, images, onDone }) {
  const modalRef = useRef(null)
  useModalA11y(modalRef, onDone)
  const [savingUrl, setSavingUrl] = useState(null)
  const [error, setError] = useState('')

  async function pick(img) {
    if (savingUrl) return
    setSavingUrl(img.url)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('login_required'); setSavingUrl(null); return }

      let finalUrl = img.url
      let finalSource = img.source || 'user_upload'

      // Cihazdan seçilen görseller video düzenleme sırasında blob: URL olarak
      // kalıyor (kalıcı depoya hiç yüklenmedi — bkz. CreateGoalModal üstteki
      // not). Kapak olarak seçilince ŞİMDİ kalıcı bir URL'e ihtiyaç var,
      // yoksa cover_image_url sayfa kapanınca geçersiz bir blob: referansı
      // olarak kalır. Pixabay'den gelenler zaten kalıcı (https:), dokunmuyoruz.
      if (finalUrl.startsWith('blob:')) {
        const blob = await (await fetch(finalUrl)).blob()
        const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
        const filePath = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('goal-covers')
          .upload(filePath, blob, { cacheControl: '3600', upsert: true, contentType: blob.type || 'image/jpeg' })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('goal-covers').getPublicUrl(filePath)
        finalUrl = data.publicUrl
        finalSource = 'user_upload'
      }

      const res = await fetch('/api/goals/set-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ goalId, coverImageUrl: finalUrl, coverImageSource: finalSource }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'error'); setSavingUrl(null); return }
      onDone?.(json.goal)
    } catch (_) {
      setError('network_error')
      setSavingUrl(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={lang === 'tr' ? 'Kapak Seç' : 'Choose Cover'}
        className="glass-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-white font-bold text-lg">{lang === 'tr' ? 'Kapak Fotoğrafını Seç' : 'Choose a Cover Photo'}</h2>
          <button onClick={() => onDone?.(null)} aria-label={lang === 'tr' ? 'Kapat' : 'Close'} className="text-slate-400 hover:text-white shrink-0">
            <X size={20} />
          </button>
        </div>
        <p className="text-slate-400 text-xs mb-4">
          {lang === 'tr'
            ? 'Videoya eklediğin görsellerden biri vizyonunun kapağı olsun.'
            : "Pick one of the images you added to your video as your vision's cover."}
        </p>

        {images.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">
            {lang === 'tr' ? 'Videoda kapak yapılabilecek bir görsel yok.' : 'No images in the video to use as a cover.'}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {images.map((img) => {
              const isSaving = savingUrl === img.url
              return (
                <button
                  key={img.url}
                  onClick={() => pick(img)}
                  disabled={!!savingUrl}
                  className="relative aspect-square rounded-lg overflow-hidden bg-black/30 disabled:opacity-60 group"
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  {isSaving && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {error && <p className="text-semantic-danger-400 text-xs mb-3">{lang === 'tr' ? 'Kaydedilemedi, tekrar dener misin?' : 'Could not save, please try again.'}</p>}

        <button
          onClick={() => onDone?.(null)}
          disabled={!!savingUrl}
          className="w-full py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-bold uppercase tracking-widest hover:bg-white/10 disabled:opacity-40"
        >
          {lang === 'tr' ? 'Şimdilik Atla' : 'Skip for Now'}
        </button>
      </div>
    </div>
  )
}
