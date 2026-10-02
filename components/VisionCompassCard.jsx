// Android VisionScreen DailyCompassCard: butonlu günlük pusula. Ana sayfadaki basılı-tut
// pusulasıyla (DailyCompass.jsx) aynı günlük önbelleği paylaşır; biri çekince diğeri dolu görünür.
import { useEffect, useState } from 'react'
import { Compass, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const CACHE_KEY = 'lunosfer_daily_compass'
const today = () => new Date().toISOString().split('T')[0]

export default function VisionCompassCard({ lang = 'en' }) {
  const tr = lang === 'tr'
  const [state, setState] = useState({ kind: 'idle' })

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
      if (saved?.date === today() && saved.data) return setState({ kind: 'success', data: saved.data })
    } catch {}
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data } = await supabase.from('user_profiles').select('last_compass_check_in').eq('id', session.user.id).maybeSingle()
      if (data?.last_compass_check_in?.split('T')[0] === today()) setState({ kind: 'used' })
    })
  }, [])

  async function draw() {
    setState({ kind: 'loading' })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(tr ? 'Lütfen giriş yapın.' : 'Please log in.')
      const res = await fetch('/api/daily-compass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ lang }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 429) return setState({ kind: 'used' })
      if (!res.ok || !json.data) throw new Error(json.error || json.details || 'error')
      localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today(), data: json.data }))
      setState({ kind: 'success', data: json.data })
    } catch (e) {
      setState({ kind: 'error', message: e.message })
    }
  }

  const accent = state.kind === 'success' && state.data.color ? state.data.color : null

  return (
    <div className="rounded-[20px] border bg-void-900 p-[18px]" style={{ borderColor: accent ? `${accent}99` : 'rgba(168,85,247,0.4)' }}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2"><span className="text-xl">🧭</span><span className="font-serif text-base font-bold text-astral-gold">{tr ? 'Günlük Pusula' : 'Daily Compass'}</span></p>
          <span className="rounded-full bg-aether-violet/20 px-2.5 py-1 text-[9px] font-bold text-astral-gold">{tr ? 'JUNG REHBERİ' : 'JUNG GUIDE'}</span>
        </div>

        {state.kind === 'idle' && (
          <>
            <p className="text-[13px] text-slate-300">{tr ? 'Bugünün kozmik ve ruhsal yönelimini öğrenmek için pusulana dokun.' : "Tap your compass to find out today's cosmic and spiritual direction."}</p>
            <button onClick={draw} className="flex w-full items-center justify-center gap-2 rounded-xl bg-aether-violet py-2.5 text-[13px] font-bold text-white">
              <Compass size={18} className="text-astral-gold" fill="currentColor" />{tr ? 'Günün Pusulasını Çek' : 'Draw Daily Compass'}
            </button>
          </>
        )}
        {state.kind === 'loading' && (
          <div className="flex items-center justify-center gap-3 py-2">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-astral-gold/25 border-t-astral-gold" />
            <span className="text-[13px] text-slate-300">{tr ? 'Kozmik okuma yapılıyor...' : 'Cosmic reading in progress…'}</span>
          </div>
        )}
        {state.kind === 'success' && (
          <>
            {state.data.archetype && (
              <span className="self-start rounded-full border-[0.5px] px-3 py-1 text-[11px] font-bold" style={{ color: accent || '#E6C687', borderColor: accent || '#E6C687', background: `${accent || '#E6C687'}33` }}>
                {tr ? 'Arketip' : 'Archetype'}: {state.data.archetype}
              </span>
            )}
            <p className="text-[13px] leading-5 text-white">{state.data.reading}</p>
          </>
        )}
        {state.kind === 'used' && (
          <div className="flex items-center gap-2.5 rounded-xl border border-astral-gold/30 bg-void-800/50 p-3">
            <CheckCircle2 size={20} className="text-astral-gold" />
            <span className="text-[13px] font-medium text-white">{tr ? 'Bugün zaten baktın, yarın tekrar gel.' : 'You already checked today, come back tomorrow.'}</span>
          </div>
        )}
        {state.kind === 'error' && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-xs text-semantic-danger-400">{state.message}</p>
            <button onClick={draw} className="rounded-xl bg-void-800 px-4 py-2 text-xs text-white">{tr ? 'Tekrar Dene' : 'Retry'}</button>
          </div>
        )}
      </div>
    </div>
  )
}
