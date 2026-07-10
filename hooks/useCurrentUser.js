import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { auth } from '../lib/supabase'

export default function useCurrentUser(redirectTo = null) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      try {
        const currentUser = await auth.getUser()

        if (!mounted) return

        if (!currentUser && redirectTo) {
          router.push(redirectTo)
          return
        }

        setUser(currentUser || null)
      } catch (error) {
        console.error('Kullanıcı yüklenemedi:', error)
        if (redirectTo) router.push(redirectTo)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadUser()

    return () => {
      mounted = false
    }
  }, [router, redirectTo])

  return { user, loading }
}