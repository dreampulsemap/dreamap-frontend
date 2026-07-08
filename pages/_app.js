import '@/styles/globals.css'
import '../lib/i18n'  // i18n'i import et
import { Analytics } from '@vercel/analytics/next'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
