import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { User, LogIn, Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [auras, setAuras] = useState(0)
  const [mana, setMana] = useState(0)
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false)
  const notifDropdownRef = useRef(null)

  useEffect(() => {
    async function checkUser() {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        setUser(currentUser)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('premium_analysis_auras, mana_balance')
          .eq('id', currentUser.id)
          .maybeSingle()
        setAuras(profile?.premium_analysis_auras || 0)
        setMana(profile?.mana_balance ?? 0)
      }
    }
    checkUser()
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-void-950/80 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-black font-serif uppercase tracking-[0.2em] gold-gradient-text">
            LUNOSFER
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          {user && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-aether-cyan/30 bg-aether-cyan/10 text-xs font-bold text-aether-cyan">
              <span>💧</span>
              <span>{mana}</span>
            </div>
          )}

          {user && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-astral-gold/30 bg-astral-gold/10 text-xs font-bold text-astral-gold">
              <span>✦</span>
              <span>{auras}</span>
            </div>
          )}

          {/* 5. TEKNİK: Asimetrik Varsayılanlar / Derin Ayar Linki */}
          {user && (
            <div className="relative" ref={notifDropdownRef}>
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="p-2 text-slate-400 hover:text-white"
              >
                <Bell size={18} />
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-card border border-white/10 bg-void-900 shadow-2xl z-50 p-4 animate-fade-in">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-slate-300 uppercase">Bildirimler</span>
                    <span className="text-[9px] text-aether-cyan font-mono">Otomatik Hizalı</span>
                  </div>
                  <p className="text-xs text-slate-500 text-center py-4">Bildiriminiz yok.</p>
                  
                  {/* Derin Link (Gizli Ayar) */}
                  <div className="pt-2 border-t border-white/5 text-center">
                    <a 
                      href="/profile#stream-preferences" 
                      className="text-[9px] text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      Akış & Frekans Tercihlerini Yönet
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
