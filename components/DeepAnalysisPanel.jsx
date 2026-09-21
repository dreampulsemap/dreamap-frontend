import { useCallback, useEffect, useState } from 'react'
import { BrainCircuit } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getDeepAnalysisText } from '@/lib/deepAnalysisModalI18n'
import DeepAnalysisModal from '@/components/DeepAnalysisModal'

const GUMROAD_AURA_URL = process.env.NEXT_PUBLIC_GUMROAD_AURA_URL || ''

/**
 * Vizyon panosundaki "Derin Analiz" girisi. MentalWallPanel ile ayni yerde
 * duruyor ama farkli bir urun: bu, tum gecmisi birlikte okuyup tek bir
 * kisilik analizi + korku haritasi + yuzlesme karti uretiyor.
 */
export default function DeepAnalysisPanel({ lang = 'en', user }) {
  const t = getDeepAnalysisText(lang)
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState(null)
  const [auras, setAuras] = useState(0)
  const [isPremium, setIsPremium] = useState(false)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setToken(session.access_token)

    const [{ data: profile }, premiumRes] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('premium_analysis_auras')
        .eq('id', session.user.id)
        .maybeSingle(),
      fetch('/api/user/premium-status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((r) => r.json())
        .catch(() => null),
    ])

    // premium-status auraBalance da donuyor; profil sorgusu RLS ile
    // dogrudan okundugu icin ikisinden hangisi gelirse o kullaniliyor.
    setAuras(premiumRes?.auraBalance ?? profile?.premium_analysis_auras ?? 0)
    setIsPremium(Boolean(premiumRes?.isPremium))
  }, [])

  useEffect(() => {
    if (user?.id) load()
  }, [user, load])

  if (!user?.id) return null

  return (
    <>
      <div className="mb-6 glass-card rounded-2xl p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-primary-300">
              <BrainCircuit size={14} /> {t.title}
            </h3>
            <p className="text-xs leading-relaxed text-slate-400">{t.introTitle}</p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:opacity-90"
          >
            {t.cta(10)}
          </button>
        </div>
      </div>

      <DeepAnalysisModal
        isOpen={open}
        onClose={() => setOpen(false)}
        lang={lang}
        accessToken={token}
        auras={auras}
        isPremiumMember={isPremium}
        onAurasChanged={setAuras}
        onBuyAuras={() => {
          if (GUMROAD_AURA_URL) window.open(GUMROAD_AURA_URL, '_blank', 'noopener')
        }}
      />
    </>
  )
}
