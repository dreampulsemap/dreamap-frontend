import '@/styles/globals.css'
import '../lib/i18n'  // i18n'i import et
import Navbar from '../components/Navbar'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  
  // Navbar'ın görünmesini istemediğimiz tam ekran veya özel rotalar
  const hideNavbarPaths = ['/globe', '/auth/callback', '/analizetgulum']
  const shouldHideNavbar = hideNavbarPaths.includes(router.pathname)

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      <Component {...pageProps} />
    </>
  )
}