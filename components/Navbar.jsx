import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { auth } from '../lib/supabase'
import LanguageSwitcher from './LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '../lib/translations'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const { i18n } = useTranslation()
  const lang = i18n.language || 'en'
  const router = useRouter()

  useEffect(() => {
    async function checkUser() {
      try {
        if (auth && typeof auth.getUser === 'function') {
          const currentUser = await auth.getUser()
          setUser(currentUser)
        }
      } catch (err) {
        console.error('Navbar user check error:', err)
      }
    }

    checkUser()
  }, [])

  async function handleLogout() {
    try {
      await auth.signOut()
      setUser(null)
      router.push('/')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const isActive = (path) => router.pathname === path

  return (
    <>
      <nav className="navbar-root">
        <div className="navbar-inner">
          <Link href="/" className="navbar-brand" aria-label="Lunosfer ana sayfa">
            <div className="navbar-brand-icon">
              <div className="navbar-brand-moon" />
            </div>

            <div className="navbar-brand-text">
              <div className="navbar-brand-title">Dreamap</div>
              <div className="navbar-brand-subtitle">LUNOSFER</div>
            </div>
          </Link>

          <div className="navbar-actions">
            <Link href="/" className={`nav-pill ${isActive('/') ? 'active' : ''}`}>
              Feed
            </Link>

            <Link href="/globe" className={`nav-pill ${isActive('/globe') ? 'active' : ''}`}>
              Dream Map
            </Link>

            <div className="nav-lang">
              <LanguageSwitcher />
            </div>

            {user ? (
              <>
                <Link
                  href="/profile"
                  className={`nav-pill ${isActive('/profile') ? 'active' : ''}`}
                >
                  Profile
                </Link>

                <button type="button" className="nav-pill nav-logout" onClick={handleLogout}>
                  Log Out
                </button>
              </>
            ) : (
              <Link href="/auth" className={`nav-pill ${isActive('/auth') ? 'active' : ''}`}>
                {getTranslation('nav.login', lang) || 'Login'}
              </Link>
            )}
          </div>
        </div>
      </nav>

      <style jsx>{`
        .navbar-root {
          position: sticky;
          top: 0;
          z-index: 50;
          width: 100%;
          max-width: 100vw;
          overflow-x: clip;
          backdrop-filter: blur(16px);
          background: rgba(6, 10, 26, 0.86);
          border-bottom: 1px solid rgba(139, 92, 246, 0.14);
        }

        .navbar-inner {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .navbar-brand {
          min-width: 0;
          flex: 1 1 auto;
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .navbar-brand-icon {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: radial-gradient(circle at 30% 30%, rgba(250, 204, 21, 0.95), rgba(245, 158, 11, 0.7) 35%, rgba(59, 130, 246, 0.08) 70%, transparent 72%);
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.22);
          flex-shrink: 0;
        }

        .navbar-brand-moon {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          box-shadow: -6px 0 0 2px #0b1026;
          background: transparent;
        }

        .navbar-brand-text {
          min-width: 0;
          overflow: hidden;
        }

        .navbar-brand-title {
          color: #dbe4ff;
          font-size: 26px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.02em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .navbar-brand-subtitle {
          margin-top: 2px;
          color: rgba(180, 193, 255, 0.72);
          font-size: 9px;
          letter-spacing: 0.28em;
          line-height: 1;
          white-space: nowrap;
        }

        .navbar-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
          flex: 0 1 auto;
          max-width: 100%;
        }

        .nav-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: #dbe4ff;
          text-decoration: none;
          font-size: 13px;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .nav-pill:hover,
        .nav-pill.active {
          background: rgba(139, 92, 246, 0.14);
          border-color: rgba(139, 92, 246, 0.32);
        }

        .nav-logout {
          cursor: pointer;
        }

        .nav-lang {
          display: inline-flex;
          align-items: center;
        }

        @media (max-width: 640px) {
          .navbar-inner {
            padding: 10px 10px 12px;
            gap: 10px;
          }

          .navbar-brand {
            flex: 1 1 100%;
          }

          .navbar-brand-title {
            font-size: 24px;
            margin-left: 2px;
          }

          .navbar-brand-subtitle {
            font-size: 8px;
            letter-spacing: 0.24em;
          }

          .navbar-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .nav-pill {
            min-height: 36px;
            padding: 8px 10px;
            font-size: 12px;
          }
        }
      `}</style>
    </>
  )
}
