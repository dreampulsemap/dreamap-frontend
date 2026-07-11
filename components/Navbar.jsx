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

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

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
              width="38"
              height="38"
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
      </nav>

      {menuOpen && <button className="mobile-overlay" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}

      <aside className={`mobile-drawer ${menuOpen ? 'show' : ''}`} aria-hidden={!menuOpen}>
        <div className="drawer-header">
          <img
            src="/logo.png"
            alt="Lunosfer logo"
            className="drawer-logo"
            width="34"
            height="34"
          />
          <span className="drawer-title">Lunosfer</span>
        </div>

        <div className="drawer-links">
          <Link href="/" className={`drawer-link ${isActive('/') ? 'active' : ''}`}>
            Feed
          </Link>

          <Link href="/globe" className={`drawer-link ${isActive('/globe') ? 'active' : ''}`}>
            {getTranslation('nav.globe', lang) || 'Dream Map'}
          </Link>

          {user && (
            <Link
              href="/profile"
              className={`drawer-link ${isActive('/profile') ? 'active' : ''}`}
            >
              Profile
            </Link>
          )}

          <div className="drawer-lang">
            <LanguageSwitcher />
          </div>

          {user ? (
            <button type="button" className="drawer-link drawer-button" onClick={handleLogout}>
              Log Out
            </button>
          ) : (
            <Link href="/auth" className={`drawer-link ${isActive('/auth') ? 'active' : ''}`}>
              {getTranslation('nav.login', lang) || 'Login'}
            </Link>
          )}
        </div>
      </aside>

      <style jsx>{`
        .navbar-root {
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          background: rgba(5, 8, 22, 0.88);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .navbar-shell {
          width: min(100%, 1180px);
          margin: 0 auto;
          min-height: 64px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
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
          width: 38px;
          height: 38px;
          object-fit: contain;
          border-radius: 999px;
          flex-shrink: 0;
          display: block;
        }

        .brand-name {
          color: #edf1ff;
          font-size: 1.04rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .desktop-nav {
          display: none;
          align-items: center;
          gap: 8px;
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
        }

        .menu-toggle {
          width: 42px;
          height: 42px;
          border: 1px solid rgba(255, 255, 255, 0.12);
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
          background: #eef2ff;
          transition: transform 0.22s ease, opacity 0.22s ease;
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

        .mobile-overlay {
          position: fixed;
          inset: 0;
          z-index: 109;
          background: rgba(2, 6, 18, 0.56);
          border: 0;
          padding: 0;
          margin: 0;
        }

        .mobile-drawer {
          position: fixed;
          top: 0;
          right: 0;
          z-index: 110;
          width: min(82vw, 320px);
          height: 100dvh;
          padding: 18px 14px 20px;
          background: linear-gradient(180deg, rgba(8, 12, 28, 0.98), rgba(12, 14, 30, 0.98));
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: -20px 0 60px rgba(0, 0, 0, 0.45);
          transform: translateX(100%);
          transition: transform 0.25s ease;
          overflow-y: auto;
        }

        .mobile-drawer.show {
          transform: translateX(0);
        }

        .drawer-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 4px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .drawer-logo {
          width: 34px;
          height: 34px;
          object-fit: contain;
          border-radius: 999px;
          display: block;
          flex-shrink: 0;
        }

        .drawer-title {
          color: #edf1ff;
          font-size: 1rem;
          font-weight: 700;
        }

        .drawer-links {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-top: 16px;
        }

        .drawer-link,
        .drawer-button {
          width: 100%;
          min-height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: #dce4ff;
          text-decoration: none;
          font-size: 0.95rem;
          transition: 0.2s ease;
        }

        .drawer-link.active,
        .drawer-link:hover,
        .drawer-button:hover {
          background: rgba(99, 102, 241, 0.14);
          border-color: rgba(129, 140, 248, 0.35);
        }

        .drawer-button {
          cursor: pointer;
        }

        .drawer-lang {
          display: flex;
          justify-content: center;
          padding: 2px 0;
        }

        @media (min-width: 900px) {
          .desktop-nav {
            display: inline-flex;
          }

          .menu-toggle,
          .mobile-overlay,
          .mobile-drawer {
            display: none;
          }
        }

        @media (max-width: 899px) {
          .brand-name {
            font-size: 1rem;
          }
        }

        @media (max-width: 420px) {
          .navbar-shell {
            min-height: 60px;
            padding: 10px 12px;
          }

          .brand-logo {
            width: 36px;
            height: 36px;
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