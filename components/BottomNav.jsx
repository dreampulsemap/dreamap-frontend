import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { Moon, Target, X, MessageCircle, Plus, Home, Compass } from 'lucide-react'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'

export default function BottomNav() {
  const router = useRouter()
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const { unreadCount: unreadMessages } = useUnreadMessages()
  // Kullanıcı zaten Mesajlar ekranındayken rozeti gösterme — "okunmamış"
  // sayacı, o an baktığın ekran için gösterilirse bayat/yanlış hissettirir
  // ve rozete olan güveni zedeler.
  const showMessageBadge = unreadMessages > 0 && router.pathname !== '/messages'

  // Not: Profil/avatar buradan kaldırıldı — artık üst navbar'da (Navbar.jsx,
  // sağ üstte). Bu yüzden burada kullanıcı oturumunu ayrıca izlemeye gerek yok.

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setCreateMenuOpen(false)
    }
    if (createMenuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [createMenuOpen])

  const isActive = (path) => router.pathname === path

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-void-950/90 backdrop-blur-2xl px-6 py-2.5 pb-safe"
      aria-label="Ana gezinme"
    >
      <div className="flex items-center justify-between max-w-md mx-auto">

        {/* 1. ANA SAYFA */}
        <Link
          href="/"
          aria-label="Ana Sayfa"
          className={`p-2 transition-all ${isActive('/') ? 'text-astral-gold scale-110 drop-shadow-[0_0_8px_rgba(230,198,135,0.6)]' : 'text-slate-400 hover:text-white'}`}
        >
          <Home size={22} />
        </Link>

        {/* 2. KEŞFET */}
        <Link
          href="/explore"
          aria-label="Keşfet"
          className={`p-2 transition-all ${isActive('/explore') ? 'text-aether-cyan scale-110 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]' : 'text-slate-400 hover:text-white'}`}
        >
          <Compass size={22} />
        </Link>

        {/* 3. OLUŞTUR (ASTRAL ALTIN TETİKLEYİCİ) */}
        <div className="relative -mt-6" ref={menuRef}>
          {createMenuOpen && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 rounded-card border border-white/10 bg-void-900/95 backdrop-blur-2xl shadow-2xl overflow-hidden animate-fade-in">
              <Link
                href="/add-dream"
                onClick={() => setCreateMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-200 hover:bg-white/5 transition-colors"
              >
                <Moon size={16} className="text-aether-indigo" />
                Yeni Rüya
              </Link>
              <div className="h-px bg-white/5" />
              <Link
                href="/vision-board?create=1"
                onClick={() => setCreateMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-200 hover:bg-white/5 transition-colors"
              >
                <Target size={16} className="text-astral-gold" />
                Yeni Vizyon
              </Link>
            </div>
          )}

          <button
            onClick={() => setCreateMenuOpen((o) => !o)}
            aria-label="Oluştur"
            aria-expanded={createMenuOpen}
            className="group relative p-2 block"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-astral-gold to-aether-cyan rounded-full blur opacity-70 group-hover:opacity-100 transition-opacity animate-pulse" />
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-void-950 border border-astral-gold/40 text-astral-gold shadow-astral-glow">
              {createMenuOpen ? <X size={20} /> : <Plus size={22} />}
            </div>
          </button>
        </div>

        {/* 4. VİZYON */}
        <Link
          href="/vision-board"
          aria-label="Vizyon"
          className={`p-2 transition-all ${isActive('/vision-board') ? 'text-aether-indigo scale-110 drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]' : 'text-slate-400 hover:text-white'}`}
        >
          <Target size={22} />
        </Link>

        {/* 5. MESAJ */}
        <Link
          href="/messages"
          aria-label={showMessageBadge ? `Mesajlar (${unreadMessages} okunmamış)` : 'Mesajlar'}
          className={`relative p-2 transition-all ${isActive('/messages') ? 'text-aether-violet scale-110 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'text-slate-400 hover:text-white'}`}
        >
          <MessageCircle size={22} />
          {showMessageBadge && (
            <span className="absolute top-0.5 right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-shadowWork-rose px-1 text-[9px] font-bold text-white">
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </span>
          )}
        </Link>

      </div>
    </nav>
  )
}
