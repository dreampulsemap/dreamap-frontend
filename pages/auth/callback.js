import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

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

      router.replace('/profile')
    }

    completeAuth()
  }, [router])

  return null
}