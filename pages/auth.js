import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import { auth } from '../lib/supabase'
import { getTranslation } from '../lib/translations'
import LanguageSwitcher from '../components/LanguageSwitcher'

const OAUTH_PROVIDERS = [
  { key: 'google', label: 'Google ile devam et', icon: 'G' },
  { key: 'github', label: 'GitHub ile devam et', icon: '⌘' },
]

export default function AuthPage() {
  const router = useRouter()
  const { i18n } = useTranslation()
  const lang = i18n.language || 'en'

  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [user, setUser] = useState(null)
  const [checkingUser, setCheckingUser] = useState(true)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const loadUser = async () => {
      try {
        const currentUser = await auth.getUser()
        if (!mounted) return
        setUser(currentUser || null)
      } catch (err) {
        console.error('Kullanıcı durumu kontrol edilemedi:', err)
      } finally {
        if (mounted) setCheckingUser(false)
      }
    }

    loadUser()

    const { data } = auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        setUser(null)
        return
      }

      setUser(session?.user || null)
    })

    return () => {
      mounted = false
      data?.subscription?.unsubscribe()
    }
  }, [])

  function resetForm() {
    setEmail('')
    setPassword('')
    setUsername('')
    setShowPassword(false)
    setError('')
  }

  function handleModeChange(nextIsLogin) {
    setIsLogin(nextIsLogin)
    setError('')
    setShowPassword(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading || oauthLoading) return

    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        await auth.signIn(email, password)
        router.push('/profile')
      } else {
        await auth.signUp(email, password, username)
        alert(
          getTranslation('auth.success', lang) ||
            'Kayıt başarılı! E-postanızı kontrol edin.'
        )
        setIsLogin(true)
        resetForm()
      }
    } catch (err) {
      setError(err?.message || 'Bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuth(provider) {
    if (loading || oauthLoading) return

    setError('')
    setOauthLoading(provider)

    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : undefined

      await auth.signInWithOAuth(provider, redirectTo)
    } catch (err) {
      setError(err?.message || 'Sosyal giriş başlatılamadı.')
      setOauthLoading('')
    }
  }

  async function handleLogout() {
    try {
      await auth.signOut()
      setUser(null)
      router.push('/')
    } catch (err) {
      setError(err?.message || 'Çıkış yapılırken bir hata oluştu.')
    }
  }

  const pageTitle = isLogin
    ? getTranslation('auth.title', lang) || 'Giriş Yap'
    : getTranslation('auth.registerTitle', lang) || 'Kayıt Ol'

  const submitLabel = loading
    ? getTranslation('auth.loading', lang) || 'Yükleniyor...'
    : isLogin
    ? getTranslation('auth.login', lang) || 'Giriş Yap'
    : getTranslation('auth.register', lang) || 'Kayıt Ol'

  if (checkingUser) {
    return (
      <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center px-4">
        <div className="glass-card px-6 py-4 text-sm text-white/70">
          {getTranslation('auth.loading', lang) || 'Yükleniyor...'}
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen bg-[#050816] text-white overflow-x-hidden">
        <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-[#050816]/90">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
            <Link href="/" className="group flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 px-2 py-1.5 sm:px-3 sm:py-2 shadow-[0_0_30px_rgba(56,189,248,0.06)] shrink-0">
                <Image
                  src="/logo.png"
                  alt="Lunosfer"
                  width={132}
                  height={40}
                  priority
                  className="h-6 w-auto object-contain sm:h-8 md:h-10"
                />
              </div>

              <div className="min-w-0 flex flex-col leading-none">
                <span className="truncate text-[0.78rem] sm:text-[1.05rem] md:text-[1.3rem] font-black tracking-[0.14em] sm:tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-cyan-200 to-violet-300">
                  LUNOSFER
                </span>
                <span className="mt-0.5 hidden md:block text-[9px] uppercase tracking-[0.28em] text-cyan-200/50 truncate">
                  Dream Nexus
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-2 shrink-0">
              <LanguageSwitcher />
              <Link
                href="/"
                className="glass-card px-3 sm:px-4 py-2 text-sm text-white/80 hover:text-white whitespace-nowrap"
              >
                {getTranslation('nav.backToHome', lang) || 'Ana Sayfa'}
              </Link>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-76px)] flex items-center justify-center px-4 py-8">
          <div className="glass-card w-full max-w-md p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-6">
              {getTranslation('auth.profile', lang) || 'Profil'}
            </h1>

            <div className="space-y-3 text-sm sm:text-base">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-white/45 text-xs uppercase tracking-[0.18em] mb-1">
                  Email
                </div>
                <div className="text-white/90 break-all">{user.email}</div>
              </div>

              {(user.user_metadata?.username || user.user_metadata?.name) && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="text-white/45 text-xs uppercase tracking-[0.18em] mb-1">
                    {getTranslation('auth.username', lang) || 'Kullanıcı Adı'}
                  </div>
                  <div className="text-white/90 break-all">
                    {user.user_metadata?.username || user.user_metadata?.name}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => router.push('/profile')}
                className="flex-1 glass-card px-5 py-3 text-sm sm:text-base text-white/90 hover:bg-purple-500/20"
              >
                {getTranslation('nav.profile', lang) || 'Profilim'}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 glass-card px-5 py-3 text-sm sm:text-base text-red-300 hover:bg-red-500/20"
              >
                {getTranslation('auth.logout', lang) || 'Çıkış Yap'}
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-[#050816]/90">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <Link href="/" className="group flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 px-2 py-1.5 sm:px-3 sm:py-2 shadow-[0_0_30px_rgba(56,189,248,0.06)] shrink-0">
              <Image
                src="/logo.png"
                alt="Lunosfer"
                width={132}
                height={40}
                priority
                className="h-6 w-auto object-contain sm:h-8 md:h-10"
              />
            </div>

            <div className="min-w-0 flex flex-col leading-none">
              <span className="truncate text-[0.78rem] sm:text-[1.05rem] md:text-[1.3rem] font-black tracking-[0.14em] sm:tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-cyan-200 to-violet-300">
                LUNOSFER
              </span>
              <span className="mt-0.5 hidden md:block text-[9px] uppercase tracking-[0.28em] text-cyan-200/50 truncate">
                Dream Nexus
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher />
            <Link
              href="/"
              className="glass-card px-3 sm:px-4 py-2 text-sm text-white/80 hover:text-white whitespace-nowrap"
            >
              {getTranslation('nav.backToHome', lang) || 'Ana Sayfa'}
            </Link>
          </div>
        </div>
      </header>

      <main className="min-h-[calc(100vh-76px)] flex items-center justify-center px-4 py-8">
        <div className="relative w-full max-w-md">
          <div className="absolute -inset-0.5 rounded-[28px] bg-gradient-to-r from-fuchsia-500/20 via-cyan-500/20 to-violet-500/20 blur-xl pointer-events-none" />

          <div className="relative glass-card p-6 sm:p-8">
            <div className="mb-6 sm:mb-8 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-cyan-200/70 mb-4">
                <span>✦</span>
                <span>Lunosfer</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold gradient-text">
                {pageTitle}
              </h1>

              <p className="mt-3 text-sm sm:text-base text-white/60 max-w-sm mx-auto">
                {isLogin
                  ? getTranslation('auth.subtitle', lang) ||
                    'Rüyalarına, analizlerine ve profil alanına giriş yap.'
                  : getTranslation('auth.registerSubtitle', lang) ||
                    'Lunosfer hesabını oluştur ve rüya evrenine katıl.'}
              </p>
            </div>

            <div className="space-y-3 mb-5">
              {OAUTH_PROVIDERS.map((provider) => (
                <button
                  key={provider.key}
                  type="button"
                  onClick={() => handleOAuth(provider.key)}
                  disabled={Boolean(oauthLoading)}
                  className="w-full rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm sm:text-base text-white transition-all hover:bg-white/[0.08] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-sm font-bold">
                    {provider.icon}
                  </span>

                  <span>
                    {oauthLoading === provider.key ? 'Yönlendiriliyor...' : provider.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative my-5">
              <div className="border-t border-white/10" />
              <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-[#0b1020] px-3 text-xs uppercase tracking-[0.18em] text-white/35">
                veya
              </span>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={() => handleModeChange(true)}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  isLogin
                    ? 'bg-white text-slate-900 shadow-[0_8px_30px_rgba(255,255,255,0.12)]'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                {getTranslation('auth.login', lang) || 'Giriş Yap'}
              </button>

              <button
                type="button"
                onClick={() => handleModeChange(false)}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  !isLogin
                    ? 'bg-white text-slate-900 shadow-[0_8px_30px_rgba(255,255,255,0.12)]'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                {getTranslation('auth.register', lang) || 'Kayıt Ol'}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="mb-2 block text-sm text-white/65">
                    {getTranslation('auth.username', lang) || 'Kullanıcı Adı'}
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40 focus:bg-black/40"
                    placeholder="dreamer"
                    required={!isLogin}
                    autoComplete="username"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-white/65">
                  {getTranslation('auth.email', lang) || 'E-posta'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40 focus:bg-black/40"
                  placeholder="ornek@email.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/65">
                  {getTranslation('auth.password', lang) || 'Şifre'}
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 pr-12 text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40 focus:bg-black/40"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-white/45 hover:text-white/80"
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || Boolean(oauthLoading)}
                className="w-full rounded-2xl border border-violet-300/20 bg-violet-500/15 px-6 py-3.5 text-sm sm:text-base font-semibold text-white transition-all hover:border-violet-300/40 hover:bg-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitLabel}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => handleModeChange(!isLogin)}
                className="text-sm text-purple-300 hover:text-purple-200 transition-colors"
              >
                {isLogin
                  ? getTranslation('auth.noAccount', lang) || 'Hesabın yok mu? Kayıt ol'
                  : getTranslation('auth.hasAccount', lang) || 'Zaten hesabın var mı? Giriş yap'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}