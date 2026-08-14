import '@/styles/globals.css'
import '@/lib/i18n'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import Sidebar from '@/components/Sidebar'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  
  // Tam ekran olan Küre, hata sayfaları veya WhatsApp-tarzı tam ekran
  // mesajlaşma sayfasında menüleri gizle
  const hideNavbarPaths = ['/globe', '/auth/callback', '/verify', '/analizetgulum', '/messages']
  const shouldHideNavbar = hideNavbarPaths.includes(router.pathname)

  return (
    <>
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