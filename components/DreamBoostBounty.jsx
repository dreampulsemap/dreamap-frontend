// Rüya sahibine "Parlat" (3 Aura, 24 saat) ve "Ödül Ekle" (1-50 Aura) —
// Android DreamDetailScreen'deki aynı iki eylemin web karşılığı.
// Backend: pages/api/boost-dream.js, pages/api/add-bounty.js
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { getAuthHeader } from '@/lib/supabase'

export default function DreamBoostBounty({ dream, lang = 'en', onAurasChange }) {
  const tr = lang === 'tr'
  const [boostUntil, setBoostUntil] = useState(dream?.is_boosted ? dream.boost_expires_at : null)
  const [bounty, setBounty] = useState(Number(dream?.aura_bounty || 0))
  const [busy, setBusy] = useState(false)
  const [showBounty, setShowBounty] = useState(false)
  const [amount, setAmount] = useState('5')
  const [msg, setMsg] = useState('')

  const boosted = boostUntil && new Date(boostUntil) > new Date()

  async function post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
      body: JSON.stringify(body),
    })
    return { res, json: await res.json().catch(() => ({})) }
  }

  async function boost() {
    if (busy) return
    setBusy(true)
    setMsg('')
    try {
      const { res, json } = await post('/api/boost-dream', { dreamId: dream.id })
      if (res.status === 402) {
        setMsg(tr ? `Yetersiz Aura (${json.cost || 3} gerekiyor).` : `Not enough Aura (needs ${json.cost || 3}).`)
      } else if (!res.ok) {
        setMsg(tr ? 'Parlatma işlemi başarısız' : 'Boost action failed')
      } else {
        setBoostUntil(json.boostExpiresAt)
        if (json.alreadyBoosted) setMsg(tr ? 'Bu rüya zaten parlıyor — Aura harcanmadı.' : 'This dream is already glowing — no Aura was spent.')
        else {
          setMsg(tr ? `Rüyanız parlatıldı! (Kalan Aura: ${json.aurasLeft ?? '-'})` : `Your dream was boosted! (Aura left: ${json.aurasLeft ?? '-'})`)
          if (typeof json.aurasLeft === 'number') onAurasChange?.(json.aurasLeft)
        }
      }
    } finally {
      setBusy(false)
    }
  }

  async function addBounty() {
    const n = Number(amount)
    if (!Number.isInteger(n) || n < 1 || n > 50) {
      setMsg(tr ? 'Lütfen 1 ile 50 arasında bir miktar girin' : 'Please enter an amount between 1 and 50')
      return
    }
    if (busy) return
    setBusy(true)
    setMsg('')
    try {
      const { res, json } = await post('/api/add-bounty', { dreamId: dream.id, bountyAmount: n })
      if (res.status === 402) setMsg(tr ? 'Yetersiz Aura.' : 'Not enough Aura.')
      else if (!res.ok) setMsg(tr ? 'Ödül eklenemedi' : "Bounty couldn't be added")
      else {
        setBounty(json.newBounty)
        setShowBounty(false)
        setMsg(tr ? `${n} Aura ödül eklendi.` : `${n} Aura bounty added.`)
        if (typeof json.aurasLeft === 'number') onAurasChange?.(json.aurasLeft)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-4 space-y-2">
      {bounty > 0 && <p className="text-xs font-bold text-astral-gold">🏆 {tr ? `Ödül: ${bounty} Aura` : `Bounty: ${bounty} Aura`}</p>}
      <div className="flex flex-wrap gap-2">
        {boosted ? (
          <span className="inline-flex items-center gap-1 rounded-lg border border-violet-500 bg-violet-500/25 px-2.5 py-1 text-[11px] font-bold text-white">
            <Sparkles size={12} className="text-astral-gold" /> {tr ? 'Parlıyor' : 'Glowing'}
          </span>
        ) : (
          <button onClick={boost} disabled={busy} className="rounded-lg bg-violet-500/80 px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50">
            {tr ? '✦ Parlat (3 Aura)' : '✦ Boost (3 Aura)'}
          </button>
        )}
        <button onClick={() => setShowBounty((v) => !v)} className="rounded-lg border border-astral-gold px-2.5 py-1 text-[11px] font-bold text-astral-gold">
          {tr ? '🏆 Ödül Ekle' : '🏆 Add Bounty'}
        </button>
      </div>
      {showBounty && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={50}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label={tr ? 'Aura miktarı (1-50)' : 'Aura amount (1-50)'}
            className="w-20 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-sm text-white"
          />
          <button onClick={addBounty} disabled={busy} className="rounded-lg bg-astral-gold px-3 py-1 text-xs font-bold text-void-950 disabled:opacity-50">
            {tr ? 'Ekle' : 'Add'}
          </button>
        </div>
      )}
      {msg && <p className="text-[11px] text-slate-300" role="status">{msg}</p>}
    </div>
  )
}
