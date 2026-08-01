import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Check, ZoomIn } from 'lucide-react'

// Bir görseli 9:16 (Reels/Story) oranına kırpan araç. Kullanıcı sürükleyip
// yakınlaştırabilir; istemezse üç hızlı hizalama şablonundan biriyle tek
// dokunuşla bitirebilir (Ortala = varsayılan, hiç dokunmadan da "Bitir"e
// basılırsa zaten bu uygulanmış olur).
//
// Çıktı: 1080x1920 (gerçek 9:16) çözünürlükte bir Blob — onCropped(blob) ile.

const OUT_W = 1080
const OUT_H = 1920
const VIEWPORT_ASPECT = OUT_W / OUT_H // 9:16

export default function ImageCropModal({ imageSrc, lang = 'en', title, onCropped, onSkip, onClose }) {
  const containerRef = useRef(null)
  const imgElRef = useRef(null)
  const canvasRef = useRef(null)

  const [imgLoaded, setImgLoaded] = useState(false)
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 }) // translate, CSS px
  const [exporting, setExporting] = useState(false)

  const dragRef = useRef(null)

  // Konteynerin gerçek piksel boyutunu ölç (aspect-[9/16] ile sabitleniyor,
  // ama kırpma matematiği için gerçek px lazım).
  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect()
        setViewport({ w: r.width, h: r.height })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const baseScale = natural.w && viewport.w
    ? Math.max(viewport.w / natural.w, viewport.h / natural.h)
    : 1
  const displayScale = baseScale * zoom
  const renderedW = natural.w * displayScale
  const renderedH = natural.h * displayScale

  const clamp = useCallback((x, y, scale = displayScale) => {
    const rw = natural.w * scale
    const rh = natural.h * scale
    const minX = viewport.w - rw
    const minY = viewport.h - rh
    return {
      x: Math.min(0, Math.max(minX, x)),
      y: Math.min(0, Math.max(minY, y)),
    }
  }, [natural, viewport, displayScale])

  function centerPosition(scale = displayScale) {
    const rw = natural.w * scale
    const rh = natural.h * scale
    return { x: (viewport.w - rw) / 2, y: (viewport.h - rh) / 2 }
  }

  function handleImageLoad(e) {
    const w = e.target.naturalWidth
    const h = e.target.naturalHeight
    setNatural({ w, h })
    setImgLoaded(true)
  }

  // Görsel/viewport hazır olduğunda ortala (varsayılan = "Ortala" şablonu)
  useEffect(() => {
    if (imgLoaded && viewport.w && natural.w) {
      setZoom(1)
      const c = centerPosition(baseScale)
      setPos(c)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgLoaded, viewport.w, viewport.h, natural.w, natural.h])

  function applyPreset(preset) {
    const rw = natural.w * displayScale
    const rh = natural.h * displayScale
    const x = (viewport.w - rw) / 2
    let y
    if (preset === 'top') y = 0
    else if (preset === 'bottom') y = viewport.h - rh
    else y = (viewport.h - rh) / 2
    setPos(clamp(x, y))
  }

  function handleZoomChange(newZoom) {
    setZoom(newZoom)
    const newScale = baseScale * newZoom
    // Aynı görsel odak noktasını korumaya çalış (basit orantısal yaklaşım)
    setPos((prev) => {
      const ratio = newScale / displayScale
      const cx = viewport.w / 2 - (viewport.w / 2 - prev.x) * ratio
      const cy = viewport.h / 2 - (viewport.h / 2 - prev.y) * ratio
      return clamp(cx, cy, newScale)
    })
  }

  function handlePointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
  }
  function handlePointerMove(e) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPos(clamp(dragRef.current.origX + dx, dragRef.current.origY + dy))
  }
  function handlePointerUp() {
    dragRef.current = null
  }

  async function handleConfirm() {
    if (!imgElRef.current || exporting) return
    setExporting(true)
    try {
      const canvas = canvasRef.current
      canvas.width = OUT_W
      canvas.height = OUT_H
      const ctx = canvas.getContext('2d')

      // Viewport'ta görünen kaynak dikdörtgeni (orijinal görsel piksellerinde)
      const sx = -pos.x / displayScale
      const sy = -pos.y / displayScale
      const sw = viewport.w / displayScale
      const sh = viewport.h / displayScale

      ctx.drawImage(imgElRef.current, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H)
      canvas.toBlob((blob) => {
        setExporting(false)
        if (blob) onCropped(blob)
      }, 'image/jpeg', 0.92)
    } catch (err) {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-4 shrink-0">
        <button onClick={onClose} className="text-white/70 hover:text-white">
          <X size={20} />
        </button>
        <span className="text-white text-sm font-semibold">{title || (lang === 'tr' ? 'Reels için Kırp' : 'Crop for Reels')}</span>
        <button
          onClick={handleConfirm}
          disabled={!imgLoaded || exporting}
          className="text-brand-primary-400 hover:text-brand-primary-300 disabled:opacity-40 flex items-center gap-1 text-sm font-bold"
        >
          <Check size={18} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 min-h-0">
        <div
          ref={containerRef}
          className="relative w-full max-w-[360px] aspect-[9/16] overflow-hidden rounded-2xl bg-void-950 touch-none"
          style={{ aspectRatio: `${VIEWPORT_ASPECT}` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {imageSrc && (
            <img
              ref={imgElRef}
              src={imageSrc}
              alt=""
              crossOrigin="anonymous"
              onLoad={handleImageLoad}
              draggable={false}
              className="absolute select-none"
              style={{
                width: renderedW || 'auto',
                height: renderedH || 'auto',
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                maxWidth: 'none',
              }}
            />
          )}
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-slate-600 text-xs uppercase tracking-widest animate-pulse">...</span>
            </div>
          )}
          {/* 9:16 çerçeve rehberi */}
          <div className="absolute inset-0 pointer-events-none ring-1 ring-white/15 rounded-2xl" />
        </div>
      </div>

      <div className="shrink-0 px-6 pt-2 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <ZoomIn size={14} className="text-slate-500" />
          <input
            type="range"
            min="1"
            max="2.5"
            step="0.01"
            value={zoom}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="flex-1 accent-brand-primary-500"
          />
        </div>
        <div className="flex gap-2 mb-3">
          {[
            { key: 'top', label: lang === 'tr' ? 'Üstten' : 'Top' },
            { key: 'center', label: lang === 'tr' ? 'Ortala' : 'Center' },
            { key: 'bottom', label: lang === 'tr' ? 'Alttan' : 'Bottom' },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold uppercase tracking-widest hover:bg-white/10"
            >
              {p.label}
            </button>
          ))}
        </div>
        {onSkip && (
          <button
            onClick={onSkip}
            className="w-full py-2.5 rounded-xl text-slate-500 text-xs font-semibold hover:text-slate-300"
          >
            {lang === 'tr' ? 'Kırpmadan Ortala ve Devam Et' : 'Skip — Auto-Center & Continue'}
          </button>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
