import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { Smartphone } from 'lucide-react'
import Seo from '@/components/Seo'

// AppDownloadBanner'daki CTA buraya yönlendiriyor. Play Store'da henüz canlı
// bir liste yok — o yüzden banner doğrudan mağazaya değil, burada "yolda"
// olduğunu net şekilde anlatan, kırık link riski taşımayan bir sayfaya
// bağlanıyor. Yayına alındığında buraya gerçek Play Store rozetini/linkini
// eklemek yeterli olacak.
export default function ComingSoonAppPage() {
  const { t } = useTranslation()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-void-950 px-6 text-center">
      <Seo title={t('app.comingSoonTitle')} description={t('app.comingSoonSubtitle')} />

      <Image src="/logo.png" alt="Lunosfer" width={72} height={72} className="rounded-full shadow-astral-glow" priority />

      <div className="flex items-center gap-1.5 rounded-pill border border-astral-gold/30 bg-astral-gold/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-astral-gold">
        <Smartphone size={12} /> Android
      </div>

      <h1 className="text-3xl font-bold text-white">{t('app.comingSoonTitle')}</h1>

      <p className="max-w-sm text-sm leading-relaxed text-slate-400">
        {t('app.comingSoonSubtitle')}
      </p>

      <Link
        href="/"
        className="mt-4 rounded-pill bg-astral-gold px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-void-950 shadow-astral-glow transition hover:brightness-110"
      >
        {t('app.comingSoonBack')}
      </Link>
    </main>
  )
}
