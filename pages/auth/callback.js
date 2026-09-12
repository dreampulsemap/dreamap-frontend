import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { auth } from '../../lib/supabase'
import Seo from '../../components/Seo'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState('Google ile giriş tamamlanıyor...')

  useEffect(() => {
    if (!router.isReady) return

    let active = true

    async function completeAuth() {
      try {
        const currentUrl = new URL(window.location.href)
        const code = currentUrl.searchParams.get('code')

        if (!code) {
          router.replace('/auth?error=missing_code')
          return
        }

        const data = await auth.exchangeCodeForSession(code)
        const user = data?.user || (await auth.getUser())

        if (!user) {
          router.replace('/auth?error=oauth_user_not_found')
          return
        }

        // Google ile ilk kez giriş yapan kullanıcı için profil oluşturur.
        // Kayıt zaten varsa günceller; id alanı nedeniyle tekrar kayıt oluşmaz.
        await auth.ensureProfile(user)

        if (!active) return

        // OAuth başlatılırken ?next=/... verildiyse sadece site içi yollar
        // kabul edilir. Verilmediyse varsayılan sayfa /profile'dır.
        const next = currentUrl.searchParams.get('next')
        const destination =
          next && next.startsWith('/') && !next.startsWith('//')
            ? next
            : '/profile'

        router.replace(destination)
      } catch (error) {
        console.error('OAuth callback error:', error)

        if (!active) return

        setMessage(
          error?.message ||
            'Google ile giriş tamamlanamadı. Giriş sayfasına yönlendiriliyorsun...'
        )

        window.setTimeout(() => {
          router.replace('/auth?error=oauth_callback')
        }, 1800)
      }
    }

    completeAuth()

    return () => {
      active = false
    }
  }, [router, router.isReady])

  return (
    <>
      <Seo title="Giriş Yapılıyor…" noindex />

      <main className="min-h-screen bg-black flex items-center justify-center px-4 text-white">
        <p className="text-sm text-white/70">{message}</p>
      </main>
    </>
  )
}
