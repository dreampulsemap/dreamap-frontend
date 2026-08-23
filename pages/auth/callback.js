import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import Seo from '../../components/Seo'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    async function completeAuth() {
      const currentUrl = new URL(window.location.href)
      const code = currentUrl.searchParams.get('code')

      if (!code) {
        router.replace('/auth?error=missing_code')
        return
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        router.replace('/auth?error=oauth_callback')
        return
      }

      // İsteğe bağlı: signInWithOAuth çağrısına redirectTo ile bir "?next=…"
      // eklenmişse (ör. delete-account.js OAuth-only kullanıcıları giriş
      // sonrası kendi sayfasına geri döndürmek için kullanıyor), oraya git.
      // Verilmemişse eski davranış aynen korunuyor: /profile.
      const next = currentUrl.searchParams.get('next')
      router.replace(next && next.startsWith('/') ? next : '/profile')
    }

    completeAuth()
  }, [router])

  return <Seo title="Giriş Yapılıyor…" noindex />
}