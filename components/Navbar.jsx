import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { auth } from '../lib/supabase'
import LanguageSwitcher from './LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '../lib/translations'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
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

  useEffect(() => {
    setMenuOpen(false)
  }, [router.pathname])

  async function handleLogout() {
    try {
      await auth.signOut()
      setUser(null)
      setMenuOpen(false)
      router.push('/')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const isActive = (path) => router.pathname === path

  return (
    <>
      <nav className="navbar-root">
        <div className="navbar-shell">
          <Link href="/" className="brand" aria-label="Lunosfer home">
            <img
              src="/logo.png"
              alt="Lunosfer logo"
              className="brand-logo"
              width="40"
              height="40"
            />
            <span className="brand-name">Lunosfer</span>
          </Link>

          <div className="desktop-nav">
            <Link href="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
              Feed
            </Link>

            <Link href="/globe" className={`nav-link ${isActive('/globe') ? 'active' : ''}`}>
              {getTranslation('nav.globe', lang) || 'Dream Map'}
            </Link>

            {user && (
              <Link
                href="/profile"
                className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
              >
                Profile
              </Link>
            )}

            <div className="lang-wrap">
              <LanguageSwitcher />
            </div>

            {user ? (
              <button type="button" className="nav-link logout-btn" onClick={handleLogout}>
                Log Out
              </button>
            ) : (
              <Link href="/auth" className={`nav-link ${isActive('/auth') ? 'active' : ''}`}>
                {getTranslation('nav.login', lang) || 'Login'}
              </Link>
            )}
          </div>

          <button
            type="button"
            className={`menu-toggle ${menuOpen ? 'open' : ''}`}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <div className={`mobile-panel ${menuOpen ? 'show' : ''}`}>
          <Link href="/" className={`mobile-link ${isActive('/') ? 'active' : ''}`}>
            Feed
          </Link>

          <Link href="/globe" className={`mobile-link ${isActive('/globe') ? 'active' : ''}`}>
            {getTranslation('nav.globe', lang) || 'Dream Map'}
          </Link>

          {user && (
            <Link
              href="/profile"
              className={`mobile-link ${isActive('/profile') ? 'active' : ''}`}
            >
              Profile
            </Link>
          )}

          <div className="mobile-lang">
            <LanguageSwitcher />
          </div>

          {user ? (
            <button type="button" className="mobile-link mobile-logout" onClick={handleLogout}>
              Log Out
            </button>
          ) : (
            <Link href="/auth" className={`mobile-link ${isActive('/auth') ? 'active' : ''}`}>
              {getTranslation('nav.login', lang) || 'Login'}
            </Link>
          )}
        </div>
      </nav>

      <style jsx>{`
        .navbar-root {
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          max-width: 100vw;
          overflow-x: clip;
          background: rgba(5, 8, 22, 0.9);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .navbar-shell {
          width: min(100%, 1180px);
          margin: 0 auto;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-width: 0;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          text-decoration: none;
          flex: 1 1 auto;
        }

        .brand-logo {
          width: 40px;
          height: 40px;
          object-fit: contain;
          border-radius: 999px;
          flex-shrink: 0;
          display: block;
        }

        .brand-name {
          color: #e8ecff;
          font-size: 1.1rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .desktop-nav {
          display: none;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          min-width: 0;
          flex: 0 1 auto;
        }

        .nav-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 9px 14px;
          border-radius: 999px;
          text-decoration: none;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: #dce4ff;
          font-size: 0.92rem;
          line-height: 1;
          white-space: nowrap;
          transition: 0.2s ease;
        }

        .nav-link:hover,
        .nav-link.active {
          background: rgba(99, 102, 241, 0.14);
          border-color: rgba(129, 140, 248, 0.35);
        }

        .logout-btn {
          cursor: pointer;
        }

        .lang-wrap {
          display: inline-flex;
          align-items: center;
          max-width: 100%;
        }

        .menu-toggle {
          width: 42px;
          height: 42px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.04);
          display: inline-flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
          cursor: pointer;
        }

        .menu-toggle span {
          display: block;
          width: 18px;
          height: 2px;
          border-radius: 999px;
          background: #e8ecff;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }

        .menu-toggle.open span:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }

        .menu-toggle.open span:nth-child(2) {
          opacity: 0;
        }

        .menu-toggle.open span:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }

        .mobile-panel {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.25s ease;
          overflow: hidden;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .mobile-panel.show {
          grid-template-rows: 1fr;
        }

        .mobile-panel :global(*) {
          min-width: 0;
        }

        .mobile-panel.show > :global(*) {
          overflow: visible;
        }

        .mobile-panel > * {
          overflow: hidden;
        }

        .mobile-panel.show {
          padding: 0 14px 14px;
        }

        .mobile-link,
        .mobile-logout {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          margin-top: 10px;
          padding: 11px 14px;
          border-radius: 14px;
          text-decoration: none;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: #dce4ff;
          font-size: 0.95rem;
        }

        .mobile-link.active {
          background: rgba(99, 102, 241, 0.14);
          border-color: rgba(129, 140, 248, 0.35);
        }

        .mobile-logout {
          cursor: pointer;
        }

        .mobile-lang {
          margin-top: 10px;
          display: flex;
          justify-content: center;
        }

        @media (min-width: 900px) {
          .desktop-nav {
            display: inline-flex;
          }

          .menu-toggle {
            display: none;
          }

          .mobile-panel {
            display: none;
          }
        }

        @media (max-width: 899px) {
          .brand-name {
            font-size: 1rem;
          }
        }

        @media (max-width: 480px) {
          .navbar-shell {
            padding: 10px 12px;
          }

          .brand-logo {
            width: 36px;
            height: 36px;
          }

          .brand-name {
            font-size: 0.98rem;
          }

          .menu-toggle {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </>
  )
}