// Profil > Engellenen Kullanıcılar (Google Play UGC politikası) —
// Android BlockedUsersScreen.kt'nin web karşılığı.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Seo from '@/components/Seo'
import { supabase, getAuthHeader } from '@/lib/supabase'

export default function BlockedUsersPage() {
  const router = useRouter()
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const lang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const tr = lang === 'tr'

  const [list, setList] = useState(null)
  const [error, setError] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setError(false)
    try {
      const res = await fetch('/api/blocks/list', { headers: await getAuthHeader() })
      if (!res.ok) throw new Error()
      setList((await res.json()).blocked || [])
    } catch {
      setError(true)
      setList([])
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/auth')
      else load()
    })
  }, [load, router])

  async function unblock(userId) {
    setBusyId(userId)
    try {
      const res = await fetch('/api/blocks/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify({ blockedUserId: userId }),
      })
      if (res.ok) setList((l) => l.filter((b) => b.userId !== userId))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-6">
      <Seo title={tr ? 'Engellenen Kullanıcılar' : 'Blocked Users'} noindex lang={lang} />
      <div className="mb-5 flex items-center gap-3">
        <Link href="/profile" aria-label={tr ? 'Geri' : 'Back'} className="rounded-full p-1.5 text-slate-300 hover:bg-white/5"><ArrowLeft size={20} /></Link>
        <h1 className="font-serif text-2xl font-bold text-white">{tr ? 'Engellenen Kullanıcılar' : 'Blocked Users'}</h1>
      </div>

      {list === null ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-astral-gold" size={26} /></div>
      ) : error ? (
        <p className="text-center text-sm text-slate-400">
          {tr ? 'Liste yüklenemedi.' : "Couldn't load the list."}{' '}
          <button onClick={load} className="font-bold text-astral-gold">{tr ? 'Tekrar dene' : 'Retry'}</button>
        </p>
      ) : list.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">{tr ? 'Engellediğin kimse yok.' : "You haven't blocked anyone."}</p>
      ) : (
        <ul className="space-y-2">
          {list.map((b) => {
            const name = b.profile?.display_name || b.profile?.username || (tr ? 'Bilinmeyen kullanıcı' : 'Unknown user')
            return (
              <li key={b.userId} className="glass-card flex items-center gap-3 rounded-xl p-3">
                {b.profile?.avatar_url ? (
                  <img src={b.profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-bold text-white">{name.slice(0, 1).toUpperCase()}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{name}</span>
                  {b.profile?.username && <span className="block truncate text-xs text-slate-500">@{b.profile.username}</span>}
                </span>
                <button
                  onClick={() => unblock(b.userId)}
                  disabled={busyId === b.userId}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/5 disabled:opacity-50"
                >
                  {tr ? 'Engeli Kaldır' : 'Unblock'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
