import { useState } from 'react'

export default function AnalizeTgulumPage() {
  const [token, setToken] = useState('')
  const [limit, setLimit] = useState(5)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function handleRun(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/reanalyze-dreams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          limit: Number(limit) || 5,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}`)
      }

      setResult(data)
    } catch (err) {
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Lunosfer Reanalyze Admin</h1>
        <p style={styles.text}>
          Pending kalan rüyaları yeniden Jungian analize göndermek için token ve batch sayısı gir.
        </p>

        <form onSubmit={handleRun} style={styles.form}>
          <label style={styles.label}>
            Admin Token
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ADMIN_REANALYZE_TOKEN"
              style={styles.input}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </label>

          <label style={styles.label}>
            Batch Limit
            <input
              type="number"
              min="1"
              max="20"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              style={styles.input}
              required
            />
          </label>

          <button type="submit" disabled={loading || !token} style={styles.button}>
            {loading ? 'Çalışıyor...' : 'Reanalyze Başlat'}
          </button>
        </form>

        {error ? (
          <div style={styles.errorBox}>
            <strong>Hata:</strong> {error}
          </div>
        ) : null}

        {result ? (
          <div style={styles.resultBox}>
            <div style={styles.resultLine}>
              <strong>Processed:</strong> {result.processed ?? 0}
            </div>
            <div style={styles.resultLine}>
              <strong>Success:</strong> {result.successCount ?? 0}
            </div>
            <div style={styles.resultLine}>
              <strong>Failed:</strong> {result.failCount ?? 0}
            </div>

            {Array.isArray(result.results) && result.results.length > 0 ? (
              <div style={styles.resultList}>
                {result.results.map((item, index) => (
                  <div key={`${item.dreamId}-${index}`} style={styles.resultItem}>
                    <div>
                      <strong>Dream ID:</strong> {item.dreamId}
                    </div>
                    <div>
                      <strong>Status:</strong> {item.success ? 'completed' : 'failed'}
                    </div>
                    {item.sentiment ? (
                      <div>
                        <strong>Sentiment:</strong> {item.sentiment}
                      </div>
                    ) : null}
                    {Array.isArray(item.archetypes) && item.archetypes.length > 0 ? (
                      <div>
                        <strong>Archetypes:</strong> {item.archetypes.join(', ')}
                      </div>
                    ) : null}
                    {item.error ? (
                      <div style={styles.resultError}>
                        <strong>Error:</strong> {item.error}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.resultLine}>Sonuç listesi boş.</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0b1020',
    color: '#f3f4f6',
    padding: '24px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: '720px',
    background: '#121933',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '18px',
    padding: '20px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  },
  title: {
    margin: 0,
    marginBottom: '12px',
    fontSize: '28px',
    lineHeight: 1.2,
  },
  text: {
    margin: 0,
    marginBottom: '20px',
    color: '#c7d2fe',
    fontSize: '15px',
    lineHeight: 1.6,
  },
  form: {
    display: 'grid',
    gap: '16px',
  },
  label: {
    display: 'grid',
    gap: '8px',
    fontSize: '14px',
    color: '#e5e7eb',
  },
  input: {
    width: '100%',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: '#0f172a',
    color: '#fff',
    padding: '12px 14px',
    fontSize: '16px',
    outline: 'none',
  },
  button: {
    border: 'none',
    borderRadius: '12px',
    background: '#8b5cf6',
    color: '#fff',
    padding: '14px 16px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  errorBox: {
    marginTop: '18px',
    borderRadius: '14px',
    padding: '14px',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.35)',
    color: '#fecaca',
  },
  resultBox: {
    marginTop: '18px',
    borderRadius: '14px',
    padding: '16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  resultLine: {
    marginBottom: '8px',
    fontSize: '15px',
  },
  resultList: {
    marginTop: '16px',
    display: 'grid',
    gap: '12px',
  },
  resultItem: {
    borderRadius: '12px',
    padding: '12px',
    background: '#0f172a',
    border: '1px solid rgba(255,255,255,0.08)',
    lineHeight: 1.6,
    fontSize: '14px',
  },
  resultError: {
    color: '#fca5a5',
  },
}