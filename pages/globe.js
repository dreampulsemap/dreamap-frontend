// pages/globe.js
import dynamic from 'next/dynamic'
import Head from 'next/head'
import Image from 'next/image'
import { Component, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const DreamGlobe = dynamic(() => import('../components/DreamGlobe'), {
  ssr: false,
  loading: () => {
    const { t } = require('react-i18next').useTranslation()
    return (
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
          {t('globe.globeLoading')}
        </div>
      </div>
    )
  }
})

class GlobeErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    const { t } = require('react-i18next').useTranslation()
    return {
      hasError: true,
      message: error?.message || t('globe.errorOccurred')
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
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="glass-card p-6 max-w-md w-full flex flex-col items-center text-center gap-4">
        <Image src="/logo.png" alt="Lunosfer Logo" width={48} height={48} />
        <h2 className="text-red-400 text-xl font-bold">
          {t('globe.errorOccurred')}
        </h2>
        <pre className="text-white/80 text-sm whitespace-pre-wrap text-left w-full bg-black/40 rounded-lg p-3">
          {message}
        </pre>
        <button
          onClick={onRetry ?? (() => window.location.reload())}
          className="w-full glass-card py-3 text-white hover:bg-white/10 transition-colors rounded-lg"
        >
          {t('common.retry')}
        </button>
      </div>
    </div>
  )
}

export default function GlobePage() {
  const { t } = useTranslation()
  const [runtimeError, setRuntimeError] = useState(null)

  useEffect(() => {
    const handleWindowError = (event) => {
      setRuntimeError(
        `${event.message}
(${t('globe.errorLineCol', {
          line: event.lineno,
          col: event.colno
        })})`
      )
    }
    const handleRejection = (event) => {
      setRuntimeError(`${t('globe.promiseRejected')}: ${event.reason}`)
    }

    window.addEventListener('error', handleWindowError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleWindowError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [t])

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
        <title>{t('globe.metaTitle')}</title>
        <meta name="description" content={t('globe.metaDescription')} />
        <link rel="icon" href="/logo.png" />
      </Head>
      <GlobeErrorBoundary>
        <DreamGlobe />
      </GlobeErrorBoundary>
    </>
  )
}