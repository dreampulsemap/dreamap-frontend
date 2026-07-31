import { useState, useRef } from 'react'

export default function GorselTamiriPage() {
  const [token, setToken] = useState('')
  const [limit, setLimit] = useState(25)
  const [running, setRunning] = useState(false)
  const [totalProcessed, setTotalProcessed] = useState(0)
  const [remaining, setRemaining] = useState(null)
  const [log, setLog] = useState([])
  const [error, setError] = useState('')
  const stopRef = useRef(false)

  async function runOneBatch() {
    const response = await fetch(`/api/cron/repair-broken-images?limit=${Number(limit) || 25}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`)
    return data
  }

  async function handleRunAll(e) {
    e.preventDefault()
    setError('')
    setLog([])
    setTotalProcessed(0)
    setRemaining(null)
    setRunning(true)
    stopRef.current = false

    try {
      // 'remaining' 0 olana ya da işlenecek bir şey kalmayana kadar art arda
      // batch çalıştır — Hasan'ın tek tek tıklamasına gerek kalmadan tüm
      // backlog erisin.
      for (let i = 0; i < 200; i++) {
        if (stopRef.current) break
        const data = await runOneBatch()
        setTotalProcessed((t) => t + (data.processed || 0))
        setRemaining(data.remaining ?? null)
        setLog((prev) => [
          ...prev,
          `Tur ${i + 1}: ${data.processed || 0} işlendi, kalan: ${data.remaining ?? '?'}`,
        ])
        if (!data.processed || data.processed === 0) break
        if (data.remaining === 0) break
      }
    } catch (err) {
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Lunosfer Görsel Onarım Admin</h1>
        <p style={styles.text}>
          "needs_persist" / "broken" işaretli rüya görsellerini toplu onarır —
          "remaining" sıfıra inene kadar otomatik olarak batch'leri art arda çalıştırır.
        </p>

        <form onSubmit={handleRunAll} style={styles.form}>
          <label style={styles.label}>
            Admin Token (CRON_SECRET)
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="CRON_SECRET"
              style={styles.input}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </label>

          <label style={styles.label}>
            Batch Başına Limit (maks. 40)
            <input
              type="number"
              min="1"
              max="40"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              style={styles.input}
              required
            />
          </label>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={running || !token} style={styles.button}>
              {running ? 'Çalışıyor...' : 'Tümünü Onar'}
            </button>
            {running && (
              <button
                type="button"
                onClick={() => { stopRef.current = true }}
                style={styles.stopButton}
              >
                Durdur
              </button>
            )}
          </div>
        </form>

        <div style={styles.resultBox}>
          <div style={styles.resultLine}><strong>Toplam Onarılan:</strong> {totalProcessed}</div>
          <div style={styles.resultLine}><strong>Kalan (backlog):</strong> {remaining ?? '—'}</div>
        </div>

        {error ? (
          <div style={styles.errorBox}><strong>Hata:</strong> {error}</div>
        ) : null}

        {log.length > 0 && (
          <div style={styles.resultList}>
            {log.map((line, i) => (
              <div key={i} style={styles.resultItem}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#0b1020', color: '#f3f4f6', padding: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' },
  card: { width: '100%', maxWidth: '720px', background: '#121933', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' },
  title: { margin: 0, marginBottom: '12px', fontSize: '28px', lineHeight: 1.2 },
  text: { margin: 0, marginBottom: '20px', color: '#c7d2fe', fontSize: '15px', lineHeight: 1.6 },
  form: { display: 'grid', gap: '16px' },
  label: { display: 'grid', gap: '8px', fontSize: '14px', color: '#e5e7eb' },
  input: { width: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', background: '#0f172a', color: '#fff', padding: '12px 14px', fontSize: '16px', outline: 'none' },
  button: { border: 'none', borderRadius: '12px', background: '#8b5cf6', color: '#fff', padding: '14px 16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', flex: 1 },
  stopButton: { border: '1px solid rgba(239,68,68,0.4)', borderRadius: '12px', background: 'rgba(239,68,68,0.12)', color: '#fecaca', padding: '14px 16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' },
  errorBox: { marginTop: '18px', borderRadius: '14px', padding: '14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fecaca' },
  resultBox: { marginTop: '18px', borderRadius: '14px', padding: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' },
  resultLine: { marginBottom: '8px', fontSize: '15px' },
  resultList: { marginTop: '16px', display: 'grid', gap: '8px', maxHeight: '300px', overflowY: 'auto' },
  resultItem: { borderRadius: '10px', padding: '10px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px' },
}
