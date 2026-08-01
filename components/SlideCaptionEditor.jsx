import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'

// Metni görsel üzerinde SERBESTÇE konumlandırma aracı — Instagram/TikTok'un
// "metin ekle" aracıyla aynı mantık: metni sürükleyerek taşı, kaydırıcıyla
// büyüt/küçült. Konum yüzde (x%, y%) olarak saklanıyor, bu yüzden her ekran
// boyutunda (SlideEditor önizlemesi, SlidesViewer tam ekran) aynı orana
// oturuyor.

const FONT_CLASS = { sans: 'font-sans', serif: 'font-serif', mono: 'font-mono' }
const COLORS = ['#ffffff', '#0a0a0f', '#f5c451', '#e879f9', '#22d3ee', '#fb7185']
const BASE_FONT_PX = 22 // caption_size çarpanı bunun üzerine uygulanıyor

export default function SlideCaptionEditor({ slide, imageSrc, lang = 'en', onSave, onClose }) {
  const containerRef = useRef(null)
  const [caption, setCaption] = useState(slide.caption || '')
  const [font, setFont] = useState(slide.caption_font || 'sans')
  const [color, setColor] = useState(slide.caption_color || '#ffffff')
  const [x, setX] = useState(slide.caption_x ?? 50)
  const [y, setY] = useState(slide.caption_y ?? 85)
  const [size, setSize] = useState(slide.caption_size ?? 1)
  const [saving, setSaving] = useState(false)

  const dragRef = useRef(null)
  const isVideo = /\/pixabay-video\//.test(imageSrc || '') || /\.mp4($|\?)/.test(imageSrc || '')

  function toPercent(clientX, clientY) {
    const rect = containerRef.current.getBoundingClientRect()
    const px = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    const py = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100))
    return { px, py }
  }

  function handlePointerDown(e) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = true
  }
  function handlePointerMove(e) {
    if (!dragRef.current) return
    const { px, py } = toPercent(e.clientX, e.clientY)
    setX(px)
    setY(py)
  }
  function handlePointerUp() {
    dragRef.current = null
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      await onSave({ caption, captionFont: font, captionColor: color, captionX: x, captionY: y, captionSize: size })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-4 shrink-0">
        <button onClick={onClose} className="text-white/70 hover:text-white">
          <X size={20} />
        </button>
        <span className="text-white text-sm font-semibold">{lang === 'tr' ? 'Metni Düzenle' : 'Edit Text'}</span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-fuchsia-400 hover:text-fuchsia-300 disabled:opacity-40 flex items-center gap-1 text-sm font-bold"
        >
          <Check size={18} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 min-h-0">
        <div
          ref={containerRef}
          className="relative w-full max-w-[360px] aspect-[9/16] overflow-hidden rounded-2xl bg-void-950"
        >
          {isVideo ? (
            <video src={imageSrc} className="absolute inset-0 w-full h-full object-cover" muted loop autoPlay playsInline />
          ) : (
            <img src={imageSrc} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

          {/* Sürüklenebilir metin */}
          {caption && (
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className={`absolute max-w-[85%] cursor-move select-none touch-none ${FONT_CLASS[font]}`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                color,
                fontSize: `${BASE_FONT_PX * size}px`,
                lineHeight: 1.25,
                fontWeight: 700,
                textShadow: '0 1px 6px rgba(0,0,0,0.5)',
                whiteSpace: 'pre-wrap',
                textAlign: 'center',
              }}
            >
              {caption}
            </div>
          )}
          {!caption && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-slate-500 text-xs">{lang === 'tr' ? 'Aşağıya metin yaz' : 'Type text below'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 px-5 pt-2 pb-4 space-y-3">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, 200))}
          placeholder={lang === 'tr' ? 'Niyet / başlık...' : 'Intention / caption...'}
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none resize-none"
        />

        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 shrink-0">{lang === 'tr' ? 'Boyut' : 'Size'}</span>
          <input
            type="range"
            min="0.4"
            max="3"
            step="0.05"
            value={size}
            onChange={(e) => setSize(parseFloat(e.target.value))}
            className="flex-1 accent-fuchsia-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {['sans', 'serif', 'mono'].map((f) => (
              <button
                key={f}
                onClick={() => setFont(f)}
                className={`${FONT_CLASS[f]} w-8 h-8 rounded-lg text-xs flex items-center justify-center border ${
                  font === f ? 'border-fuchsia-400 text-fuchsia-300' : 'border-white/10 text-slate-400'
                }`}
              >
                Aa
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-full border-2 ${color.toLowerCase() === c ? 'border-fuchsia-400' : 'border-white/20'}`}
              />
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-[10px] text-center">
          {lang === 'tr' ? 'Metni sürükleyerek konumlandır' : 'Drag the text to position it'}
        </p>
      </div>
    </div>
  )
}
