import dynamic from 'next/dynamic'
import Head from 'next/head'
import Image from 'next/image'
import { Component, useEffect, useState } from 'react'

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
        3D Küre Yükleniyor...
      </div>
    </div>
  )
})

// Render sırasında oluşan hataları güvenli şekilde yakalayan Error Boundary
class GlobeErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Beklenmeyen bir hata oluştu.' }
  }

  componentDidCatch(error, info) {
    // İstemci tarafında merkezi loglama için buraya bir servis çağrısı eklenebilir
    console.error('GlobeErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorScreen message={this.state.message} onRetry={() => this.setState({ hasError: false, message: '' })} />
    }
    return this.props.children
  }
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="glass-card p-6 max-w-md w-full flex flex-col items-center text-center gap-4">
        <Image src="/logo.png" alt="Lunosfer Logo" width={48} height={48} />
        <h2 className="text-red-400 text-xl font-bold">Bir Hata Oluştu</h2>
        <pre className="text-white/80 text-sm whitespace-pre-wrap text-left w-full bg-black/40 rounded-lg p-3">
          {message}
        </pre>
        <button
          onClick={onRetry ?? (() => window.location.reload())}
          className="w-full glass-card py-3 text-white hover:bg-white/10 transition-colors rounded-lg"
        >
          Yeniden Dene
        </button>
      </div>
    </div>
  )
}

export default function GlobePage() {
  const [runtimeError, setRuntimeError] = useState(null)

  useEffect(() => {
    const handleWindowError = (event) => {
      setRuntimeError(`${event.message}
(satır: ${event.lineno}, sütun: ${event.colno})`)
    }
    const handleRejection = (event) => {
      setRuntimeError(`Promise reddedildi: ${event.reason}`)
    }

    window.addEventListener('error', handleWindowError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleWindowError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  if (runtimeError) {
    return <ErrorScreen message={runtimeError} onRetry={() => setRuntimeError(null)} />
  }

  return (
    <>
      <Head>
        <title>Lunosfer — 3D İnteraktif Küre</title>
        <meta name="description" content="Lunosfer ile 3D dünya deneyimini keşfedin" />
        <link rel="icon" href="/logo.png" />
      </Head>
      <GlobeErrorBoundary>
        <DreamGlobe />
      </GlobeErrorBoundary>
    </>
  )
}