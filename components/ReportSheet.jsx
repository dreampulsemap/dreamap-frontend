// Genel "Bildir" sayfası (rüya / mesaj) — Google Play UGC politikası.
// Android'deki rüya ve mesaj şikâyet diyaloglarının web karşılığı.
// endpoint + buildBody: /api/reports/dream ({dreamId}) veya /api/reports/message ({messageId}).
import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { getAuthHeader } from '@/lib/supabase'
import { REPORT_REASONS } from '@/lib/reportReasons'
import { useModalA11y } from '@/lib/useModalA11y'

export default function ReportSheet({ lang = 'en', title, endpoint, buildBody, onClose }) {
  const tr = lang === 'tr'
  const ref = useRef(null)
  useModalA11y(ref, onClose)
  const [reason, setReason] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!reason || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify({ ...buildBody(), reason, note: note.trim() || undefined }),
      })
      if (!res.ok) throw new Error()
      setDone(true)
      setTimeout(onClose, 1500)
    } catch {
      setError(tr ? 'Bildirim gönderilemedi, tekrar dene.' : 'Could not submit the report, please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border border-white/10 bg-void-900 p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button onClick={onClose} aria-label={tr ? 'Kapat' : 'Close'} className="rounded-full p-1.5 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        {done ? (
          <p className="py-6 text-center text-sm text-emerald-400">
            {tr ? 'Teşekkürler, bildirimin incelenecek.' : 'Thanks — your report will be reviewed.'}
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${reason === r.value ? 'border-astral-gold bg-astral-gold/10 text-white' : 'border-white/10 text-slate-300 hover:bg-white/5'}`}
                >
                  {tr ? r.tr : r.en}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={2}
              placeholder={tr ? 'Ek açıklama (isteğe bağlı)' : 'Additional details (optional)'}
              className="w-full resize-none rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={submit}
              disabled={!reason || busy}
              className="w-full rounded-full bg-red-500/80 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              {busy ? (tr ? 'Gönderiliyor...' : 'Sending...') : (tr ? 'Bildir' : 'Report')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
