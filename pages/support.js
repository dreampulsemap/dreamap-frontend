// Yardım ve Geri Bildirim — Android menüsündeki "Yardım ve Geri Bildirim"
// (LegalLinks.helpSupportUrl) bu adresi açıyor; sayfa daha önce yoktu (404).
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Mail, BookOpen, Shield, FileText, Trash2, RotateCcw } from 'lucide-react'
import Seo from '@/components/Seo'
import { REPLAY_TOUR_EVENT } from '@/components/game/OnboardingTour'

const SUPPORT_EMAIL = 'support@lunosfer.com'

const FAQ = {
  tr: [
    ['Rüyamı nasıl kaydederim?', 'Alttaki ＋ düğmesine (masaüstünde soldaki menüye) dokun → Yeni Rüya Anlat. Rüyanı yaz ve gönder; yapay zekâ yorumun ve görselin hazırlanır.'],
    ['Mana ve Aura nedir?', 'Mana her gün yenilenen 20 puandır; başkalarının vizyonlarına göndererek destek olursun. Aura, derin analiz ve Kahin gibi premium yapay zekâ özelliklerinde kullanılan bakiyedir.'],
    ['XP ve rütbeler nasıl çalışır?', 'Rüya kaydetmek, yorum yapmak, beğenmek ve Mana göndermek XP kazandırır. Ayrıntılar Yolculuğum sayfasında.'],
    ['Günce hikâyeleri ne kadar görünür?', 'Paylaştığın günce, ana sayfadaki hikâye halkasında 24 saat görünür. Sonra profilindeki güncende kalıcı olarak durur; oradan düzenleyip silebilirsin.'],
    ['Birini nasıl engellerim ya da bildiririm?', "Kullanıcının profilindeki ⋯ menüsünden engelleyebilir ya da bildirebilirsin. Rüya ve mesajları da bayrak simgesiyle bildirebilirsin. Engellediklerini Profil > Engellenen Kullanıcılar'dan yönetirsin."],
    ['Hesabımı nasıl silerim?', 'Hesap silme sayfasından tüm verilerinle birlikte hesabını kalıcı olarak silebilirsin.'],
  ],
  en: [
    ['How do I record a dream?', 'Tap the ＋ button at the bottom (the left menu on desktop) → Log a Dream. Write your dream and submit; your AI interpretation and image are prepared.'],
    ['What are Mana and Aura?', "Mana is 20 points refreshed every day; send it to other people's visions to support them. Aura is the balance for premium AI features like deep analysis and the Oracle."],
    ['How do XP and ranks work?', 'Recording dreams, commenting, liking and sending Mana earn XP. Details are on the My Journey page.'],
    ['How long are diary stories visible?', 'A diary entry shows in the story ring on the home page for 24 hours. After that it stays in the journal on your profile, where you can edit or delete it.'],
    ['How do I block or report someone?', 'Use the ⋯ menu on their profile. Dreams and messages can be reported with the flag icon. Manage blocked users from Profile > Blocked Users.'],
    ['How do I delete my account?', 'Use the account deletion page to permanently delete your account and all your data.'],
  ],
}

export default function SupportPage() {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const lang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const tr = lang === 'tr'
  const title = tr ? 'Yardım ve Geri Bildirim' : 'Help & Feedback'

  const links = [
    { href: '/journey', icon: BookOpen, label: tr ? 'Yolculuğum (XP, rütbe, görevler)' : 'My Journey (XP, ranks, quests)' },
    { href: '/privacy', icon: Shield, label: tr ? 'Gizlilik Politikası' : 'Privacy Policy' },
    { href: '/terms', icon: FileText, label: tr ? 'Kullanım Koşulları' : 'Terms of Service' },
    { href: '/delete-account', icon: Trash2, label: tr ? 'Hesabı Sil' : 'Delete Account' },
  ]

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <Seo title={title} lang={lang} />
      <h1 className="font-serif text-3xl font-bold text-astral-gold">{title}</h1>
      <p className="mt-2 text-sm text-slate-400">
        {tr ? 'Bir sorun mu var ya da bir fikrin mi? Bize yaz, en kısa sürede dönelim.' : "Found a problem or have an idea? Write to us and we'll get back to you soon."}
      </p>

      <a
        href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(tr ? 'Lunosfer destek' : 'Lunosfer support')}`}
        className="mt-5 flex items-center gap-3 rounded-2xl border border-astral-gold/40 bg-astral-gold/10 p-4 hover:bg-astral-gold/15"
      >
        <Mail size={20} className="text-astral-gold" />
        <span>
          <span className="block text-sm font-bold text-white">{tr ? 'E-posta ile yaz' : 'Email us'}</span>
          <span className="block text-xs text-slate-300">{SUPPORT_EMAIL}</span>
        </span>
      </a>

      <button
        onClick={() => window.dispatchEvent(new Event(REPLAY_TOUR_EVENT))}
        className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left hover:bg-white/[0.06]"
      >
        <RotateCcw size={20} className="text-astral-gold" />
        <span className="text-sm font-bold text-white">{tr ? 'Uygulama Rehberi (tanıtım turu)' : 'App Guide (intro tour)'}</span>
      </button>

      <h2 className="mb-3 mt-8 font-serif text-xl font-bold text-white">{tr ? 'Sık sorulan sorular' : 'FAQ'}</h2>
      <div className="space-y-2">
        {FAQ[tr ? 'tr' : 'en'].map(([q, a]) => (
          <details key={q} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <summary className="cursor-pointer text-sm font-semibold text-white">{q}</summary>
            <p className="mt-2 text-sm text-slate-300">{a}</p>
          </details>
        ))}
      </div>

      <div className="mt-8 grid gap-2 sm:grid-cols-2">
        {links.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
            <Icon size={16} className="text-astral-gold" /> {label}
          </Link>
        ))}
      </div>
    </main>
  )
}
