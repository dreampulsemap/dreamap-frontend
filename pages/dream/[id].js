import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import DreamAnalysisView from '@/components/DreamAnalysisView'
import Seo from '@/components/Seo'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getAuthHeader } from '@/lib/supabase'

// SEO NOTU: Bu sayfa bilerek noindex. `premium_deep_analysis` alanı
// shadow_focus / core_conflict / hidden_self gibi oldukça kişisel,
// psikolojik içerik barındırıyor. GÜVENLİK DÜZELTMESİ (bkz. get-dream.js):
// artık public olmayan rüyalar için o route Authorization: Bearer token'ı
// zorunlu kılıyor, bu yüzden istemci fetch'i de (aşağıdaki useEffect) artık
// getAuthHeader() ile token gönderiyor. getServerSideProps de aynı şekilde
// yalnızca visibility === 'public' rüyalar için içerik-özel SEO verisi
// üretiyor, aksi halde SSR meta etiketleri üzerinden (view-source ile)
// private içerik sızabilirdi. Yine de arama motorları indekslemesin diye
// noindex bilerek korunuyor. Kullanıcı kendi linkini paylaştığında
// WhatsApp/Twitter'da düzgün bir önizleme (başlık/açıklama) çıksın diye
// getServerSideProps ile sunucu tarafında hafif bir veri çekiliyor; asıl
// ekrana basılan içeriği istemci tarafı fetch besliyor, SSR verisi yalnızca
// <Seo> için kullanılıyor.
export async function getServerSideProps({ params }) {
  const { id } = params

  try {
    const { data: dream } = await supabaseAdmin
      .from('dreams')
      .select('ai_title, content, premium_deep_analysis, premium_deep_analysis_lang, visibility')
      .eq('id', id)
      .single()

    // service-role client RLS'i bypass eder; bu yüzden görünürlüğü burada
    // elle kontrol ediyoruz. public olmayan bir rüya için içerik-özel
    // başlık/özet üretmiyoruz (aşağıdaki <Seo> zaten generic bir varsayılana
    // düşüyor) — aksi halde bu veri, oturum kontrolünün olmadığı SSR HTML
    // içinde (view-source ile) herkese açık kalırdı.
    if (!dream || dream.visibility !== 'public') return { props: {} }

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

        const res = await fetch(`/api/get-dream?id=${id}`, { headers: await getAuthHeader() })
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
