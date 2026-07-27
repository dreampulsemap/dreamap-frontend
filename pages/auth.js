import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import { auth } from '../lib/supabase'
import { getTranslation } from '../lib/translations'
import LanguageSwitcher from '../components/LanguageSwitcher'
import TextSkeleton from '../components/TextSkeleton'

const OAUTH_PROVIDERS = [
  { key: 'google', label: 'Google ile devam et', icon: 'G' },
  { key: 'github', label: 'GitHub ile devam et', icon: '⌘' },
]

export default function AuthPage() {
  const router = useRouter()
  const { i18n } = useTranslation()

  // FIX: Mounted gate to prevent hydration flash
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const lang = mounted ? (i18n.language || 'en') : 'en'

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
    if (router.query?.ref && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('pending_referral_code', String(router.query.ref))
      } catch (_) {}
    }
  }, [router.query])

  // FIX: Use cleanup flag to prevent state updates on unmounted component
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

  // Rest of component...
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

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Auth form content... */}
        </div>
      </div>
    </div>
  )
}

function Navbar() {
  return (
    <nav className="border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="font-serif text-2xl font-bold">Lunosfer</div>
        <LanguageSwitcher />
      </div>
    </nav>
  )
}
