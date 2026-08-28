import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Home, Compass, Target, MessageCircle, User, Moon, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'

// Not: Bu liste Navbar.jsx'teki NAV_ITEMS ile kasıtlı olarak örtüşüyor —
// masaüstünde birincil gezinme artık burada, Navbar'ın ikinci satırı
// (metin linkleri) bu yüzden lg: altında gizlenmeli (bkz. entegrasyon notu).
// lg (1024px) kasıtlı: md (768px) tabletleri (ör. dikey iPad, 768-834px)
// masaüstü olarak sınıflandırıyordu — tabletler artık BottomNav'ı görüyor.
const NAV_ITEMS = [
  { href: '/', key: 'home', icon: Home },
  { href: '/explore', key: 'explore', icon: Compass },
  { href: '/vision-board', key: 'vision', icon: Target },
  { href: '/messages', key: 'message', icon: MessageCircle },
  { href: '/profile', key: 'profile', icon: User },
]

export default function Sidebar() {
  const router = useRouter()
  const { t, i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => { setMounted(true) }, [])
  const currentLang = mounted ? (i18n?.language || 'en').split('-')[0] : 'en'

  // Sadece "giriş yapılmış mı" bilgisi lazım (CTA'ları /auth'a yönlendirmek
  // için) — mana/aura/bildirim gibi zaten Navbar.jsx'te yönetilen state'i
  // burada tekrar çekmiyoruz, iki bileşenin senkron kalması gereken ayrı
  // birer kaynağı olmasın diye.
  useEffect(() => {
    if (!mounted) return
    let active = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setUser(session?.user || null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (active) setUser(session?.user || null)
    })
    return () => { active = false; subscription?.unsubscribe() }
  }, [mounted])

  const isActive = (href) => router.pathname === href

  function requireAuth(e) {
    if (!user) {
      e.preventDefault()
      router.push('/auth')
    }
  }

  return (
    <aside
      className="hidden lg:flex lg:flex-col fixed left-0 top-0 z-40 h-screen w-64 overflow-y-auto border-r border-white/5 bg-void-950/70 px-4 pb-6 pt-24 backdrop-blur-2xl"
      aria-label={t('nav.home')}
    >
      {/* ODAK NOKTASI: birincil CTA — mevcut ?create=1 akışını kullanır
          (vision-board.js zaten bunu dinliyor, BottomNav.jsx ile aynı yol) */}
      <Link
        href="/vision-board?create=1"
        onClick={requireAuth}
        className="group relative mb-2 flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-astral-gold to-aether-cyan px-4 py-3 text-sm font-bold uppercase tracking-wider text-void-950 shadow-astral-glow transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_28px_rgba(230,198,135,0.55)]"
      >
        <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />
        <Plus size={18} className="relative shrink-0" />
        <span className="relative">{t('nav.newVision')}</span>
      </Link>

      {/* İkincil oluşturma seçeneği — BottomNav'daki "Oluştur" menüsünün
          "Yeni Rüya" seçeneğine masaüstü karşılığı */}
      <Link
        href="/add-dream"
        onClick={requireAuth}
        className="mb-6 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-aether-indigo/40 hover:text-aether-indigo"
      >
        <Moon size={14} />
        <span>{t('nav.logDream')}</span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, key, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={key}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-white/5 text-astral-gold'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon
                size={19}
                className={active ? 'shrink-0 drop-shadow-[0_0_6px_rgba(230,198,135,0.6)]' : 'shrink-0'}
              />
              <span>{mounted ? t(`nav.${key}`) : '\u00A0'}</span>
            </Link>
          )
        })}
      </nav>

      {/* Google Play Console "App content" formunun zorunlu kıldığı,
          uygulama içinden (bu durumda web'den) erişilebilir Gizlilik
          Politikası + Kullanım Koşulları linki. Daha önce hiçbir yerden
          linklenmiyordu (sadece doğrudan URL ile erişilebiliyordu). */}
      <div className="mt-auto flex flex-col gap-0.5 pt-6 text-[11px] text-slate-600">
        <Link href="/privacy" className="hover:text-slate-400 transition-colors">
          {currentLang === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}
        </Link>
        <Link href="/terms" className="hover:text-slate-400 transition-colors">
          {currentLang === 'tr' ? 'Kullanım Koşulları' : 'Terms of Service'}
        </Link>
      </div>
    </aside>
  )
}
