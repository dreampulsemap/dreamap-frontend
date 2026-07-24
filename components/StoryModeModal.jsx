import { X } from 'lucide-react'
import React, { useState, useRef } from 'react'
import { getDreamCardText } from '@/lib/dreamCardTranslations'
import { useModalA11y } from '@/lib/useModalA11y'

// Meta for Developers'tan alınan uygulama kimliğinizi buraya girin.
// instagram-stories:// deep link'i source_application parametresi olmadan da
// çoğu durumda çalışır, ama Meta bunu resmi akışta önerir.
const FACEBOOK_APP_ID = 'YOUR_FACEBOOK_APP_ID'

export default function StoryModeModal({
  isOpen,
  onClose,
  dreamImage,
  dreamTitle,
  dreamMotiv,
  premiumAnalysis,
  lang,
  translateArchetype,
}) {
  const [sharing, setSharing] = useState(false)
  const [shareStatus, setShareStatus] = useState('')
  const modalRef = useRef(null)
  useModalA11y(modalRef, isOpen ? onClose : null)

  if (!isOpen || !premiumAnalysis) return null
  const t = getDreamCardText(lang)

  const handleShareToInstagramStory = async () => {
    if (!dreamImage) {
      setShareStatus(lang === 'tr' ? 'Paylaşılacak görsel yok.' : 'No image to share.')
      return
    }

    setSharing(true)
    setShareStatus('')

    const ua = navigator.userAgent || ''
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    try {
      const res = await fetch(dreamImage, { mode: 'cors' })
      const blob = await res.blob()

      // Android / destekleyen tarayıcılar: dosyayı native paylaşım sayfasına ver.
      // Instagram bu listede gerçek bir hedef olarak çıkar ("Story'ye Ekle" dahil).
      const file = new File([blob], 'dream-story.png', { type: blob.type || 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: dreamTitle || 'Lunosfer Rüya' })
        setSharing(false)
        return
      }

      // iOS Safari: görseli panoya kopyala, Instagram Stories'i deep link ile aç.
      // Instagram, panodaki görseli story arka planı olarak otomatik alır.
      if (isIOS && navigator.clipboard?.write && window.ClipboardItem) {
        await navigator.clipboard.write([
          new window.ClipboardItem({ [blob.type || 'image/png']: blob }),
        ])
        window.location.href = `instagram-stories://share?source_application=${FACEBOOK_APP_ID}`
        setSharing(false)
        return
      }

      throw new Error('No supported share method')
    } catch (err) {
      console.error('Instagram story share failed:', err)
      // Son çare: görseli indir, kullanıcı elle Instagram'a eklesin.
      try {
        const link = document.createElement('a')
        link.href = dreamImage
        link.download = 'dream-story.png'
        document.body.appendChild(link)
        link.click()
        link.remove()
        setShareStatus(
          lang === 'tr'
            ? 'Görsel indirildi. Instagram\'ı açıp Story olarak ekleyebilirsin.'
            : 'Image downloaded. Open Instagram and add it as your Story.'
        )
        window.location.href = 'instagram://story-camera'
      } catch (downloadErr) {
        console.error('Fallback download failed:', downloadErr)
        setShareStatus(lang === 'tr' ? 'Paylaşım başarısız oldu.' : 'Sharing failed.')
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[360px] aspect-[9/16] rounded-3xl overflow-hidden border border-white/10 bg-[#050711] shadow-[0_30px_100px_rgba(0,0,0,0.95)] flex flex-col justify-between p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label={lang === 'tr' ? 'Kapat' : 'Close'}
          className="absolute top-4 right-4 z-[220] text-xl text-white/60 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {dreamImage && (
          <div className="absolute inset-0 z-0">
            <img src={dreamImage} alt="Story bg" className="w-full h-full object-cover opacity-35 filter blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-[#050711]" />
          </div>
        )}

        <div className="relative z-10 flex flex-col h-full justify-between pointer-events-none select-none">
          <div className="text-center pt-4">
            <span className="text-[10px] tracking-[0.24em] font-black text-cyan-300 uppercase block mb-1">{t.storyTitle}</span>
            <span className="text-[9px] tracking-widest text-white/50 uppercase block">{t.storySubtitle}</span>
          </div>

          <div className="my-auto flex flex-col items-center">
            <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl relative">
              {dreamImage ? (
                <img src={dreamImage} alt="Dream Visual" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-purple-900 to-black">🌌</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h4 className="text-lg font-bold text-white mb-1.5 leading-tight font-serif">{dreamTitle}</h4>
                <p className="text-[9px] text-slate-300 italic mb-2">"{dreamMotiv}"</p>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(premiumAnalysis?.archetypes) &&
                    premiumAnalysis?.archetypes.slice(0, 2).map((arch, i) => (
                      <span key={i} className="text-[8px] font-semibold bg-violet-500/30 border border-violet-400/40 px-2 py-0.5 rounded-full text-violet-100">
                        ✦ {translateArchetype(arch)}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center pb-2 pointer-events-auto">
            <button
              type="button"
              onClick={handleShareToInstagramStory}
              disabled={sharing}
              className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-yellow-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-[0_0_20px_rgba(240,73,214,0.35)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4.162 4.162 0 110-8.324A4.162 4.162 0 0112 16zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
              {sharing
                ? (lang === 'tr' ? 'Hazırlanıyor...' : 'Preparing...')
                : (lang === 'tr' ? "Story'de Paylaş" : 'Share to Story')}
            </button>

            {shareStatus && (
              <p className="mb-2 text-[10px] leading-4 text-cyan-200/90 max-w-[260px] mx-auto">{shareStatus}</p>
            )}

            <p className="text-[9px] text-white/40 tracking-wider mb-2">
              {t.storyInstructions}
            </p>
            <span className="inline-block px-3 py-1 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 text-[9px] font-bold text-fuchsia-300">
              🔗 lunosfer.com
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}