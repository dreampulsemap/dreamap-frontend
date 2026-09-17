import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, auth } from '@/lib/supabase'

// Şifre sıfırlama e-postasındaki bağlantı buraya düşer. Supabase, linke
// tıklandığında kısa ömürlü bir "recovery" oturumu açar; bu oturum varken
// updateUser ile yeni şifre belirlenebilir. Oturum yoksa (link süresi dolmuş
// ya da doğrudan URL'ye gelinmiş) kullanıcıya yeni link isteme yolu gösterilir.
export default function ResetPasswordPage() {
  const router = useRouter()

  const [lang, setLang] = useState('tr')
  const [checking, setChecking] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lunosfer_lang')
      if (stored) setLang(stored)
    } catch (e) {}
  }, [])

  useEffect(() => {
    let active = true

    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return
      setHasRecoverySession(Boolean(session))
      setChecking(false)
    }

    // Supabase JS, URL'deki recovery token'ını kendisi işleyip PASSWORD_RECOVERY
    // olayını yayar; olay getSession'dan sonra gelebildiği için ikisini de dinliyoruz.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasRecoverySession(true)
        setChecking(false)
      }
    })

    check()

    return () => {
      active = false
      data?.subscription?.unsubscribe()
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError(lang === 'tr' ? 'Şifre en az 6 karakter olmalı.' : 'Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError(lang === 'tr' ? 'Şifreler eşleşmiyor.' : 'Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await auth.updatePassword(password)
      setDone(true)
      setTimeout(() => router.replace('/profile'), 2000)
    } catch (err) {
      setError(err?.message || (lang === 'tr' ? 'Şifre güncellenemedi.' : 'Could not update password.'))
    } finally {
      setLoading(false)
    }
  }

  const title = lang === 'tr' ? 'Yeni Şifre Belirle' : 'Set a New Password'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8">
        <h1 className="text-xl font-bold text-white mb-6">{title}</h1>

        {checking ? (
          <p className="text-white/60 text-sm">{lang === 'tr' ? 'Bağlantı doğrulanıyor…' : 'Verifying link…'}</p>
        ) : done ? (
          <p className="text-emerald-400 text-sm">
            {lang === 'tr'
              ? 'Şifren güncellendi. Yönlendiriliyorsun…'
              : 'Your password has been updated. Redirecting…'}
          </p>
        ) : !hasRecoverySession ? (
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              {lang === 'tr'
                ? 'Bu sıfırlama bağlantısı geçersiz ya da süresi dolmuş.'
                : 'This reset link is invalid or has expired.'}
            </p>
            <a
              href="/auth"
              className="inline-block rounded bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              {lang === 'tr' ? 'Yeni bağlantı iste' : 'Request a new link'}
            </a>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-white/70">
                  {lang === 'tr' ? 'Yeni şifre' : 'New password'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-xs text-brand-accent-300 hover:text-brand-accent-200"
                >
                  {showPassword
                    ? (lang === 'tr' ? 'Gizle' : 'Hide')
                    : (lang === 'tr' ? 'Göster' : 'Show')}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded px-3 py-2 bg-black/40 border border-white/10 outline-none focus:border-violet-400"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">
                {lang === 'tr' ? 'Yeni şifre (tekrar)' : 'Confirm new password'}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded px-3 py-2 bg-black/40 border border-white/10 outline-none focus:border-violet-400"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            {error && <p className="text-sm text-rose-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-violet-600 py-2 font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
            >
              {loading
                ? (lang === 'tr' ? 'Kaydediliyor…' : 'Saving…')
                : (lang === 'tr' ? 'Şifreyi Güncelle' : 'Update Password')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
