import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { auth } from '../lib/supabase' // Bu dosyanın 'supabase.auth' veya 'supabase' nesnesini export ettiğinden emin ol
import { useTranslation } from 'react-i18next'
import { getTranslation } from '../lib/translations'

export default function AuthPage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)

  const lang = i18n.language || 'en'

  useEffect(() => {
    async function checkUser() {
      // Supabase v2'de getUser() { data: { user }, error } formatında döner
      const { data: { user: currentUser }, error } = await auth.getUser()
      if (currentUser && !error) {
        setUser(currentUser)
      }
    }
    checkUser()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isLogin) {
        // Supabase v2 Giriş Metodu
        const { data, error: signInError } = await auth.signInWithPassword({
          email,
          password,
        })
        
        if (signInError) throw signInError
        
        router.push('/profile')
      } else {
        // Supabase v2 Kayıt Metodu + MetaData (Username ekleme)
        const { data, error: signUpError } = await auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username, // Kullanıcı adı metadata'ya yazılır
            }
          }
        })

        if (signUpError) throw signUpError

        alert(getTranslation('auth.success', lang) || 'Kayıt başarılı! Lütfen e-postanızı kontrol edin.')
        setIsLogin(true)
      }
    } catch (err) {
      setError(err.message || 'Bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    const { error } = await auth.signOut()
    if (!error) {
      setUser(null)
      router.push('/')
    } else {
      setError(error.message)
    }
  }

  if (user) {
    return (
      <div className="min-h-screen bg-black">
        {/* Header */}
        <header className="sticky top-0 z-50 glass-card border-b border-white/10" style={{ borderRadius: 0 }}>
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-all">
                <span className="text-3xl">🌙</span>
                <span className="text-xl font-bold gradient-text">Dreamap</span>
              </a>
            </div>
            <a href="/" className="glass-card px-4 py-2 text-white/80 hover:text-white transition-all flex items-center gap-2">
              <span>←</span>
              <span>{getTranslation('nav.backToHome', lang) || 'Ana Sayfa'}</span>
            </a>
          </div>
        </header>

        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
          <div className="glass-card p-8 max-w-md w-full">
            <h1 className="text-2xl font-bold gradient-text mb-6">
              {getTranslation('auth.profile', lang) || 'Profil'}
            </h1>
            <p className="text-white/80 mb-2">Email: {user.email}</p>
            {/* Kullanıcı adını metadata üzerinden ekranda göstermek istersen: */}
            {user.user_metadata?.username && (
              <p className="text-white/60 mb-4">Kullanıcı Adı: {user.user_metadata.username}</p>
            )}
            <button
              onClick={handleLogout}
              className="w-full glass-card px-6 py-3 text-white hover:bg-red-500/20 transition-all"
            >
              {getTranslation('auth.logout', lang) || 'Çıkış Yap'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10">
        <a href="/" className="inline-flex items-center gap-2 glass-card px-4 py-2 hover:bg-white/10 transition-all">
          <span>←</span>
          <span className="text-white/80">{getTranslation('nav.backToHome', lang) || 'Ana Sayfa'}</span>
        </a>
      </div>

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold gradient-text mb-8 text-center">
            {isLogin ? getTranslation('auth.title', lang) : getTranslation('auth.registerTitle', lang)}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-sm text-white/60 block mb-2">
                  {getTranslation('auth.username', lang) || 'Kullanıcı Adı'}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="username"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="text-sm text-white/60 block mb-2">
                {getTranslation('auth.email', lang) || 'E-posta'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                placeholder="ornek@email.com"
                required
              />
            </div>

            <div>
              <label className="text-sm text-white/60 block mb-2">
                {getTranslation('auth.password', lang) || 'Şifre'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full glass-card px-6 py-3 text-white font-semibold hover:bg-purple-500/20 transition-all disabled:opacity-50"
            >
              {loading ? (getTranslation('auth.loading', lang) || 'Yükleniyor...') : 
                isLogin ? (getTranslation('auth.login', lang) || 'Giriş Yap') : (getTranslation('auth.register', lang) || 'Kayıt Ol')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-purple-400 hover:text-purple-300 text-sm"
            >
              {isLogin ? (getTranslation('auth.noAccount', lang) || 'Hesabınız yok mu? Kaydolun') : (getTranslation('auth.hasAccount', lang) || 'Zaten hesabınız var mı? Giriş yapın')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
                                    }
