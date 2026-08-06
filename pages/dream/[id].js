import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import DreamAnalysisView from '@/components/DreamAnalysisView'
import Seo from '@/components/Seo'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// SEO NOTU: Bu sayfa bilerek noindex. `premium_deep_analysis` alanı
// shadow_focus / core_conflict / hidden_self gibi oldukça kişisel,
// psikolojik içerik barındırıyor ve pages/api/get-dream.js herhangi bir
// sahiplik/görünürlük kontrolü yapmadan id ile herkese döndürüyor — yani bu
// içeriğin Google'da arama sonucuna düşmesini istemiyoruz. Yine de bir
// kullanıcı kendi linkini paylaştığında WhatsApp/Twitter'da düzgün bir
// önizleme (başlık/açıklama) çıksın diye getServerSideProps ile sunucu
// tarafında hafif bir veri çekiyoruz — mevcut istemci tarafı fetch (aşağıdaki
// useEffect) elle dokunulmadan aynen duruyor, asıl ekrana basılan içeriği o
// besliyor; SSR verisi yalnızca <Seo> için kullanılıyor.
export async function getServerSideProps({ params }) {
  const { id } = params

  try {
    const { data: dream } = await supabaseAdmin
      .from('dreams')
      .select('ai_title, content, premium_deep_analysis, premium_deep_analysis_lang')
      .eq('id', id)
      .single()

    if (!dream) return { props: {} }

    const lang = dream.premium_deep_analysis_lang || 'tr'
    const getVal = (v) => {
      if (!v) return ''
      if (typeof v === 'string') return v
      return v[lang] || v.tr || v.en || Object.values(v)[0] || ''
    }

    const analysis = dream.premium_deep_analysis
    const seoTitle = (analysis && getVal(analysis.title)) || dream.ai_title || null
    const rawDescription = (analysis && getVal(analysis.summary)) || dream.content || ''
    const seoDescription = rawDescription ? rawDescription.slice(0, 155).trim() : null

    return { props: { seoTitle, seoDescription } }
  } catch {
    return { props: {} }
  }
}

export default function DreamDetailPage({ seoTitle, seoDescription }) {
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

  const seo = (
    <Seo
      title={seoTitle || 'Rüya Analizi'}
      description={seoDescription || 'Lunosfer üzerinde paylaşılan, yapay zekâ destekli bir Jung rüya analizi.'}
      type="article"
      noindex
    />
  )

  if (loading) {
    return (
      <>
        {seo}
        <div
          className="full-height-mobile-safe"
          style={{
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
      </>
    )
  }

  if (error) {
    return (
      <>
        {seo}
        <div
          className="full-height-mobile-safe"
          style={{
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
      </>
    )
  }

  if (!dream) {
    return (
      <>
        {seo}
        <div
          className="full-height-mobile-safe"
          style={{
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
      </>
    )
  }

  // NOT: DreamAnalysisView `analysis` prop'u bekliyor, `dream` değil — önceden
  // burada `dream={dream}` geçiliyordu, bu yüzden `analysis` hep undefined
  // kalıp component sonsuza dek "yükleniyor" spinner'ı gösteriyordu (analiz
  // DB'de tamamlanmış olsa bile). Push bildirimleri kullanıcıyı doğrudan bu
  // sayfaya yönlendirdiği için etkisi büyüktü.
  if (dream.premium_deep_analysis_status === 'pending' || dream.premium_deep_analysis_status === 'processing') {
    return (
      <>
        {seo}
        <div
          className="full-height-mobile-safe"
          style={{
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
      </>
    )
  }

  if (dream.premium_deep_analysis_status === 'failed') {
    return (
      <>
        {seo}
        <div
          className="full-height-mobile-safe"
          style={{
            background: '#0D1018',
            color: '#F8F5EF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 24,
            textAlign: 'center',
            fontSize: 18,
          }}
        >
          <div>Analiz oluşturulamadı. Auralarınız iade edildi, tekrar deneyebilirsiniz.</div>
          {dream.premium_deep_analysis_error && (
            <div style={{ fontSize: 13, opacity: 0.6, maxWidth: 480 }}>
              Sebep: {dream.premium_deep_analysis_error}
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      {seo}
      <DreamAnalysisView analysis={dream.premium_deep_analysis} lang={dream.premium_deep_analysis_lang || 'tr'} />
    </>
  )
}
