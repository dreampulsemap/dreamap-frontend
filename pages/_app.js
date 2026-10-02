import '@/styles/globals.css'
import '@/lib/i18n'
import Head from 'next/head'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import AppDownloadBanner from '@/components/AppDownloadBanner'
import { GameEventHost } from '@/components/game/GameUI'
import OnboardingHost from '@/components/game/OnboardingTour'
import { useRouter } from 'next/router'
import { initPostHogClient, capturePageview } from '@/lib/posthog-client'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const { i18n } = useTranslation()

  useEffect(() => {
    initPostHogClient()
    capturePageview(window.location.href)

    const handleRouteChange = (url) => capturePageview(url)
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => router.events.off('routeChangeComplete', handleRouteChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // <html lang> SSR'da her zaman _document.js'teki sabit "tr" — burada
  // i18next istemci tarafında farklı bir dil algılar/seçerse senkronize
  // ediyoruz. Doğrudan DOM mutasyonu (React render'ının parçası değil),
  // bu yüzden hydration mismatch riski taşımıyor.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = (i18n.language || 'tr').split('-')[0]
    }
  }, [i18n.language])

  // Tam ekran olan Küre, hata sayfaları veya WhatsApp-tarzı tam ekran
  // mesajlaşma sayfasında menüleri gizle
  // /share/...: dış platformlardan gelen paylaşım bağlantısının kendi
  // "uygulamada aç / indir" düzeni var; site menüleri orada kafa karıştırıyor.
  const hideNavbarPaths = ['/globe', '/auth/callback', '/verify', '/analizetgulum', '/messages', '/app', '/share/[type]/[id]']
  const shouldHideNavbar = hideNavbarPaths.includes(router.pathname)
  // Android'de kendi başlığı + geri butonu olan ekranlar (MainScreen fullScreenRoutes):
  // uygulama üst/alt barı gösterilmez, yoksa çift başlık oluşur.
  const ownHeader = ['/notifications', '/blocked-users', '/deep-analysis'].includes(router.pathname)

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#04060E" />
      </Head>

      {/* Navbar'dan ÖNCE, sticky DEĞİL: sayfayla birlikte kaydırılıp gider,
          Navbar'ın kendi sticky top-0 davranışıyla çakışmaz. */}
      {!shouldHideNavbar && <AppDownloadBanner />}
      {!shouldHideNavbar && !ownHeader && <Navbar />}

      {/* Android ile aynı görünüm: her genişlikte tek, ortalanmış uygulama sütunu
          (üst bar + alt menü). pb-24: 80px alt menü + taşan oluştur butonu. */}
      <div className={!shouldHideNavbar ? 'mx-auto w-full max-w-2xl pb-24' : ''}>
        <Component {...pageProps} />
      </div>

      {!shouldHideNavbar && !ownHeader && <BottomNav />}
      {/* XP / rozet / rütbe kutlamaları + ilerleme tazeleme (Android GameEventHost) */}
      <GameEventHost lang={(i18n.language || 'en').split('-')[0]} />
      {/* İlk girişte tanıtım turu (Android OnboardingScreen) */}
      <OnboardingHost lang={(i18n.language || 'en').split('-')[0]} />
    </>
  )
}