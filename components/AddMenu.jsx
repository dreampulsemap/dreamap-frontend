import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

// Data-driven menu items — easy to extend
const MENU_ITEMS = [
  {
    label: 'Add Dream',
    labelTr: 'Rüya Ekle',
    href: '/add-dream',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M12 9v6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9.2A7 7 0 0112 5a7 7 0 016.4 4.2" opacity="0.5" />
      </svg>
    ),
    gradient: 'from-fuchsia-500 to-purple-500',
    glow: 'shadow-[0_0_20px_rgba(217,70,239,0.3)]',
  },
  {
    label: 'Add Vision',
    labelTr: 'Vizyon Ekle',
    href: '/add-vision',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    gradient: 'from-cyan-500 to-blue-500',
    glow: 'shadow-[0_0_20px_rgba(34,211,238,0.3)]',
  },
  {
    label: 'Add Micro Goals',
    labelTr: 'Mikro Hedef Ekle',
    href: '/add-micro-goals',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2 2 4-4" />
      </svg>
    ),
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
  },
]

export default function AddMenu({ lang = 'en', position = 'mobile' }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

  const isMobile = position === 'mobile'
  const t = (en, tr) => (lang === 'tr' ? tr : en)

  // Close on Escape
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setOpen(false)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClickOutside(event) {
      if (
        menuRef.current && !menuRef.current.contains(event.target) &&
        buttonRef.current && !buttonRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open, isMobile])

  const closeMenu = () => setOpen(false)

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        aria-label={t('Add menu', 'Ekle menüsü')}
        aria-expanded={open}
        className={
          isMobile
            ? 'group relative -mt-6 p-2'
            : 'relative flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3.5 py-2 text-sm font-medium text-slate-300 hover:text-white hover:border-white/30 transition-all'
        }
      >
        {isMobile ? (
          <>
            <div className={`absolute inset-0 bg-gradient-to-tr from-fuchsia-500 to-cyan-500 rounded-full blur opacity-60 group-hover:opacity-100 transition-opacity ${open ? 'opacity-100' : 'animate-pulse'}`} />
            <div className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all shadow-xl ${
              open
                ? 'bg-slate-800 border-fuchsia-400/60 text-fuchsia-300'
                : 'bg-slate-900 border-white/20 text-white'
            }`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`w-6 h-6 transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{t('Add', 'Ekle')}</span>
          </>
        )}
      </button>

      {/* Backdrop (mobile only) */}
      {open && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in md:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Menu */}
      {open && (
        <div
          ref={menuRef}
          className={
            isMobile
              ? 'fixed bottom-24 left-0 right-0 z-50 mx-auto w-[calc(100%-2rem)] max-w-sm animate-slide-up md:hidden'
              : 'absolute right-0 top-full mt-2 z-50 w-56 animate-fade-in'
          }
        >
          <div className="rounded-2xl border border-white/10 bg-slate-950/90 backdrop-blur-2xl p-2 shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                {t('Create New', 'Yeni Oluştur')}
              </p>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {MENU_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-white/5"
                >
                  {/* Icon container */}
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} bg-opacity-10 border border-white/10 ${item.glow} transition-transform group-hover:scale-110`}>
                    <span className="text-white">{item.icon}</span>
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-fuchsia-300 group-hover:to-cyan-200 transition-all">
                      {t(item.label, item.labelTr)}
                    </p>
                  </div>

                  {/* Arrow */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* Tailwind-only slide-up animation */}
          <style jsx>{`
            @keyframes slide-up {
              from { transform: translateY(20px); opacity: 0; }
              to   { transform: translateY(0); opacity: 1; }
            }
            .animate-slide-up { animation: slide-up 0.25s ease-out; }

            @keyframes fade-in {
              from { opacity: 0; transform: translateY(-4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in { animation: fade-in 0.2s ease-out; }
          `}</style>
        </div>
      )}
    </>
  )
}
