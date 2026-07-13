import { useState } from 'react'

export default function GumroadTestPage() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function sendTest() {
    setLoading(true)
    setResult(null)

    try {
      const body = new URLSearchParams({
        sale_id: `tablet-test-${Date.now()}`,
        email: 'BURAYA_LUNOSFER_HESABINDAKI_MAILINI_YAZ',
        product_id: 'test-product-1',
        product_name: 'Lunosfer Deep Analysis',
        product_permalink: 'swbskc',
        test: 'true',
      }).toString()

      const res = await fetch('/api/gumroad-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      })

      const data = await res.json()
      setResult(data)
    } catch (error) {
      setResult({
        error: error.message || 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Gumroad Webhook Test</h1>
      <button
        onClick={sendTest}
        disabled={loading}
        style={{
          padding: '12px 16px',
          borderRadius: 10,
          border: '1px solid #ccc',
          background: '#111',
          color: '#fff',
        }}
      >
        {loading ? 'Gönderiliyor...' : 'Test POST Gönder'}
      </button>

      <pre
        style={{
          marginTop: 24,
          padding: 16,
          background: '#f5f5f5',
          borderRadius: 12,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {result ? JSON.stringify(result, null, 2) : 'Henüz sonuç yok'}
      </pre>
    </main>
  )
}