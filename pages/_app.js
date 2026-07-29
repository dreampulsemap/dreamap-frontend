import '@/styles/globals.css'
import '@/lib/i18n'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import Sidebar from '@/components/Sidebar'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  
  // Tam ekran olan Küre veya hata sayfalarında menüleri gizle
  const hideNavbarPaths = ['/globe', '/auth/callback', '/analizetgulum']
  const shouldHideNavbar = hideNavbarPaths.includes(router.pathname)

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      {!shouldHideNavbar && <Sidebar />}
      
      {/* Mobilde BottomNav içeriğin üstüne binmesin diye pb-20, masaüstünde
          Sidebar'ın altında kalmasın diye md:pl-64 eklendi */}
      <div className={!shouldHideNavbar ? "pb-20 md:pb-0 md:pl-64" : ""}>
        <Component {...pageProps} />
      </div>

      {!shouldHideNavbar && <BottomNav />}
    </>
  )
}