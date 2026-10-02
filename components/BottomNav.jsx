// Android MainScreen.kt BottomNavBar'ının web karşılığı.
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Home, Compass, Radar, MessageSquare, Plus, Moon } from 'lucide-react'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'
import { supabase } from '@/lib/supabase'

const TEXT = {
  tr: { home: 'Ana Sayfa', explore: 'Keşfet', vision: 'Vizyon', messages: 'Mesajlar', create: 'Yeni oluştur', newDream: 'Rüya Kaydet', newVision: 'Yeni Vizyon' },
  en: { home: 'Home', explore: 'Explore', vision: 'Vision', messages: 'Messages', create: 'Create new', newDream: 'Log a Dream', newVision: 'New Vision' },
}

export default function BottomNav() {
  const router = useRouter()
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const { unreadCount } = useUnreadMessages()

  useEffect(() => { setMounted(true) }, [])
  const t = TEXT[mounted && (i18n.language || 'en').startsWith('tr') ? 'tr' : 'en']

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data: { session } }) => { if (active) setLoggedIn(!!session) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => { if (active) setLoggedIn(!!session) })
    return () => { active = false; subscription?.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menuOpen])

  // Android: alt bar yalnızca oturum açıkken görünür.
  if (!loggedIn) return null

  const item = (href, Icon, label, badge = 0, filled = false) => {
    const active = router.pathname === href
    return (
      <Link href={href} className={`flex flex-1 flex-col items-center justify-center gap-1 ${active ? 'text-astral-gold' : 'text-slate-500'}`}>
        <span className="relative">
          <Icon size={24} fill={filled ? 'currentColor' : 'none'} />
          {badge > 0 && (
            <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-shadowWork-rose px-1 text-[10px] font-medium text-white">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </span>
        <span className="text-[11px] font-medium leading-4">{label}</span>
      </Link>
    )
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-void-900 pb-safe" aria-label={t.home}>
      <div className="relative mx-auto flex h-20 max-w-2xl items-stretch">
        {item('/', Home, t.home, 0, true)}
        {item('/explore', Compass, t.explore)}
        <span className="flex-1" aria-hidden="true" />
        {item('/vision-board', Radar, t.vision)}
        {item('/messages', MessageSquare, t.messages, router.pathname === '/messages' ? 0 : unreadCount, true)}

        <div ref={menuRef} className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-7">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={t.create}
            aria-expanded={menuOpen}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-astral-gold to-aether-cyan text-white"
          >
            <Plus size={32} strokeWidth={2.5} />
          </button>
          {menuOpen && (
            <div className="absolute bottom-full left-1/2 mb-2 min-w-[180px] -translate-x-1/2 overflow-hidden rounded-[4px] bg-[#1d2130] py-2 shadow-2xl">
              <Link href="/add-dream" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-100 hover:bg-white/5">
                <Moon size={20} fill="currentColor" className="text-slate-300" />{t.newDream}
              </Link>
              <Link href="/vision-board?create=1" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-100 hover:bg-white/5">
                <Radar size={20} className="text-slate-300" />{t.newVision}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
