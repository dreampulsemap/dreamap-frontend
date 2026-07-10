import { useEffect, useState } from 'react'
import Link from 'next/link'
import { auth } from '../lib/supabase'
import LanguageSwitcher from './LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '../lib/translations'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const { i18n } = useTranslation()
  const lang = i18n.language || 'en'

  useEffect(() => {
    let mounted = true

    async function checkUser() {
      try {
        if (auth && typeof auth.getUser === 'function') {
          const currentUser = await auth.getUser()
          if (mounted) setUser(currentUser || null)
        }
      } catch (error) {
        console.error('Navbar user check error:', error)
      }
    }

    checkUser()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <nav className="w-full bg-white shadow-sm border-b">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-indigo-700">
          LUVERSE
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/globe" className="text-gray-700 hover:text-indigo-600">
            🌍 {getTranslation('nav.globe', lang) || 'Rüya Haritası'}
          </Link>

          {user ? (
            <Link
              href="/profile"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              ✨ {getTranslation('nav.profile', lang) || 'Profilim'}
            </Link>
          ) : (
            <Link
              href="/auth"
              className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-black"
            >
              {getTranslation('nav.login', lang) || 'Giriş Yap'}
            </Link>
          )}

          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  )
}