import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Heart, MessageCircle, Sparkles } from 'lucide-react'

// YENİ: 8 dile genişletildi (önceden sadece tr/en vardı)
const CREATE_VISUAL_TEXT = {
  en: 'Create Visual',
  tr: 'Görsel Üret',
  es: 'Crear Imagen',
  fr: 'Créer une Image',
  de: 'Bild erstellen',
  pt: 'Criar Imagem',
  ru: 'Создать Изображение',
  ja: '画像を作成',
}

function getCreateVisualText(lang) {
  const base = String(lang || 'en').toLowerCase().split('-')[0]
  return CREATE_VISUAL_TEXT[base] || CREATE_VISUAL_TEXT.en
}

// pages/explore.js'deki ExploreImageTile ile aynı dayanıklılık deseni —
// profil ızgarasının kendi "Create Visual" CTA tasarımını koruyoruz, öncesinde
// bu ızgarada onError HİÇ yoktu (çıplak next/image hata ikonu kalıcı kalırdı).
export default function ProfileDreamTile({ dream, lang, isHighlighted, onClick, tileRef }) {
  const [errorCount, setErrorCount] = useState(0)
  const [reported, setReported] = useState(false)
  const [overrideUrl, setOverrideUrl] = useState(null)
  const cacheBustRef = useRef(Date.now())

  const baseUrl = overrideUrl || dream.ai_image_url
  const hasImg = !!baseUrl
  const showFallback = !hasImg || errorCount >= 2

  const handleError = useCallback(() => {
    setErrorCount((c) => {
      const next = c + 1
      if (next >= 2 && !reported) {
        setReported(true)
        fetch('/api/dreams/report-broken-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dreamId: dream.id }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data?.imageUrl) {
              setOverrideUrl(data.imageUrl)
              setErrorCount(0)
            }
          })
          .catch(() => {})
      }
      return next
    })
  }, [dream.id, reported])

  const src = errorCount === 1
    ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}retry=${cacheBustRef.current}`
    : baseUrl

  return (
    <div
      ref={tileRef}
      onClick={onClick}
      className={`group aspect-square relative overflow-hidden rounded-xl border bg-slate-900/40 hover:border-brand-primary-500/45 cursor-pointer shadow-lg transition-all duration-300 ${isHighlighted ? 'border-brand-primary-500/70 ring-2 ring-brand-primary-500/50' : 'border-white/5'}`}
    >
      {!showFallback ? (
        <Image
          src={src}
          alt="Dream Visual"
          fill
          sizes="(max-width: 640px) 33vw, 300px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          onError={handleError}
        />
      ) : (
        // Görseli olmayan/onarılamayan rüyalar için estetik bakiye kartı
        <div className="w-full h-full flex flex-col justify-between p-3 sm:p-5 bg-gradient-to-br from-brand-accent-950/20 to-black select-none">
          <span className="text-base sm:text-xl">🌌</span>
          <p className="text-[9px] sm:text-[11px] text-white/70 leading-relaxed font-light line-clamp-3">"{dream.content}"</p>
          {!hasImg && (
            <button className="self-start rounded-full border border-brand-secondary-400/20 bg-brand-secondary-500/10 px-2 py-0.5 text-[8px] sm:text-[9px] font-bold text-brand-secondary-300 hover:bg-brand-secondary-500/25">
              <Sparkles size={10} className="inline -mt-0.5" /> {getCreateVisualText(lang)}
            </button>
          )}
        </div>
      )}

      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-all duration-300">
        <span className="text-xs sm:text-sm font-semibold flex items-center gap-1 text-white"><Heart size={13} /> {dream.likes_count || 0}</span>
        <span className="text-xs sm:text-sm font-semibold flex items-center gap-1 text-white"><MessageCircle size={13} /> {dream.comments_count || 0}</span>
      </div>
    </div>
  )
}
