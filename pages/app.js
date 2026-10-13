// "Uygulamayı indir" sayfası. Uygulama Play Store'da yayında olduğu için eski
// "Çok Yakında" ekranının yerini aldı. Navbar/şerit butonları Android ve
// masaüstünde doğrudan Play Store'a gidiyor; buraya asıl olarak iPhone
// kullanıcıları (henüz iOS sürümü yok → "Ana Ekrana Ekle" yolu) ve doğrudan
// lunosfer.com/app adresini açanlar geliyor.
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Moon, Bell, RefreshCw, Play, Share, Smartphone } from 'lucide-react'
import Seo from '@/components/Seo'
import GetAppLink from '@/components/GetAppLink'
import { getTranslation } from '@/lib/i18n'
import { useAppPlatform } from '@/lib/appLinks'

const PERKS = [
  [Moon, 'app.perkCapture'],
  [Bell, 'app.perkNotify'],
  [RefreshCw, 'app.perkSync'],
]

export default function GetAppPage() {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  // SSR'da en, mount sonrası gerçek dil — Navbar ile aynı hydration-güvenli kalıp.
  const lang = mounted ? i18n?.language : 'en'
  const t = (key) => getTranslation(key, lang)
  const isIOS = useAppPlatform() === 'ios'

  return (
    <main className="flex min-h-screen items-center justify-center bg-void-950 px-6 py-12">
      <Seo title={t('app.pageTitle')} description={t('app.pageSubtitle')} />

      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center">
          <span className="font-serif text-2xl font-bold tracking-[3px] bg-gradient-to-r from-astral-gold to-astral-amber bg-clip-text text-transparent">
            LUNOSFER
          </span>
        </Link>

        <div className="mt-6 flex justify-center">
          {/* uppercase sınıfı yerine sabit metin: <html lang="tr"> iken CSS "Android"i "ANDROİD" yapıyordu. */}
          <span className="flex items-center gap-1.5 rounded-pill border border-astral-gold/30 bg-astral-gold/10 px-3 py-1 text-[11px] font-bold tracking-widest text-astral-gold">
            <Smartphone size={12} /> ANDROID
          </span>
        </div>

        <h1 className="mt-4 text-center font-serif text-3xl font-bold text-white">{t('app.pageTitle')}</h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-slate-400">{t('app.pageSubtitle')}</p>

        <ul className="mt-8 space-y-2.5">
          {PERKS.map(([Icon, key]) => (
            <li key={key} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-void-900 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-astral-gold/10 text-astral-gold">
                <Icon size={16} />
              </span>
              <span className="text-sm leading-snug text-slate-200">{t(key)}</span>
            </li>
          ))}
        </ul>

        {isIOS ? (
          <div className="mt-8 rounded-2xl border border-astral-gold/25 bg-astral-gold/5 p-5">
            <p className="font-semibold text-white">{t('app.iosTitle')}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{t('app.iosNote')}</p>
            <p className="mt-3 flex items-start gap-2 text-sm text-astral-gold">
              <Share size={16} className="mt-0.5 shrink-0" />
              <span>{t('app.iosSteps')}</span>
            </p>
          </div>
        ) : (
          <GetAppLink
            placement="app_page"
            className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-astral-gold text-sm font-bold text-void-950 shadow-astral-glow transition hover:brightness-110"
          >
            <Play size={18} fill="currentColor" />
            {t('app.playCta')}
          </GetAppLink>
        )}

        <Link href="/" className="mt-6 block text-center text-xs text-slate-500 transition hover:text-slate-300">
          {t('app.backToSite')}
        </Link>
      </div>
    </main>
  )
}
