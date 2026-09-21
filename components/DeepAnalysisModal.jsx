import React, { useCallback, useEffect, useRef, useState } from 'react'
import { X, Sparkles, Download, Share2, ArrowLeft } from 'lucide-react'
import { getDeepAnalysisText } from '@/lib/deepAnalysisModalI18n'
import { useModalA11y } from '@/lib/useModalA11y'

const AURA_COST = 10
const STEP_MS = 4000

/**
 * "Derin Analiz" — son ruyalar + vizyonlar birlikte Opus 5 ile okunup tek
 * rapor uretilir: kisilik analizi, korku haritasi, yuzlesme onerisi ve
 * paylasilabilir 9:16 kart.
 *
 * DeepAnalysisCarouselModal (tek ruyanin derin analizi) ile ayni sey degil.
 *
 * `accessToken` cagirandan geliyor; rota user_id'yi govdeden DEGIL bu
 * jetondan cozuyor (bkz. pages/api/analysis/deep.js).
 */
export default function DeepAnalysisModal({
  isOpen,
  onClose,
  lang = 'en',
  accessToken,
  auras = 0,
  isPremiumMember = false,
  onBuyAuras,
  onAurasChanged,
}) {
  const t = getDeepAnalysisText(lang)
  const modalRef = useRef(null)
  const cardRef = useRef(null)

  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState(null)
  const [needsAuras, setNeedsAuras] = useState(false)
  const [toast, setToast] = useState(null)

  useModalA11y(modalRef, isOpen && !loading ? onClose : null)

  const authHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken]
  )

  // Gecmis analizler ucretsiz tekrar okunabilsin — kullanici ayni raporu
  // ikinci kez satin almasin.
  useEffect(() => {
    if (!isOpen || !accessToken) return
    let cancelled = false
    fetch('/api/analysis/deep', { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.ok) setHistory(data.analyses || [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isOpen, accessToken, authHeaders])

  // Adim gostergesi: tek istek oldugu icin gercek ilerleme yok, ama 15
  // saniyelik bos spinner "dondu mu?" hissi veriyor.
  useEffect(() => {
    if (!loading) return undefined
    const id = setInterval(() => setStep((s) => Math.min(s + 1, t.steps.length - 1)), STEP_MS)
    return () => clearInterval(id)
  }, [loading, t.steps.length])

  async function generate() {
    if (loading) return
    setLoading(true)
    setStep(0)
    setError(null)
    setNeedsAuras(false)
    setResult(null)

    try {
      const res = await fetch('/api/analysis/deep', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ lang }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data?.ok) {
        switch (data?.error) {
          case 'insufficient_auras':
            setError(t.errInsufficient(data.cost || AURA_COST))
            setNeedsAuras(true)
            break
          case 'not_enough_dreams':
            setError(t.errNotEnoughDreams(data.minimum || 3))
            break
          case 'rate_limited':
            setError(t.errRateLimited)
            break
          default:
            setError(data?.refunded ? t.errFailedRefunded : t.errFailed)
        }
        return
      }

      setResult(data.analysis)
      setHistory((h) => [data.analysis, ...h])
      if (typeof data.aurasLeft === 'number') onAurasChanged?.(data.aurasLeft)
    } catch {
      setError(t.errFailed)
    } finally {
      setLoading(false)
    }
  }

  // Karti canvas'a cizip indiriyoruz: dis gorsel CORS nedeniyle
  // "tainted canvas" yaratabilecegi icin crossOrigin ile yukleniyor ve
  // yuklenemezse sadece arka plan + metin cikiyor (kart yine de gecerli).
  async function renderCardToBlob(analysis) {
    const W = 1080
    const H = 1920
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')

    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#05060d')
    bg.addColorStop(0.5, '#0b0d1a')
    bg.addColorStop(1, '#05060d')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    if (analysis.card_image_url) {
      await new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const scale = Math.max(W / img.width, H / img.height)
          const w = img.width * scale
          const h = img.height * scale
          ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)
          const veil = ctx.createLinearGradient(0, H * 0.35, 0, H)
          veil.addColorStop(0, 'rgba(5,6,13,0)')
          veil.addColorStop(1, 'rgba(5,6,13,0.94)')
          ctx.fillStyle = veil
          ctx.fillRect(0, 0, W, H)
          resolve()
        }
        img.onerror = () => resolve()
        img.src = analysis.card_image_url
      })
    }

    const margin = 88
    let y = H - 360

    ctx.fillStyle = '#F5C542'
    ctx.font = 'bold 72px Georgia, serif'
    y = wrapText(ctx, analysis.card_headline || '', margin, y, W - margin * 2, 82)

    ctx.fillStyle = '#FFFFFF'
    ctx.font = '40px system-ui, sans-serif'
    y = wrapText(ctx, analysis.card_affirmation || '', margin, y + 40, W - margin * 2, 54)

    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = '28px system-ui, sans-serif'
    ctx.fillText('lunosfer', margin, H - 80)

    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(' ')
    let line = ''
    let cursor = y
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, cursor)
        cursor += lineHeight
        line = word
      } else {
        line = test
      }
    }
    if (line) {
      ctx.fillText(line, x, cursor)
      cursor += lineHeight
    }
    return cursor
  }

  async function downloadCard() {
    try {
      const blob = await renderCardToBlob(result)
      if (!blob) throw new Error('no blob')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lunosfer-${result.id}.png`
      a.click()
      URL.revokeObjectURL(url)
      setToast(t.saved)
    } catch {
      setToast(t.saveFailed)
    }
  }

  async function shareCard() {
    try {
      const blob = await renderCardToBlob(result)
      const file = blob && new File([blob], 'lunosfer.png', { type: 'image/png' })
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
        return
      }
      await downloadCard()
    } catch {
      /* kullanici paylasim sayfasini kapatti; sessiz gec */
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={loading ? undefined : onClose}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl max-h-[92dvh] overflow-y-auto overscroll-contain rounded-3xl border border-white/10 bg-[#070b14] p-6 pb-10 shadow-[0_30px_100px_rgba(0,0,0,0.65)] sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          disabled={loading}
          aria-label={t.close}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors disabled:opacity-30"
        >
          <X size={20} />
        </button>

        {result ? (
          <ResultView
            t={t}
            analysis={result}
            cardRef={cardRef}
            onBack={() => setResult(null)}
            onDownload={downloadCard}
            onShare={shareCard}
            toast={toast}
          />
        ) : (
          <div className="space-y-5">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary-400/20 bg-brand-primary-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-primary-300 mb-3">
                ✦ {t.badge}
              </span>
              <h3 className="text-2xl font-bold gold-gradient-text font-serif">{t.title}</h3>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-2">
              <h4 className="font-semibold text-white">{t.introTitle}</h4>
              <p className="text-sm leading-relaxed text-white/70">{t.introBody}</p>
              <p className="text-xs text-white/45">{t.priceNote(AURA_COST)}</p>
            </div>

            <div className="flex items-center justify-between text-xs text-white/50">
              <span>{t.balance(auras)}</span>
              {isPremiumMember && <span className="text-amber-300">Premium</span>}
            </div>

            <button
              onClick={generate}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-4 font-bold text-white transition-opacity disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  {t.steps[step]}
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  {t.cta(AURA_COST)}
                </>
              )}
            </button>

            {loading && <p className="text-center text-xs text-white/40">{t.loadingHint}</p>}

            {error && (
              <div className="space-y-3 rounded-2xl border border-rose-500/40 bg-rose-500/5 p-4">
                <p className="text-sm text-rose-300">{error}</p>
                {needsAuras && (
                  <button
                    onClick={onBuyAuras}
                    className="w-full rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-[#070b14]"
                  >
                    {t.buyAuras}
                  </button>
                )}
              </div>
            )}

            {history.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-amber-300/80">
                  {t.historyTitle}
                </h4>
                {history.map((past) => (
                  <button
                    key={past.id}
                    onClick={() => setResult(past)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left transition-colors hover:bg-white/[0.06]"
                  >
                    {past.card_image_url && (
                      // next/image degil: gorsel bizim Supabase storage'imizda
                      // ama liste kucuk ve optimize etmeye deger degil.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={past.card_image_url}
                        alt=""
                        className="h-14 w-10 rounded-lg object-cover"
                      />
                    )}
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-white">
                        {past.card_headline || t.title}
                      </span>
                      <span className="block text-[11px] text-white/40">
                        {String(past.created_at || '').slice(0, 10)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            <p className="text-[11px] leading-relaxed text-white/35">{t.disclaimer}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ResultView({ t, analysis, cardRef, onBack, onDownload, onShare, toast }) {
  return (
    <div className="space-y-6">
      <div
        ref={cardRef}
        className="relative mx-auto aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-2xl bg-gradient-to-b from-[#05060d] via-[#0b0d1a] to-[#05060d]"
      >
        {analysis.card_image_url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={analysis.card_image_url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#05060d]/45 to-[#05060d]/95" />
          </>
        )}
        <div className="absolute inset-x-0 bottom-0 space-y-3 p-6">
          <h4 className="font-serif text-2xl font-bold leading-tight text-amber-300">
            {analysis.card_headline}
          </h4>
          <p className="text-sm leading-relaxed text-white">{analysis.card_affirmation}</p>
          <p className="text-[10px] tracking-[0.3em] text-white/40">LUNOSFER</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onDownload}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-400/50 px-4 py-2.5 text-sm text-amber-300"
        >
          <Download size={16} />
          {t.download}
        </button>
        <button
          onClick={onShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-[#070b14]"
        >
          <Share2 size={16} />
          {t.share}
        </button>
      </div>

      {toast && <p className="text-center text-xs text-cyan-300">{toast}</p>}

      <Section title={t.sectionPersonality}>
        <p className="whitespace-pre-line text-sm leading-relaxed text-white/90">
          {analysis.personality_analysis}
        </p>
      </Section>

      {Array.isArray(analysis.fear_map) && analysis.fear_map.length > 0 && (
        <Section title={t.sectionFears}>
          <div className="space-y-4">
            {analysis.fear_map.map((fear) => (
              <div key={fear.symbol} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{fear.symbol}</span>
                  <span className="text-xs text-amber-300">{fear.weight}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                    style={{ width: `${Math.max(0, Math.min(100, fear.weight))}%` }}
                  />
                </div>
                {fear.evidence && <p className="text-[11px] text-white/45">{fear.evidence}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {analysis.confrontation_solution && (
        <Section title={t.sectionSolution}>
          <p className="whitespace-pre-line text-sm leading-relaxed text-white/90">
            {analysis.confrontation_solution}
          </p>
        </Section>
      )}

      <p className="text-[11px] leading-relaxed text-white/35">{t.disclaimer}</p>

      <button
        onClick={onBack}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/80"
      >
        <ArrowLeft size={16} />
        {t.back}
      </button>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-amber-400/20 bg-white/[0.02] p-5 space-y-3">
      <h4 className="font-serif text-sm font-bold text-amber-300">{title}</h4>
      {children}
    </div>
  )
}
