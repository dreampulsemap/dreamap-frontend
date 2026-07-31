import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import { auth } from '../lib/supabase'

export default function useCurrentUser(redirectTo = null) {
  const router = useRouter()
  const { i18n } = useTranslation()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null) // YENİ
  const [loading, setLoading] = useState(true)
  const langSyncedRef = useRef(false)

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

        // YENİ: profildeki dil/cinsiyet tercihini çek ve dili senkronize et
        if (currentUser?.id) {
          const fetchedProfile = await auth.getProfile(currentUser.id)
          if (!mounted) return
          setProfile(fetchedProfile || null)

          if (!langSyncedRef.current && fetchedProfile?.language) {
            langSyncedRef.current = true
            if (fetchedProfile.language !== i18n.language) {
              i18n.changeLanguage(fetchedProfile.language)
            }
          }
        }
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
  }, [router, redirectTo, i18n])

  return { user, profile, loading }
}
