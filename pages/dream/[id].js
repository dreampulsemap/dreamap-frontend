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

  // NOT: DreamAnalysisView `analysis` prop'u bekliyor, `dream` değil — önceden
  // burada `dream={dream}` geçiliyordu, bu yüzden `analysis` hep undefined
  // kalıp component sonsuza dek "yükleniyor" spinner'ı gösteriyordu (analiz
  // DB'de tamamlanmış olsa bile). Push bildirimleri kullanıcıyı doğrudan bu
  // sayfaya yönlendirdiği için etkisi büyüktü.
  if (dream.premium_deep_analysis_status === 'pending' || dream.premium_deep_analysis_status === 'processing') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0D1018',
          color: '#F8F5EF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          fontSize: 18,
        }}
      >
        <div>Analiziniz hazırlanıyor...</div>
        <div style={{ fontSize: 13, opacity: 0.6 }}>Bu birkaç dakika sürebilir, bittiğinde bildirim gelecek.</div>
      </div>
    )
  }

  if (dream.premium_deep_analysis_status === 'failed') {
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
        Analiz oluşturulamadı. Auralarınız iade edildi, tekrar deneyebilirsiniz.
      </div>
    )
  }

  return <DreamAnalysisView analysis={dream.premium_deep_analysis} lang={dream.premium_deep_analysis_lang || 'tr'} />
}
