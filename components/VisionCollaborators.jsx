// "Ortak Vizyon" işbirlikçileri — Android GoalDetailScreen'deki
// CollaboratorsSection'ın web karşılığı. Doğrudan PostgREST + RLS
// (goal_collaborators_* politikaları), Android VisionRepository ile aynı sorgular.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { UserPlus, X, Loader2 } from 'lucide-react'
import { supabase, getAuthHeader } from '@/lib/supabase'

const COLUMNS = '*, user_profiles!goal_collaborators_user_id_fkey(id,username,display_name,avatar_url)'

const TEXT = {
  tr: {
    label: (n) => `İşbirlikçiler (${n})`, add: 'Davet Et', empty: 'Henüz işbirlikçi yok.', accepted: 'Katıldı',
    declined: 'Reddedildi', pending: 'Beklemede', inviteTitle: 'Bir Arkadaş Davet Et',
    noFriends: 'Davet edebileceğiniz arkadaşınız yok.', sent: 'Davet gönderildi', failed: 'Davet gönderilemedi',
    already: 'Bu arkadaş zaten davet edildi', invitedYou: 'Bu vizyona davet edildin', accept: 'Katıl', decline: 'Reddet',
  },
  en: {
    label: (n) => `Collaborators (${n})`, add: 'Invite', empty: 'No collaborators yet.', accepted: 'Joined',
    declined: 'Declined', pending: 'Pending', inviteTitle: 'Invite a Friend',
    noFriends: 'You have no friends available to invite.', sent: 'Invite sent', failed: 'Could not send the invite',
    already: 'This friend is already invited', invitedYou: "You've been invited to this vision", accept: 'Join', decline: 'Decline',
  },
}

const nameOf = (p) => p?.display_name || p?.username || '?'

export default function VisionCollaborators({ goalId, isOwner, currentUserId, lang = 'en' }) {
  const t = TEXT[lang === 'tr' ? 'tr' : 'en']
  const [list, setList] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [picker, setPicker] = useState(null) // null | 'loading' | friends[]
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('goal_collaborators').select(COLUMNS).eq('goal_id', goalId)
    setList(data || [])
    setLoaded(true)
  }, [goalId])

  useEffect(() => { if (goalId && currentUserId) load() }, [goalId, currentUserId, load])

  function flash(text) {
    setMsg(text)
    setTimeout(() => setMsg(''), 2500)
  }

  async function openPicker() {
    setPicker('loading')
    try {
      const res = await fetch('/api/friends/list?type=accepted', { headers: await getAuthHeader() })
      const json = await res.json().catch(() => ({}))
      const friends = (json.friendships || [])
        .map((f) => (f.user_id === currentUserId ? f.target : f.requester))
        .filter(Boolean)
      setPicker(friends)
    } catch {
      setPicker([])
    }
  }

  async function invite(friendId) {
    if (list.some((c) => c.user_id === friendId)) { flash(t.already); return }
    const { data, error } = await supabase
      .from('goal_collaborators')
      .insert({ goal_id: goalId, user_id: friendId, invited_by: currentUserId })
      .select(COLUMNS)
      .single()
    if (error) { flash(error.code === '23505' ? t.already : t.failed); return }
    setList((l) => [...l, data])
    setPicker(null)
    flash(t.sent)
  }

  async function remove(id) {
    const { error } = await supabase.from('goal_collaborators').delete().eq('id', id)
    if (!error) setList((l) => l.filter((c) => c.id !== id))
  }

  async function respond(id, accept) {
    const status = accept ? 'accepted' : 'declined'
    const { error } = await supabase
      .from('goal_collaborators')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) setList((l) => l.map((c) => (c.id === id ? { ...c, status } : c)))
  }

  if (!currentUserId || !loaded) return null
  const accepted = list.filter((c) => c.status === 'accepted')
  const myInvite = list.find((c) => c.user_id === currentUserId && c.status === 'pending')
  if (!isOwner && accepted.length === 0 && !myInvite) return null
  const visible = isOwner ? list : accepted

  return (
    <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
      {myInvite && (
        <div className="flex items-center gap-2 rounded-lg bg-astral-gold/10 p-2">
          <span className="flex-1 text-xs text-white">{t.invitedYou}</span>
          <button onClick={() => respond(myInvite.id, true)} className="rounded-full bg-astral-gold px-3 py-1 text-[11px] font-bold text-void-950">{t.accept}</button>
          <button onClick={() => respond(myInvite.id, false)} className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-bold text-slate-300">{t.decline}</button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{t.label(accepted.length)}</span>
        {isOwner && (
          <button onClick={openPicker} className="flex items-center gap-1 text-xs font-bold text-astral-gold"><UserPlus size={13} /> {t.add}</button>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="text-xs text-slate-500">{t.empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((c) => {
            const p = c.user_profiles
            const color = c.status === 'accepted' ? 'text-emerald-400' : c.status === 'declined' ? 'text-red-400' : 'text-amber-300'
            return (
              <li key={c.id} className="flex items-center gap-2">
                <Link href={`/u/${c.user_id}`} className="flex min-w-0 flex-1 items-center gap-2">
                  {p?.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">{nameOf(p).slice(0, 1).toUpperCase()}</span>
                  )}
                  <span className="truncate text-xs text-white">{nameOf(p)}</span>
                </Link>
                {isOwner && <span className={`text-[10px] ${color}`}>{t[c.status] || t.pending}</span>}
                {isOwner && (
                  <button onClick={() => remove(c.id)} aria-label="Remove" className="text-slate-500 hover:text-red-300"><X size={14} /></button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {msg && <p className="text-[11px] text-astral-gold" role="status">{msg}</p>}

      {picker !== null && (
        <div className="rounded-lg border border-white/10 bg-void-900 p-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-bold text-white">{t.inviteTitle}</span>
            <button onClick={() => setPicker(null)} aria-label="Close" className="text-slate-400"><X size={14} /></button>
          </div>
          {picker === 'loading' ? (
            <Loader2 size={16} className="mx-auto animate-spin text-astral-gold" />
          ) : picker.filter((f) => !list.some((c) => c.user_id === f.id)).length === 0 ? (
            <p className="text-xs text-slate-500">{t.noFriends}</p>
          ) : (
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {picker.filter((f) => !list.some((c) => c.user_id === f.id)).map((f) => (
                <li key={f.id}>
                  <button onClick={() => invite(f.id)} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-white/5">
                    {f.avatar_url ? (
                      <img src={f.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">{nameOf(f).slice(0, 1).toUpperCase()}</span>
                    )}
                    <span className="truncate text-xs text-white">{nameOf(f)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
