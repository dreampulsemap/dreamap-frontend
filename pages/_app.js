import '@/styles/globals.css'
import '@/lib/i18n'
import Head from 'next/head'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import Sidebar from '@/components/Sidebar'
import AppDownloadBanner from '@/components/AppDownloadBanner'
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
  const hideNavbarPaths = ['/globe', '/auth/callback', '/verify', '/analizetgulum', '/messages', '/app']
  const shouldHideNavbar = hideNavbarPaths.includes(router.pathname)

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#04060E" />
      </Head>

      {/* Navbar'dan ÖNCE, sticky DEĞİL: sayfayla birlikte kaydırılıp gider,
          Navbar'ın kendi sticky top-0 davranışıyla çakışmaz. */}
      {!shouldHideNavbar && <AppDownloadBanner />}
      {!shouldHideNavbar && <Navbar />}
      {!shouldHideNavbar && <Sidebar />}
      
      {/* Mobilde BottomNav içeriğin üstüne binmesin diye pb-20, masaüstünde
          Sidebar'ın altında kalmasın diye lg:pl-64 eklendi. Breakpoint
          Sidebar.jsx / Navbar.jsx / BottomNav.jsx ile aynı (lg, 1024px)
          olmalı — yoksa tablet genişliklerinde (768-1023px) BottomNav
          gizlenip Sidebar henüz görünmeden içerik solda boş kalır. */}
      <div className={!shouldHideNavbar ? "pb-20 lg:pb-0 lg:pl-64" : ""}>
        <Component {...pageProps} />
      </div>

      {!shouldHideNavbar && <BottomNav />}
    </>
  )
}