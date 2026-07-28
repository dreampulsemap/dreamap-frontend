import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { Moon, Target, X, Globe, Sparkles, User, Home, Compass } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function BottomNav() {
  const router = useRouter()
  const [avatarUrl, setAvatarUrl] = useState('')
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setCreateMenuOpen(false)
    }
    if (createMenuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [createMenuOpen])

  useEffect(() => {
    let active = true
    async function loadAvatar() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user && active) {
          const { data: profile } = await supabase.from('user_profiles').select('avatar_url').eq('id', user.id).maybeSingle()
          setAvatarUrl(profile?.avatar_url || user.user_metadata?.avatar_url || '')
        }
      } catch (err) {}
    }
    loadAvatar()
  }, [])

  const isActive = (path) => router.pathname === path

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-void-950/90 backdrop-blur-2xl px-6 py-2.5 pb-safe">
      <div className="flex items-center justify-between max-w-md mx-auto">
        
        {/* 1. ANA SAYFA */}
        <Link href="/" className={`p-2 transition-all ${isActive('/') ? 'text-astral-gold scale-110 drop-shadow-[0_0_8px_rgba(230,198,135,0.6)]' : 'text-slate-400 hover:text-white'}`}>
          <Home size={22} />
        </Link>

        {/* 2. KEŞFET */}
        <Link href="/explore" className={`p-2 transition-all ${isActive('/explore') ? 'text-aether-cyan scale-110 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]' : 'text-slate-400 hover:text-white'}`}>
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
            className="group relative p-2 block"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-astral-gold to-aether-cyan rounded-full blur opacity-70 group-hover:opacity-100 transition-opacity animate-pulse" />
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-void-950 border border-astral-gold/40 text-astral-gold shadow-astral-glow">
              {createMenuOpen ? <X size={20} /> : <Sparkles size={20} />}
            </div>
          </button>
        </div>

        {/* 4. KOLEKTİF KÜRE */}
        <Link href="/globe" className={`p-2 transition-all ${isActive('/globe') ? 'text-aether-indigo scale-110 drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]' : 'text-slate-400 hover:text-white'}`}>
          <Globe size={22} />
        </Link>

        {/* 5. PROFİL */}
        <Link href="/profile" className={`p-1 transition-all ${isActive('/profile') ? 'ring-2 ring-astral-gold ring-offset-2 ring-offset-void-950 rounded-full' : 'opacity-70 hover:opacity-100'}`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <User size={20} className="text-slate-400" />
          )}
        </Link>

      </div>
    </nav>
  )
}