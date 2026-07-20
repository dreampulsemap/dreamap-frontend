import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Gift } from 'lucide-react'

export default function ReferralWidget({ lang = 'en', user }) {
  const [stats, setStats] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    let active = true
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      try {
        const res = await fetch('/api/referrals/stats', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const json = await res.json()
        if (active && res.ok) setStats(json)
      } catch {
        // sessiz
      }
    })
    return () => { active = false }
  }, [user])

  if (!user?.id || !stats) return null

  const link = typeof window !== 'undefined'
    ? `${window.location.origin}/auth?ref=${stats.referralCode}`
    : ''

  function copyLink() {
    if (!link) return
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="mb-6 glass-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex-1 min-w-0">
        <h3 className="text-xs uppercase tracking-widest text-cyan-300 font-bold mb-1">
          <Gift size={14} className="inline -mt-0.5 mr-1" /> {lang === 'tr' ? 'Arkadaşını Davet Et' : 'Invite a Friend'}
        </h3>
        <p className="text-slate-400 text-xs">
          {lang === 'tr'
            ? `Her kayıt için 3 görsel kredisi kazan. Şimdiye kadar: ${stats.totalInvited} davet, ${stats.totalCreditsEarned} kredi.`
            : `Earn 3 image credits per signup. So far: ${stats.totalInvited} invited, ${stats.totalCreditsEarned} credits earned.`}
        </p>
      </div>
      <button
        onClick={copyLink}
        className="shrink-0 px-4 py-2 rounded-full bg-cyan-500/90 text-black text-xs font-bold uppercase tracking-widest hover:bg-cyan-400 transition-all"
      >
        {copied ? (lang === 'tr' ? 'Kopyalandı ✓' : 'Copied ✓') : (lang === 'tr' ? 'Linki Kopyala' : 'Copy Link')}
      </button>
    </div>
  )
}
