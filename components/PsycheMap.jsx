import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getPsycheMapText } from '@/lib/psycheMapTranslations'

// Kullanıcının rüyalarında AI'ın tespit ettiği arketiplerin (dreams.ai_archetypes)
// toplamından, merkezde "Öz" (the Self) olacak şekilde bir yörünge haritası
// çiziyor — her arketip bir düğüm, ne kadar sık tekrar ediyorsa o kadar
// büyük/parlak. Grafik kütüphanesi yok (proje bağımlılıklarında zaten yok),
// elle SVG — 300x300 viewBox, saat 12 yönünden başlayıp saat yönünde diziliyor.
//
// KASITLI OLARAK yapılmayanlar: sabit isimli "arketip karakterleri" yok
// (Lunosfer'in kendi AI analizi neyi tespit ettiyse o gösteriliyor),
// gizem/kehanet dili yok — sade, kullanıcının kendi verisine dayanan bir
// yansıma aracı.
const CENTER = 150
const CORE_RADIUS = 14
const ORBIT_RADIUS = 104
const MIN_NODE_RADIUS = 7
const MAX_NODE_RADIUS = 22

function polarToXY(angleRad, radius) {
  return {
    x: CENTER + radius * Math.cos(angleRad),
    y: CENTER + radius * Math.sin(angleRad),
  }
}

function PsycheMapSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-6 flex items-center justify-center" style={{ minHeight: 280 }}>
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )
}

export default function PsycheMap({ lang = 'en' }) {
  const t = getPsycheMapText(lang)
  const [data, setData] = useState(null) // null = yükleniyor
  const [failed, setFailed] = useState(false)
  const [activeIdx, setActiveIdx] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await fetch('/api/psyche-map', { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (!res.ok) throw new Error('failed')
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (_) {
        if (!cancelled) setFailed(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (failed) return null // sessizce gizle — bozuk bir grafik boş alandan kötü
  if (data === null) return <PsycheMapSkeleton />

  const maxCount = data.archetypes.reduce((m, a) => Math.max(m, a.count), 0) || 1
  const nodeCount = data.archetypes.length
  const active = activeIdx !== null ? data.archetypes[activeIdx] : null

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="mb-4">
        <h3 className="text-white font-bold text-base font-serif">{t.title}</h3>
        <p className="text-slate-400 text-xs mt-0.5">{t.subtitle}</p>
      </div>

      {!data.readyForMap ? (
        <div className="flex flex-col items-center justify-center text-center py-10 px-4">
          <div
            className="w-14 h-14 rounded-full mb-3 border-2 border-dashed border-slate-600 flex items-center justify-center"
          >
            <span className="text-slate-500 text-lg">{data.totalAnalyzedDreams}</span>
          </div>
          <p className="text-white text-sm font-semibold">{t.lockedTitle}</p>
          <p className="text-slate-400 text-xs mt-1 max-w-[240px]">
            {t.lockedBody(Math.max(data.minDreamsNeeded - data.totalAnalyzedDreams, 1))}
          </p>
        </div>
      ) : (
        <>
          <div className="relative w-full flex justify-center">
            <svg viewBox="0 0 300 300" className="w-full max-w-[320px] h-auto" role="img" aria-label={t.title}>
              <defs>
                <radialGradient id="psycheCore" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFF6D6" />
                  <stop offset="60%" stopColor="#E6C687" />
                  <stop offset="100%" stopColor="#B89753" />
                </radialGradient>
              </defs>

              {data.archetypes.map((a, i) => {
                const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2
                const { x, y } = polarToXY(angle, ORBIT_RADIUS)
                const intensity = a.count / maxCount
                return (
                  <line
                    key={`line-${i}`}
                    x1={CENTER} y1={CENTER} x2={x} y2={y}
                    stroke="#E6C687"
                    strokeOpacity={0.15 + intensity * 0.35}
                    strokeWidth={1}
                  />
                )
              })}

              <circle cx={CENTER} cy={CENTER} r={CORE_RADIUS} fill="url(#psycheCore)" opacity={0.9} />

              {data.archetypes.map((a, i) => {
                const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2
                const { x, y } = polarToXY(angle, ORBIT_RADIUS)
                const intensity = a.count / maxCount
                const r = MIN_NODE_RADIUS + intensity * (MAX_NODE_RADIUS - MIN_NODE_RADIUS)
                const labelPos = polarToXY(angle, ORBIT_RADIUS + r + 16)
                const isActive = activeIdx === i
                return (
                  <g key={`node-${i}`} className="cursor-pointer" onClick={() => setActiveIdx(isActive ? null : i)}>
                    <circle
                      cx={x} cy={y} r={r}
                      fill="#E6C687"
                      fillOpacity={0.25 + intensity * 0.55}
                      stroke="#FFF6D6"
                      strokeOpacity={isActive ? 0.9 : 0.3 + intensity * 0.3}
                      strokeWidth={isActive ? 2 : 1}
                    />
                    <text
                      x={labelPos.x} y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="9"
                      fill={isActive ? '#FFF6D6' : '#94A3B8'}
                      className="select-none"
                    >
                      {a.label.length > 14 ? `${a.label.slice(0, 13)}…` : a.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          {active && (
            <div className="text-center -mt-2 mb-2 animate-fade-in">
              <p className="text-astral-gold text-sm font-semibold">{active.label}</p>
              <p className="text-slate-500 text-xs">{Math.round(active.share * 100)}%</p>
            </div>
          )}

          <p className="text-center text-slate-500 text-[11px] mt-2">{t.dreamsAnalyzed(data.totalAnalyzedDreams)}</p>

          {data.premiumExcerpt && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1.5">{t.individuationNote}</p>
              <p className="text-slate-300 text-sm leading-relaxed font-light italic">"{data.premiumExcerpt}…"</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
