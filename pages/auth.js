import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import { auth } from '../lib/supabase'
import { getTranslation } from '../lib/translations'
import LanguageSwitcher from '../components/LanguageSwitcher'
import TextSkeleton from '../components/TextSkeleton'
import Seo from '../components/Seo'

const OAUTH_PROVIDERS = [
  { key: 'google', label: 'Google ile devam et', icon: 'G' },
  { key: 'github', label: 'GitHub ile devam et', icon: '⌘' },
]

export default function AuthPage() {
  const router = useRouter()
  const { i18n } = useTranslation()

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const lang = mounted ? (i18n.language || 'en') : 'en'

  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [gender, setGender] = useState('') // YENİ: kayıt sırasında cinsiyet
  const [showPassword, setShowPassword] = useState(false)

  const [user, setUser] = useState(null)
  const [checkingUser, setCheckingUser] = useState(true)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (router.query?.ref && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('pending_referral_code', String(router.query.ref))
      } catch (_) {}
    }
  }, [router.query])

  useEffect(() => {
    let mounted = true
    const loadUser = async () => {
      try {
        const currentUser = await auth.getUser()
        if (!mounted) return
        setUser(currentUser || null)
      } catch (err) {
        console.error('Error checking user:', err)
      } finally {
        if (mounted) setCheckingUser(false)
      }
    }
    loadUser()
    const { data } = auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      setUser(session?.user || null)
    })
    return () => {
      mounted = false
      data?.subscription?.unsubscribe()
    }
  }, [])

  // YENİ: giriş / kayıt gönderim mantığı
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

      // Kayıt: auth.signUp(email, password, username) mevcut yardımcı, ensureProfile()'ı
      // otomatik çağırıp email/username/display_name/avatar_url'i yazıyor — ama
      // language/gender'ı desteklemiyor. Bu yüzden kayıttan hemen sonra
      // /api/update-profile ile bu iki alanı ayrıca yazıyoruz.
      const data = await auth.signUp(email, password, username)

      const newUserId = data?.user?.id
      if (newUserId) {
        await fetch('/api/update-profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
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
        setError(getTranslation('auth.success', lang) || 'Kayıt başarılı! Lütfen e-postanı kontrol et.')
      }
    } catch (err) {
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  if (checkingUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <TextSkeleton />
      </div>
    )
  }

  if (user) {
    router.replace('/profile')
    return null
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Seo
        title="Giriş Yap veya Kayıt Ol"
        description="Lunosfer'e giriş yap ya da ücretsiz hesap oluştur; rüyalarını kaydet, yapay zekâ destekli Jung analizini gör ve küresel rüya haritasına katıl."
      />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">{isLogin ? (getTranslation('auth.title', lang) || 'Giriş Yap') : (getTranslation('auth.registerTitle', lang) || 'Kayıt Ol')}</h1>
              {/* YENİ: Dil seçimi sadece kayıt formunda */}
              {!isLogin && <LanguageSwitcher />}
            </div>

            {error && (
              <div className="mb-4 rounded bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {!isLogin && (
                <div>
                  <label className="block text-sm text-white/70 mb-1">{getTranslation('profile.username', lang) || 'Kullanıcı Adı'}</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded px-3 py-2 bg-black/40" required />
                </div>
              )}

              <div>
                <label className="block text-sm text-white/70 mb-1">{getTranslation('auth.email', lang) || 'E-posta'}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded px-3 py-2 bg-black/40" required />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">{getTranslation('auth.password', lang) || 'Şifre'}</label>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded px-3 py-2 bg-black/40" required minLength={6} />
              </div>

              {/* YENİ: Cinsiyet seçimi sadece kayıt formunda */}
              {!isLogin && (
                <div>
                  <label className="block text-sm text-white/70 mb-1">{getTranslation('gender.label', lang)}</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full rounded px-3 py-2 bg-black/40">
                    <option value="">{getTranslation('gender.select', lang)}</option>
                    <option value="female">{getTranslation('gender.female', lang)}</option>
                    <option value="male">{getTranslation('gender.male', lang)}</option>
                    <option value="unspecified">{getTranslation('gender.unspecified', lang)}</option>
                  </select>
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full rounded bg-violet-600 py-2 text-white font-semibold disabled:opacity-50">
                {loading
                  ? (getTranslation('auth.loading', lang) || 'Yükleniyor...')
                  : isLogin
                    ? (getTranslation('auth.login', lang) || 'Giriş Yap')
                    : (getTranslation('auth.register', lang) || 'Kayıt Ol')}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-brand-accent-300">{isLogin ? (getTranslation('auth.noAccount', lang) || 'Hesabın yok mu? Kayıt ol') : (getTranslation('auth.hasAccount', lang) || 'Zaten hesabın var mı? Giriş yap')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
