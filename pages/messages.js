import Head from 'next/head'
import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'

// NOT: Mesajlaşma özelliğinin backend'i (tablo/API) henüz yok. Bu sayfa
// yalnızca alt/üst navbar'daki "Mesaj" linkinin 404 vermemesi için eklendi.
// Gerçek DM/mesajlaşma akışı ayrı bir iş — istenirse ayrıca kurulabilir.
export default function MessagesPage() {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const lang = mounted ? (i18n?.language || 'en').split('-')[0] : 'en'

  return (
    <>
      <Head>
        <title>{lang === 'tr' ? 'Mesajlar — Lunosfer' : 'Messages — Lunosfer'}</title>
      </Head>
      <main className="min-h-[70vh] flex items-center justify-center px-6 py-16">
        <div className="glass-card max-w-sm w-full p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-aether-violet/30 bg-aether-violet/10 text-aether-violet">
            <MessageCircle size={24} />
          </div>
          <h1 className="text-lg font-bold font-serif text-white mb-2">
            {lang === 'tr' ? 'Mesajlar Yakında' : 'Messages, coming soon'}
          </h1>
          <p className="text-sm text-slate-400">
            {lang === 'tr'
              ? 'Doğrudan mesajlaşma üzerinde çalışıyoruz. Şimdilik bildirimler ve yorumlar üzerinden bağlantıda kalabilirsin.'
              : "We're building direct messaging. For now, notifications and comments keep you connected."}
          </p>
        </div>
      </main>
    </>
  )
}
