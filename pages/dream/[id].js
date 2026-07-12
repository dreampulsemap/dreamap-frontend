import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import DreamAnalysisView from '@/components/DreamAnalysisView'

export default function DreamDetailPage() {
  const router = useRouter()
  const { id } = router.query

  const [dream, setDream] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return

    let cancelled = false

    async function loadDream() {
      try {
        setLoading(true)
        setError('')

        const res = await fetch(`/api/get-dream?id=${id}`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data?.error || 'Rüya verisi alınamadı')
        }

        if (!cancelled) {
          setDream(data.dream || null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Bir hata oluştu')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDream()

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0D1018',
          color: '#F8F5EF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
        }}
      >
        Yükleniyor...
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0D1018',
          color: '#F8F5EF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          fontSize: 18,
        }}
      >
        Hata: {error}
      </div>
    )
  }

  if (!dream) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0D1018',
          color: '#F8F5EF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
        }}
      >
        Rüya bulunamadı.
      </div>
    )
  }

  return <DreamAnalysisView dream={dream} lang="tr" />
}
