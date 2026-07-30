import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Heart, MessageCircle } from 'lucide-react'

// KÖK NEDEN NOTU: Explore artık sunucu tarafında (pages/api/explore/feed.js)
// görseli olmayan/kalıcı olmayan/işaretli-kırık rüyaları zaten dışarıda
// bırakıyor. Bu bileşen ikinci savunma hattı — ör. görsel URL sunucu
// tarafında sağlıklı görünüp CDN'de anlık bir hata verirse, kullanıcıya
// çıplak "kırık resim" ikonu göstermek yerine bir kez sessizce yeniden
// dener, yine olmazsa zarifçe metin karta düşer VE backend'e (report-broken-
// image) bildirip o rüyanın gelecekteki Explore isteklerinden otomatik
// çıkarılmasını + onarılmasını tetikler.
export default function ExploreImageTile({ dream, sentimentEmoji, lang, onClick }) {
  const [errorCount, setErrorCount] = useState(0)
  const [reported, setReported] = useState(false)
  const cacheBustRef = useRef(Date.now())

  const hasImg = !!dream.ai_image_url
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
        }).catch(() => {})
      }
      return next
    })
  }, [dream.id, reported])

  const src = errorCount === 1
    ? `${dream.ai_image_url}${dream.ai_image_url.includes('?') ? '&' : '?'}retry=${cacheBustRef.current}`
    : dream.ai_image_url

  return (
    <div
      onClick={onClick}
      className="group aspect-square relative overflow-hidden rounded-xl border border-white/5 bg-slate-900/40 hover:border-fuchsia-500/40 shadow-lg cursor-pointer transition-all duration-300"
    >
      {!showFallback ? (
        <Image
          src={src}
          alt="Explore Card"
          fill
          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          onError={handleError}
        />
      ) : (
        <div className="w-full h-full flex flex-col justify-between p-3 sm:p-5 bg-gradient-to-br from-purple-950/20 to-black select-none">
          <span className="text-lg sm:text-2xl">{sentimentEmoji}</span>
          <p className="text-[10px] sm:text-xs text-white/70 leading-relaxed font-light line-clamp-3">"{dream.content}"</p>
          <span className="text-[8px] sm:text-[10px] tracking-wider text-slate-500 uppercase">✦ {dream.location_name || 'Mystic Node'}</span>
        </div>
      )}

      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-all duration-300">
        <span className="text-xs sm:text-sm font-semibold flex items-center gap-1 text-white">
          <Heart size={13} /> {dream.likes_count || 0}
        </span>
        <span className="text-xs sm:text-sm font-semibold flex items-center gap-1 text-white">
          <MessageCircle size={13} /> {dream.comments_count || 0}
        </span>
      </div>
    </div>
  )
}
