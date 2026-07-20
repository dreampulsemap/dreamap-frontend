// pages/globe.js
import dynamic from 'next/dynamic'
import Head from 'next/head'
import Image from 'next/image'
import { Component, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '@/lib/translations'

// NOT: Bu sayfa önceden react-i18next'in t()'ini kullanıyordu, ama gerçek
// "globe.*" çevirileri lib/translations.js'de (8 dilde, tam) yazılmıştı —
// iki sistem birbirine hiç bağlı değildi. Sonuç: bu sayfadaki HER metin
// (hangi dilde olursa olsun, İngilizce dahil) ham anahtar string'i olarak
// görünüyordu (ör. literal "globe.errorOccurred" yazısı). Artık getTranslation
// kullanılıyor — mevcut çevirilere hiç yeni metin yazmadan bağlandı.

const DreamGlobe = dynamic(() => import('../components/DreamGlobe'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-6">
      <Image
        src="/logo.png"
        alt="Lunosfer Logo"
        width={72}
        height={72}
        priority
        className="opacity-90"
      />
      <div className="flex items-center gap-3 text-white text-xl">
        <span className="h-3 w-3 rounded-full bg-white/70 animate-pulse" />
        <LoadingLabel />
      </div>
    </div>
  )
})

// dynamic()'in loading render fonksiyonu React component ağacının DIŞINDA
// çağrılabiliyor — hook (useTranslation) burada güvenle çalışmayabiliyordu.
// Küçük bir component'e ayırıp normal şekilde render ediyoruz.
function LoadingLabel() {
  const { i18n } = useTranslation()
  const lang = (i18n.language || 'en').split('-')[0]
  return getTranslation('globe.globeLoading', lang)
}

class GlobeErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    // ÖNEMLİ DÜZELTME: burada önceden `useTranslation()` (bir React Hook)
    // static bir class metodu içinde çağrılıyordu — bu React'ta GEÇERSİZDİR,
    // hook'lar yalnızca function component gövdesinde çağrılabilir. Muhtemelen
    // gerçek bir hata anında bu satırın kendisi patlıyor ya da sessizce
    // undefined dönüyordu. getTranslation düz bir fonksiyon olduğu için
    // burada güvenle çağrılabilir (dil bilgisi olmadan 'en' varsayılan).
    return {
      hasError: true,
      message: error?.message || getTranslation('globe.errorOccurred', 'en')
    }
  }

  componentDidCatch(error, info) {
    console.error('GlobeErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorScreen
          message={this.state.message}
          onRetry={() => this.setState({ hasError: false, message: '' })}
        />
      )
    }
    return this.props.children
  }
}

function ErrorScreen({ message, onRetry }) {
  const { i18n } = useTranslation()
  const lang = (i18n.language || 'en').split('-')[0]
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="glass-card p-6 max-w-md w-full flex flex-col items-center text-center gap-4">
        <Image src="/logo.png" alt="Lunosfer Logo" width={48} height={48} />
        <h2 className="text-red-400 text-xl font-bold">
          {getTranslation('globe.errorOccurred', lang)}
        </h2>
        <pre className="text-white/80 text-sm whitespace-pre-wrap text-left w-full bg-black/40 rounded-lg p-3">
          {message}
        </pre>
        <button
          onClick={onRetry ?? (() => window.location.reload())}
          className="w-full glass-card py-3 text-white hover:bg-white/10 transition-colors rounded-lg"
        >
          {getTranslation('common.retry', lang)}
        </button>
      </div>
    </div>
  )
}

export default function GlobePage() {
  const { i18n } = useTranslation()
  const lang = (i18n.language || 'en').split('-')[0]
  const [runtimeError, setRuntimeError] = useState(null)

  useEffect(() => {
    const handleWindowError = (event) => {
      const lineColText = getTranslation('globe.errorLineCol', lang)
        .replace('{{line}}', event.lineno)
        .replace('{{col}}', event.colno)
      setRuntimeError(`${event.message}\n(${lineColText})`)
    }
    const handleRejection = (event) => {
      setRuntimeError(`${getTranslation('globe.promiseRejected', lang)}: ${event.reason}`)
    }

    window.addEventListener('error', handleWindowError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleWindowError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [lang])

  if (runtimeError) {
    return (
      <ErrorScreen
        message={runtimeError}
        onRetry={() => setRuntimeError(null)}
      />
    )
  }

  return (
    <>
      <Head>
        <title>{getTranslation('globe.metaTitle', lang)}</title>
        <meta name="description" content={getTranslation('globe.metaDescription', lang)} />
        <link rel="icon" href="/logo.png" />
      </Head>
      <GlobeErrorBoundary>
        <DreamGlobe />
      </GlobeErrorBoundary>
    </>
  )
}