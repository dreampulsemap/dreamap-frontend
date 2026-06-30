import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

// Client-side only component
const DreamGlobe = dynamic(() => import('../components/DreamGlobe'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-white text-xl">Loading 3D Globe...</div>
    </div>
  )
})

export default function GlobePage() {
  const [error, setError] = useState(null)

  useEffect(() => {
    // Global error handler
    window.onerror = (msg, url, line) => {
      setError(`Error: ${msg}\nLine: ${line}`)
    }
    
    // Console override - ekrana yaz
    const originalConsoleError = console.error
    console.error = function(...args) {
      originalConsoleError.apply(console, args)
      setError(args.join(' '))
    }
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8">
        <div className="glass-card p-6 max-w-md">
          <h2 className="text-red-400 text-xl font-bold mb-4">❌ Error</h2>
          <pre className="text-white/80 text-sm whitespace-pre-wrap mb-4">
            {error}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="w-full glass-card py-3 text-white hover:bg-white/10"
          >
            🔁 Retry
          </button>
        </div>
      </div>
    )
  }

  return <DreamGlobe />
}
