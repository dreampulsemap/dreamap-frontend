import { createContext, useContext, useEffect, useState } from 'react'

// pages/analizetgulum.js gibi diğer admin araçları token'ı her seferinde
// elle yapıştırtıyordu. Burada bir kez doğrulanan token localStorage'da
// tutuluyor (bu sayfa bir Claude artifact'i değil, gerçek bir Next.js
// sayfası — tarayıcı storage'ı burada normal ve kalıcılık için doğru araç),
// böylece /admin altındaki sayfalar arasında tekrar tekrar girmeye gerek
// kalmıyor. Token hiçbir zaman koda gömülü değil, yalnızca kullanıcının
// kendi tarayıcısında.
const AdminAuthContext = createContext(null)

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth, AdminAuthGate içinde kullanılmalı')
  return ctx
}

const STORAGE_KEY = 'dreamap_admin_token'

export default function AdminAuthGate({ children }) {
  const [token, setToken] = useState(null)
  const [checking, setChecking] = useState(true)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    const saved = window.sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      verify(saved)
    } else {
      setChecking(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function verify(candidate) {
    setVerifying(true)
    setError('')
    try {
      const res = await fetch('/api/admin/dreams/list?pageSize=1', {
        headers: { Authorization: `Bearer ${candidate}` },
      })
      if (res.status === 401) {
        setError('Token geçersiz.')
        window.sessionStorage.removeItem(STORAGE_KEY)
        setToken(null)
        return
      }
      if (!res.ok) {
        setError('Bağlantı hatası, tekrar dene.')
        return
      }
      window.sessionStorage.setItem(STORAGE_KEY, candidate)
      setToken(candidate)
    } catch {
      setError('Bağlantı hatası, tekrar dene.')
    } finally {
      setVerifying(false)
      setChecking(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || verifying) return
    verify(input.trim())
  }

  function logout() {
    window.sessionStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setInput('')
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0c0e14] flex items-center justify-center">
        <span className="text-slate-500 text-xs uppercase tracking-widest animate-pulse">Yükleniyor…</span>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0c0e14] flex items-center justify-center p-4">
        <form onSubmit={handleSubmit} className="w-full max-w-sm bg-[#141822] border border-white/10 rounded-2xl p-6">
          <h1 className="text-white font-bold text-lg mb-1">Yönetim Girişi</h1>
          <p className="text-slate-400 text-sm mb-5">Devam etmek için admin token&apos;ını gir.</p>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ADMIN_TOKEN"
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 mb-3"
          />
          {error && <p className="text-rose-400 text-xs mb-3">{error}</p>}
          <button
            type="submit"
            disabled={verifying || !input.trim()}
            className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 disabled:opacity-40 transition-colors"
          >
            {verifying ? 'Kontrol ediliyor…' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    )
  }

  return <AdminAuthContext.Provider value={{ token, logout }}>{children}</AdminAuthContext.Provider>
}
