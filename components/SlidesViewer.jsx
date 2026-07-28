import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Tam ekran "Vizyon Slaytları" oynatıcısı — Instagram Stories tarzı otomatik
// ilerleyen dokunmatik gösterim. Instagram'dan farkı: hiçbir şey 24 saatte
// kaybolmuyor, istediğin an geri dönüp tekrar izleyebiliyorsun.
export default function SlidesViewer({ goal, lang = 'en', onClose }) {
  const [slides, setSlides] = useState([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const rafRef = useRef(null)
  const startRef = useRef(null)
  const pausedAtRef = useRef(0)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetch(`/api/goals/slides/list?goalId=${goal.id}`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
        .then((r) => r.json())
        .then((json) => { if (active) setSlides(json.slides || []) })
        .catch(() => {})
        .finally(() => { if (active) setLoading(false) })
    })
    return () => { active = false }
  }, [goal.id])

  const goTo = useCallback((next) => {
    if (next < 0 || next >= slides.length) { onClose(); return }
    pausedAtRef.current = 0
    setIndex(next)
    setProgress(0)
  }, [slides.length, onClose])

  useEffect(() => {
    if (loading || paused || slides.length === 0) return
    const durationMs = (slides[index]?.duration_seconds || 4) * 1000
    startRef.current = performance.now() - pausedAtRef.current

    function tick(now) {
      const elapsed = now - startRef.current
      const pct = Math.min(elapsed / durationMs, 1)
      setProgress(pct)
      if (pct >= 1) {
        goTo(index + 1)
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, loading, paused, slides])

  function handlePress() {
    setPaused(true)
    pausedAtRef.current = progress * ((slides[index]?.duration_seconds || 4) * 1000)
  }
  function handleRelease() {
    setPaused(false)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
        <span className="text-slate-500 text-xs uppercase tracking-widest animate-pulse">...</span>
      </div>
    )
  }

  if (slides.length === 0) {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-slate-300 text-sm">
          {lang === 'tr' ? 'Bu vizyonun henüz slaytı yok.' : 'This vision has no slides yet.'}
        </p>
        <button
          onClick={onClose}
          className="px-5 py-2 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-widest"
        >
          {lang === 'tr' ? 'Kapat' : 'Close'}
        </button>
      </div>
    )
  }

  const current = slides[index]

  return (
    <div className="fixed inset-0 z-[60] bg-black select-none">
      <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
        {slides.map((s, i) => (
          <div key={s.id} className="flex-1 h-0.5 rounded-full bg-white/25 overflow-hidden">
            <div
              className="h-full bg-white"
              style={{
                width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%',
                transition: i === index ? 'none' : 'width 150ms linear',
              }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        aria-label={lang === 'tr' ? 'Kapat' : 'Close'}
        className="absolute top-7 right-3 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white"
      >
        <X size={16} />
      </button>

      <img src={current.image_url} alt="" className="w-full h-full object-contain" />

      {current.caption && (
        <div className="absolute bottom-0 left-0 right-0 p-6 pt-16 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-base font-medium text-center">{current.caption}</p>
        </div>
      )}

      <div className="absolute inset-0 flex">
        <button
          className="w-[30%] h-full"
          aria-label={lang === 'tr' ? 'Önceki' : 'Previous'}
          onClick={() => goTo(index - 1)}
          onMouseDown={handlePress}
          onMouseUp={handleRelease}
          onTouchStart={handlePress}
          onTouchEnd={handleRelease}
        />
        <button
          className="w-[70%] h-full"
          aria-label={lang === 'tr' ? 'Sonraki' : 'Next'}
          onClick={() => goTo(index + 1)}
          onMouseDown={handlePress}
          onMouseUp={handleRelease}
          onTouchStart={handlePress}
          onTouchEnd={handleRelease}
        />
      </div>
    </div>
  )
}
