import { createContext, useContext, useEffect, useState } from 'react'

// Token, /api/admin/login tarafından HttpOnly cookie olarak yazılır —
// tarayıcı JS'i (ve dolayısıyla bir XSS) okuyamaz. Önceden localStorage'da
// düz metin tutuluyordu, tüm admin yetkisini XSS'e açık bırakıyordu.
const AdminAuthContext = createContext(null)

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth, AdminAuthGate içinde kullanılmalı')
  return ctx
}

export default function AdminAuthGate({ children }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    fetch('/api/admin/verify')
      .then((res) => setAuthenticated(res.ok))
      .catch(() => setAuthenticated(false))
      .finally(() => setChecking(false))
  }, [])

  async function login(candidate) {
    setVerifying(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: candidate }),
      })
      if (!res.ok) {
        setError('Token geçersiz.')
        return
      }
      setAuthenticated(true)
    } catch {
      setError('Bağlantı hatası, tekrar dene.')
    } finally {
      setVerifying(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || verifying) return
    login(input.trim())
  }

  function logout() {
    fetch('/api/admin/logout', { method: 'POST' }).finally(() => {
      setAuthenticated(false)
      setInput('')
    })
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0c0e14] flex items-center justify-center">
        <span className="text-slate-500 text-xs uppercase tracking-widest animate-pulse">Yükleniyor…</span>
      </div>
    )
  }

  if (!authenticated) {
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

  return <AdminAuthContext.Provider value={{ logout }}>{children}</AdminAuthContext.Provider>
}
