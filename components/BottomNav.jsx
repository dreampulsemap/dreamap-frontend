import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { Moon, Target, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function BottomNav() {
  const router = useRouter()
  const [avatarUrl, setAvatarUrl] = useState('')
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // "+" butonuna dışarı tıklanınca menüyü kapat
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
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .maybeSingle()
            
          setAvatarUrl(profile?.avatar_url || user.user_metadata?.avatar_url || '')
        }
      } catch (err) {
        console.error('BottomNav avatar load failed:', err)
      }
    }
    loadAvatar()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && active) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('avatar_url')
          .eq('id', session.user.id)
          .maybeSingle()
          
        setAvatarUrl(profile?.avatar_url || '')
      } else {
        setAvatarUrl('')
      }
    })

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  // Aktif sekme kontrolü
  const isActive = (path) => router.pathname === path

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-slate-950/85 backdrop-blur-2xl px-6 py-3 pb-safe">
      <div className="flex items-center justify-between max-w-md mx-auto">
        
        {/* 1. ANA SAYFA */}
        <Link href="/" className={`p-2 transition-all ${isActive('/') ? 'text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.6)]' : 'text-slate-400 hover:text-white'}`}>
          <svg viewBox="0 0 24 24" fill={isActive('/') ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22" />
          </svg>
        </Link>

        {/* 2. KEŞFET */}
        <Link href="/explore" className={`p-2 transition-all ${isActive('/explore') ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'text-slate-400 hover:text-white'}`}>
          <svg viewBox="0 0 24 24" fill={isActive('/explore') ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </Link>

        {/* 3. OLUŞTUR — artık tek seçenek (Rüya) değil, Rüya/Vizyon seçim menüsü.
            Vision Board/Goals özelliği eklendiğinde bu buton hâlâ sadece
            /add-dream'e gidiyordu — yeni özellik mobilde keşfedilemezdi. */}
        <div className="relative -mt-6" ref={menuRef}>
          {createMenuOpen && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-44 rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-[0_15px_40px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in">
              <Link
                href="/add-dream"
                onClick={() => setCreateMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-sm text-slate-200 hover:bg-white/5 transition-colors"
              >
                <Moon size={16} className="text-fuchsia-400" />
                Yeni Rüya
              </Link>
              <div className="h-px bg-white/10" />
              <Link
                href="/vision-board?create=1"
                onClick={() => setCreateMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-sm text-slate-200 hover:bg-white/5 transition-colors"
              >
                <Target size={16} className="text-cyan-400" />
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
            <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-500 to-cyan-500 rounded-full blur opacity-60 group-hover:opacity-100 transition-opacity animate-pulse" />
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 border-2 border-white/20 text-white shadow-xl">
              {createMenuOpen ? (
                <X size={22} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              )}
            </div>
          </button>
        </div>

        {/* 4. KÜRE */}
        <Link href="/globe" className={`p-2 transition-all ${isActive('/globe') ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'text-slate-400 hover:text-white'}`}>
          <svg viewBox="0 0 24 24" fill={isActive('/globe') ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20" />
          </svg>
        </Link>

        {/* 5. PROFİL */}
        <Link href="/profile" className={`p-1 transition-all ${isActive('/profile') ? 'ring-2 ring-fuchsia-400 ring-offset-2 ring-offset-slate-950 rounded-full' : 'opacity-70 hover:opacity-100'}`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-slate-400">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          )}
        </Link>

      </div>
    </nav>
  )
}