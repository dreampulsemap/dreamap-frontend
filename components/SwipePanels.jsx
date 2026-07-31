import { useRef, useState, useCallback, Children } from 'react'

// Instagram'daki çoklu-görsel gönderisi / hikaye mantığı: yatayda snap-scroll,
// alt kısımda hangi panelde olduğunu gösteren minimal noktalar. Dokunmatik
// momentum ve snap noktaları için native CSS scroll-snap kullanılıyor —
// manuel touch-delta hesaplaması yok, bu yüzden hem daha performanslı hem
// daha az kod. Aktif panel index'i onScroll ile (debounce'lu) hesaplanıyor.
export default function SwipePanels({ children, className = '', onIndexChange }) {
  const items = Children.toArray(children)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef(null)
  const scrollTimeout = useRef(null)

  const handleScroll = useCallback(() => {
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    scrollTimeout.current = setTimeout(() => {
      const el = containerRef.current
      if (!el) return
      const idx = Math.round(el.scrollLeft / el.clientWidth)
      setActiveIndex((prev) => {
        if (prev !== idx) {
          onIndexChange?.(idx)
          return idx
        }
        return prev
      })
    }, 80)
  }, [onIndexChange])

  if (items.length <= 1) {
    return <div className={className}>{items[0]}</div>
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth no-scrollbar ${className}`}
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((child, i) => (
          <div key={i} className="w-full flex-shrink-0 snap-center snap-always">
            {child}
          </div>
        ))}
      </div>

      {/* Nokta göstergeleri */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 z-10">
        {items.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
