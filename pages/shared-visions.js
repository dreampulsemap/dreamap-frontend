// "Ortak Vizyonlarım" — başkasının vizyonuna davet edildiğim / katıldığım
// vizyonlar (goal_collaborators). Android SharedVisionsScreen.kt'nin web karşılığı.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Seo from '@/components/Seo'
import GoalDetailModal from '@/components/GoalDetailModal'
import { supabase } from '@/lib/supabase'

export default function SharedVisionsPage() {
  const router = useRouter()
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const lang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const tr = lang === 'tr'

  const [me, setMe] = useState(null)
  const [rows, setRows] = useState(null)
  const [active, setActive] = useState(null)

  const load = useCallback(async (userId) => {
    const { data } = await supabase
      .from('goal_collaborators')
      .select('*, goals(*)')
      .eq('user_id', userId)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
    // Sahibi vizyonu silmiş ya da görünürlüğü düşmüşse goals null gelir.
    setRows((data || []).filter((r) => r.goals))
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return }
      setMe(session.user.id)
      load(session.user.id)
    })
  }, [load, router])

  async function respond(row, accept) {
    const status = accept ? 'accepted' : 'declined'
    const { error } = await supabase
      .from('goal_collaborators')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', row.id)
    if (error) return
    setRows((list) => (accept ? list.map((r) => (r.id === row.id ? { ...r, status } : r)) : list.filter((r) => r.id !== row.id)))
  }

  const pending = (rows || []).filter((r) => r.status === 'pending')
  const joined = (rows || []).filter((r) => r.status === 'accepted')

  function Item({ row }) {
    const g = row.goals
    return (
      <li className="glass-card flex items-center gap-3 rounded-xl p-3">
        <button onClick={() => setActive(g)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {g.cover_image_url ? (
            <img src={g.cover_image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <span className="h-12 w-12 rounded-lg bg-gradient-to-br from-violet-500/40 to-astral-gold/30" />
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white">{g.title}</span>
            {g.description && <span className="block truncate text-xs text-slate-400">{g.description}</span>}
          </span>
        </button>
        {row.status === 'pending' && (
          <div className="flex shrink-0 gap-1.5">
            <button onClick={() => respond(row, true)} className="rounded-full bg-astral-gold px-3 py-1 text-[11px] font-bold text-void-950">{tr ? 'Katıl' : 'Join'}</button>
            <button onClick={() => respond(row, false)} className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-bold text-slate-300">{tr ? 'Reddet' : 'Decline'}</button>
          </div>
        )}
      </li>
    )
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-6">
      <Seo title={tr ? 'Paylaşılan Vizyonlar' : 'Shared Visions'} noindex lang={lang} />
      <div className="mb-5 flex items-center gap-3">
        <Link href="/profile" aria-label={tr ? 'Geri' : 'Back'} className="rounded-full p-1.5 text-slate-300 hover:bg-white/5"><ArrowLeft size={20} /></Link>
        <h1 className="font-serif text-2xl font-bold text-white">{tr ? 'Paylaşılan Vizyonlar' : 'Shared Visions'}</h1>
      </div>

      {rows === null ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-astral-gold" size={26} /></div>
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">
          {tr
            ? 'Henüz paylaşılan vizyon yok. Bir arkadaşınız sizi bir vizyona davet ettiğinde burada görünecek.'
            : 'No shared visions yet. When a friend invites you to a vision, it will show up here.'}
        </p>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">{tr ? 'Bekleyen Davetler' : 'Pending Invites'}</h2>
              <ul className="space-y-2">{pending.map((r) => <Item key={r.id} row={r} />)}</ul>
            </section>
          )}
          {joined.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">{tr ? 'Katılınanlar' : 'Joined'}</h2>
              <ul className="space-y-2">{joined.map((r) => <Item key={r.id} row={r} />)}</ul>
            </section>
          )}
        </div>
      )}

      {active && (
        <GoalDetailModal goal={active} lang={lang} currentUserId={me} onClose={() => setActive(null)} />
      )}
    </main>
  )
}
