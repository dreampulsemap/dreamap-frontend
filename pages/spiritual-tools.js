// "Ruhsal Araçlar" — Android SpiritualToolsScreen'in web karşılığı:
// Zihin Duvarı (Gölge Çalışması), Ruh Haritası ve Kahin tek sayfada sekmeli.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import Seo from '@/components/Seo'
import MentalWallPanel from '@/components/MentalWallPanel'
import PsycheMap from '@/components/PsycheMap'
import ProphetPanel from '@/components/ProphetPanel'
import DeepAnalysisPanel from '@/components/DeepAnalysisPanel'
import { supabase } from '@/lib/supabase'

const TABS = ['mental', 'psyche', 'prophet']

export default function SpiritualToolsPage() {
  const router = useRouter()
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const lang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const tr = lang === 'tr'
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('mental')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/auth')
      else setUser(session.user)
    })
  }, [router])

  useEffect(() => {
    if (TABS.includes(router.query.tab)) setTab(router.query.tab)
  }, [router.query.tab])

  const labels = tr
    ? { mental: 'Zihin Duvarı', psyche: 'Ruh Haritası', prophet: 'Kahin' }
    : { mental: 'Mental Wall', psyche: 'Psyche Map', prophet: 'Prophet' }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <Seo title={tr ? 'Ruhsal Araçlar' : 'Spiritual Tools'} noindex lang={lang} />
      <h1 className="mb-4 font-serif text-3xl font-bold text-white">{tr ? 'Ruhsal Araçlar' : 'Spiritual Tools'}</h1>
      <div className="mb-5 inline-flex rounded-full bg-white/5 p-1">
        {TABS.map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${tab === key ? 'bg-astral-gold text-void-950' : 'text-slate-400'}`}
          >
            {labels[key]}
          </button>
        ))}
      </div>
      {user && tab === 'mental' && <MentalWallPanel lang={lang} user={user} />}
      {user && tab === 'psyche' && <PsycheMap lang={lang} />}
      {user && tab === 'prophet' && <ProphetPanel lang={lang} user={user} />}
      {user && <DeepAnalysisPanel lang={lang} user={user} />}
    </main>
  )
}
