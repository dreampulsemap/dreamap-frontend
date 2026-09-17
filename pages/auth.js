import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import { auth, getAuthHeader } from '../lib/supabase'
import { getTranslation } from '../lib/translations'
import LanguageSwitcher from '../components/LanguageSwitcher'
import TextSkeleton from '../components/TextSkeleton'
import Seo from '../components/Seo'

const OAUTH_PROVIDERS = [
  {
    key: 'google',
    label: 'Google ile devam et',
  },
]

function GoogleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        fill="#4285F4"
        d="M21.35 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.52h3.14c1.84-1.69 2.91-4.18 2.91-7.29Z"
      />
      <path
        fill="#34A853"
        d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.52c-.87.59-1.99.94-3.31.94-2.54 0-4.7-1.72-5.47-4.03H3.29v2.6A9.75 9.75 0 0 0 12 21.75Z"
      />
      <path
        fill="#FBBC05"
        d="M6.53 13.78A5.86 5.86 0 0 1 6.22 12c0-.62.11-1.21.31-1.78v-2.6H3.29A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.04 4.38l3.24-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.19c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.29 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.71 5.37l3.24 2.6c.77-2.31 2.93-4.03 5.47-4.03Z"
      />
    </svg>
  )
}

export default function AuthPage() {
  const router = useRouter()
  const { i18n } = useTranslation()

  const [mounted, setMounted] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [gender, setGender] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [user, setUser] = useState(null)
  const [checkingUser, setCheckingUser] = useState(true)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState('')
  const [error, setError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetNotice, setResetNotice] = useState('')

  const lang = mounted ? (i18n.language || 'en') : 'en'

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (router.query?.ref && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          'pending_referral_code',
          String(router.query.ref)
        )
      } catch (_) {}
    }
  }, [router.query])

  useEffect(() => {
    let active = true

    const loadUser = async () => {
      try {
        const currentUser = await auth.getUser()

        if (!active) return

        setUser(currentUser || null)
      } catch (err) {
        console.error('Error checking user:', err)
      } finally {
        if (active) setCheckingUser(false)
      }
    }

    loadUser()

    const { data } = auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user || null)
    })

    return () => {
      active = false
      data?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (user) {
      router.replace('/profile')
    }
  }, [router, user])

  async function handleForgotPassword() {
    setError('')
    setResetNotice('')

    if (!email.trim()) {
      setError(lang === 'tr'
        ? 'Sıfırlama bağlantısı için önce e-posta adresini yaz.'
        : 'Enter your email first to get a reset link.')
      return
    }

    setResetLoading(true)
    try {
      await auth.resetPassword(email.trim())
      // Hesabın var olup olmadığını sızdırmamak için mesaj her durumda aynı.
      setResetNotice(lang === 'tr'
        ? 'Bu adres kayıtlıysa sıfırlama bağlantısı gönderildi. E-postanı kontrol et.'
        : 'If that address is registered, a reset link has been sent. Check your email.')
    } catch (err) {
      setError(err?.message || (lang === 'tr' ? 'Bağlantı gönderilemedi.' : 'Could not send the link.'))
    } finally {
      setResetLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await auth.signIn(email, password)
        router.replace('/profile')
        return
      }

      const data = await auth.signUp(email, password, username)
      const newUserId = data?.user?.id

      if (newUserId) {
        await fetch('/api/update-profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(await getAuthHeader()),
          },
          body: JSON.stringify({
            userId: newUserId,
            language: lang,
            gender: gender || 'unspecified',
          }),
        })
      }

      if (data?.session) {
        router.replace('/profile')
      } else {
        setError(
          getTranslation('auth.success', lang) ||
            'Kayıt başarılı! Lütfen e-posta adresini kontrol et.'
        )
      }
    } catch (err) {
      console.error('Auth submit error:', err)
      setError(err?.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuth(provider) {
    if (provider !== 'google') return

    setError('')
    setOauthLoading(provider)

    try {
      if (typeof auth.signInWithOAuth !== 'function') {
        throw new Error(
          'Google giriş metodu bulunamadı. lib/supabase.js içindeki auth nesnesine signInWithOAuth fonksiyonunu eklemelisin.'
        )
      }

      const redirectTo = `${window.location.origin}/auth/callback`

      const result = await auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })

      if (result?.error) {
        throw result.error
      }
    } catch (err) {
      console.error('OAuth sign-in error:', err)
      setError(err?.message || 'Google ile giriş başlatılamadı.')
      setOauthLoading('')
    }
  }

  if (checkingUser) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-black flex items-center justify-center">
        <TextSkeleton />
      </div>
    )
  }

  if (!mounted || user) {
    return null
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-black text-white flex flex-col">
      {/* NOT: burada BİLEREK min-h-screen (100dvh) değil, sticky Navbar'ın
          yüksekliği düşülmüş bir değer kullanılıyor. Bu sayfa Navbar'ın
          ALTINDA normal akışta render oluyor (hideNavbarPaths'te değil,
          bkz. _app.js) — min-h-screen kullanılsaydı toplam yükseklik
          (navbar + 100dvh) oluyordu ve kart, ekranın çok altında/ortasında
          değil neredeyse ikinci "ekranın" ortasında kalıyordu; mobilde
          Navbar ile kart arasında büyük, boş bir siyah alan olarak
          görünüyordu. */}
      <Seo
        title="Giriş Yap veya Kayıt Ol"
        description="Lunosfer'e giriş yap ya da ücretsiz hesap oluştur; rüyalarını kaydet, yapay zekâ destekli Jung analizini gör ve küresel rüya haritasına katıl."
      />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">
                {isLogin
                  ? getTranslation('auth.title', lang) || 'Giriş Yap'
                  : getTranslation('auth.registerTitle', lang) || 'Kayıt Ol'}
              </h1>

              {!isLogin && <LanguageSwitcher />}
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 rounded bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <div className="space-y-3 mb-5">
              {OAUTH_PROVIDERS.map((provider) => (
                <button
                  key={provider.key}
                  type="button"
                  onClick={() => handleOAuth(provider.key)}
                  disabled={Boolean(oauthLoading) || loading}
                  className="w-full min-h-11 rounded-lg bg-white px-4 py-3 text-slate-900 font-semibold flex items-center justify-center gap-3 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <GoogleIcon />

                  {oauthLoading === provider.key
                    ? 'Google açılıyor...'
                    : provider.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-white/15" />
              <span className="text-xs text-white/45">veya</span>
              <div className="h-px flex-1 bg-white/15" />
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {!isLogin && (
                <div>
                  <label className="block text-sm text-white/70 mb-1">
                    {getTranslation('profile.username', lang) || 'Kullanıcı Adı'}
                  </label>

                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded px-3 py-2 bg-black/40 border border-white/10 outline-none focus:border-violet-400"
                    required
                    autoComplete="username"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-white/70 mb-1">
                  {getTranslation('auth.email', lang) || 'E-posta'}
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded px-3 py-2 bg-black/40 border border-white/10 outline-none focus:border-violet-400"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm text-white/70">
                    {getTranslation('auth.password', lang) || 'Şifre'}
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="text-xs text-brand-accent-300 hover:text-brand-accent-200"
                  >
                    {showPassword ? 'Gizle' : 'Göster'}
                  </button>
                </div>

                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded px-3 py-2 bg-black/40 border border-white/10 outline-none focus:border-violet-400"
                  required
                  minLength={6}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />

                {/* Şifresini unutan kullanıcının uygulamaya girmesinin hiçbir
                    yolu yoktu — ne web'de ne Android'de sıfırlama akışı vardı. */}
                {isLogin && (
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={resetLoading}
                      className="text-xs text-brand-accent-300 hover:text-brand-accent-200 disabled:opacity-50"
                    >
                      {resetLoading
                        ? (lang === 'tr' ? 'Gönderiliyor…' : 'Sending…')
                        : (lang === 'tr' ? 'Şifremi unuttum' : 'Forgot password?')}
                    </button>
                  </div>
                )}

                {resetNotice && (
                  <p className="mt-2 text-xs text-emerald-400">{resetNotice}</p>
                )}
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm text-white/70 mb-1">
                    {getTranslation('gender.label', lang) || 'Cinsiyet'}
                  </label>

                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded px-3 py-2 bg-black/40 border border-white/10 outline-none focus:border-violet-400"
                  >
                    <option value="">
                      {getTranslation('gender.select', lang) || 'Seçiniz'}
                    </option>
                    <option value="female">
                      {getTranslation('gender.female', lang) || 'Kadın'}
                    </option>
                    <option value="male">
                      {getTranslation('gender.male', lang) || 'Erkek'}
                    </option>
                    <option value="unspecified">
                      {getTranslation('gender.unspecified', lang) || 'Belirtmek istemiyorum'}
                    </option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || Boolean(oauthLoading)}
                className="w-full rounded bg-violet-600 py-2 text-white font-semibold transition hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? getTranslation('auth.loading', lang) || 'Yükleniyor...'
                  : isLogin
                    ? getTranslation('auth.login', lang) || 'Giriş Yap'
                    : getTranslation('auth.register', lang) || 'Kayıt Ol'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin((value) => !value)
                  setError('')
                }}
                disabled={loading || Boolean(oauthLoading)}
                className="text-sm text-brand-accent-300 hover:text-brand-accent-200 disabled:opacity-50"
              >
                {isLogin
                  ? getTranslation('auth.noAccount', lang) ||
                    'Hesabın yok mu? Kayıt ol'
                  : getTranslation('auth.hasAccount', lang) ||
                    'Zaten hesabın var mı? Giriş yap'}
              </button>
            </div>

            <div className="mt-5 text-center text-xs text-white/40">
              <Link href="/" className="hover:text-white/70">
                Ana sayfaya dön
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
