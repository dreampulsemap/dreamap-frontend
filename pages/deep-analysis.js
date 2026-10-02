// Android DeepAnalysisScreen.kt — ⋮ > Derin Analiz.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import Seo from '@/components/Seo'
import DeepAnalysisModal from '@/components/DeepAnalysisModal'
import { supabase } from '@/lib/supabase'
import { getDeepAnalysisText } from '@/lib/deepAnalysisModalI18n'

const SHOP_URL = 'https://shop.lunosfer.com'

export default function DeepAnalysisPage() {
  const router = useRouter()
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const lang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const t = getDeepAnalysisText(lang)

  const [token, setToken] = useState(null)
  const [auras, setAuras] = useState(0)
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return router.replace('/auth')
      setToken(session.access_token)
      const res = await fetch('/api/user/premium-status', { headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => null)
      const json = res ? await res.json().catch(() => null) : null
      if (typeof json?.auraBalance === 'number') setAuras(json.auraBalance)
      setIsPremium(Boolean(json?.isPremium))
    })
  }, [router])

  return (
    <main className="min-h-screen bg-void-950">
      <Seo title={t.title} noindex lang={lang} />
      <header className="sticky top-0 z-40 flex h-16 items-center gap-2 bg-void-950 px-1">
        <button onClick={() => router.back()} aria-label={t.back} className="flex h-12 w-12 items-center justify-center rounded-full text-white hover:bg-white/5">
          <ArrowLeft size={24} />
        </button>
        <h1 className="flex-1 font-serif text-base font-medium text-white">{t.title}</h1>
        <span className="mr-3.5 text-xs text-astral-gold">{t.balance(auras)}</span>
      </header>
      {token && (
        <DeepAnalysisModal
          inline
          isOpen
          onClose={() => router.back()}
          lang={lang}
          accessToken={token}
          auras={auras}
          isPremiumMember={isPremium}
          onAurasChanged={setAuras}
          onBuyAuras={() => window.open(SHOP_URL, '_blank', 'noopener')}
        />
      )}
    </main>
  )
}
