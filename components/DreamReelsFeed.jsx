import { useRef, useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useModalA11y } from '@/lib/useModalA11y'
import DreamCard from '@/components/DreamCard'

// Rüyaların VisionReelsFeed ile aynı native scroll-snap + IntersectionObserver
// deseniyle çalışan tam ekran, dikey kaydırmalı görüntüleyicisi. Fark: her
// panel VisionReelsFeed'deki gibi tek bir <img> değil, DreamCard'ın TÜM
// içeriği (metin, yorumlar, premium analiz) — bu yüzden performans için
// sadece aktif ± 1 panel gerçekten DreamCard olarak mount ediliyor; uzaktaki
// panellerde viewport yüksekliğinde boş bir yer tutucu duruyor.
export default function DreamReelsFeed({ dreams, lang, currentUserId, initialDreamId, owner, onClose, onLoadMore, hasMore, loading }) {
  const containerRef = useRef(null)
  const itemRefs = useRef([])
  const initialIndex = initialDreamId ? Math.max(dreams.findIndex((d) => d.id === initialDreamId), 0) : 0
  const [activeIndex, setActiveIndex] = useState(initialIndex)

  useModalA11y(containerRef, onClose)

  // Belirli bir rüyaya tıklanarak açıldıysa besleme o rüyada başlasın — her
  // zaman en baştan değil. Animasyonsuz, anlık (VisionReelsFeed ile aynı).
  useEffect(() => {
    if (initialIndex > 0) {
      itemRefs.current[initialIndex]?.scrollIntoView({ block: 'start', behavior: 'instant' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const idx = Number(entry.target.dataset.index)
            setActiveIndex(idx)
            if (idx >= dreams.length - 3 && hasMore && !loading) onLoadMore?.()
          }
        })
      },
      { root: container, threshold: [0.6] }
    )
    itemRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dreams.length, hasMore, loading])

  return (
    <div className="fixed inset-0 z-[90] bg-black">
      <button
        onClick={onClose}
        aria-label={lang === 'tr' ? 'Geri' : 'Back'}
        className="absolute top-7 left-3 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white"
      >
        <ChevronLeft size={18} />
      </button>

      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory [&::-webkit-scrollbar]:hidden"
        style={{ scrollBehavior: 'smooth' }}
      >
        {dreams.map((dream, i) => {
          // Uzun rüya metni/yorumları tek ekrana sığmayabilir — panel EN AZ
          // bir viewport yüksekliğinde (snap noktası net olsun) ama gerekirse
          // uzayabiliyor; kartın içinde kaydırma bittiğinde doğal olarak bir
          // sonraki panele devam ediliyor (reels'te olduğu gibi tek yönlü akış).
          const withinWindow = Math.abs(i - activeIndex) <= 1
          return (
            <div
              key={dream.id}
              ref={(el) => (itemRefs.current[i] = el)}
              data-index={i}
              className="min-h-full w-full snap-start snap-always flex items-start justify-center overscroll-y-contain px-3 py-6"
            >
              {withinWindow ? (
                <div className="w-full max-w-2xl">
                  <DreamCard
                    dream={dream}
                    lang={lang}
                    currentUserId={currentUserId}
                    owner={owner}
                    onClose={onClose}
                    onTranslate={() => {}}
                    translating={false}
                    translated={false}
                    translatedContent=""
                    translatedAnalysis=""
                  />
                </div>
              ) : (
                <div className="w-full max-w-2xl h-[70vh] rounded-3xl bg-slate-900/30 animate-pulse" />
              )}
            </div>
          )
        })}

        {loading && (
          <div className="h-full w-full snap-start flex items-center justify-center">
            <span className="text-slate-500 text-xs uppercase tracking-widest animate-pulse">...</span>
          </div>
        )}
      </div>
    </div>
  )
}
