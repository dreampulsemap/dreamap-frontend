// Android ProfileScreen.kt parçaları: özet kartı, istatistikler, ızgara öğesi, Ayarlar sayfası.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Lock, Users, Pencil, Ban, ShieldCheck, FileText, Trash2, ChevronRight, Star, Sparkles, X } from 'lucide-react'
import AISummariesCard from '@/components/AISummariesCard'
import ReferralWidget from '@/components/ReferralWidget'
import { supabase, getAuthHeader } from '@/lib/supabase'

const SHOP_URL = 'https://shop.lunosfer.com'

export const PROFILE_TEXT = {
  tr: {
    title: 'Profil & Ayarlar', settings: 'Ayarlar', findFriends: 'Arkadaş Ara & Takip Et', logout: 'Çıkış Yap',
    logoutTitle: 'Çıkış yapılsın mı?', logoutDesc: 'Tekrar girmek için e-posta ve şifreni yeniden girmen gerekecek.', cancel: 'İptal',
    tabs: ['Vizyon Panosu', 'Rüyalar', 'Günce', 'Kaydedilenler'],
    empty: { vision: 'Henüz vizyonunuz yok.', dreams: 'Henüz rüyanız yok.', saved: 'Henüz kaydedilmiş vizyonunuz yok.' },
    privateBadge: 'Gizli Hesap', friendsBadge: 'Arkadaşlara Özel Hesap', edit: 'Düzenle',
    stats: [['Etkileşim', 'İlk rüyanı paylaş, fark edil'], ['Yorum', 'Henüz yorum yok'], ['Arkadaş', 'İlk arkadaşını bul']],
    changePassword: 'Şifre Değiştir', newPw: 'Yeni şifre', confirmPw: 'Yeni şifre (tekrar)', tooShort: 'Şifre en az 6 karakter olmalı.',
    mismatch: 'Şifreler eşleşmiyor.', pwSuccess: 'Şifren güncellendi.', save: 'Kaydet',
    blocked: 'Engellenen Kullanıcılar', privacy: 'Gizlilik Politikası', terms: 'Kullanım Koşulları', deleteAccount: 'Hesabı Sil',
    premium: 'Premium Üye', premiumDesc: 'Aylık 10 yapay zeka görseli ve 10 derin rüya analizi aktif.',
    free: 'Ücretsiz Üyelik', freeDesc: 'Sınırsız video ekleme ve tüm temel özellikler ücretsizdir.', upgrade: "Premium'a Yükselt",
  },
  en: {
    title: 'Profile & Settings', settings: 'Settings', findFriends: 'Find & Follow Friends', logout: 'Log Out',
    logoutTitle: 'Log out?', logoutDesc: "You'll need to enter your email and password again to sign back in.", cancel: 'Cancel',
    tabs: ['Vision Board', 'Dreams', 'Diary', 'Saved'],
    empty: { vision: "You don't have any visions yet.", dreams: "You don't have any dreams yet.", saved: "You don't have any saved visions yet." },
    privateBadge: 'Private Account', friendsBadge: 'Friends-only Account', edit: 'Edit',
    stats: [['Engagement', 'Share your first dream, get noticed'], ['Comments', 'No comments yet'], ['Friends', 'Find your first friend']],
    changePassword: 'Change Password', newPw: 'New password', confirmPw: 'New password (again)', tooShort: 'Password must be at least 6 characters.',
    mismatch: "Passwords don't match.", pwSuccess: 'Your password was updated.', save: 'Save',
    blocked: 'Blocked Users', privacy: 'Privacy Policy', terms: 'Terms of Service', deleteAccount: 'Delete Account',
    premium: 'Premium Member', premiumDesc: '10 AI images and 10 deep dream analyses per month are active.',
    free: 'Free Membership', freeDesc: 'Unlimited video uploads and all core features are free.', upgrade: 'Upgrade to Premium',
  },
}

const fmt = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : String(v))

export function ProfileSummaryCard({ t, profile, user, stats, onEdit, onFriends }) {
  const name = profile?.display_name || profile?.username || 'User'
  const avatar = profile?.avatar_url || user?.user_metadata?.avatar_url
  const vis = profile?.profile_visibility
  const values = [stats?.totalEngagement || 0, stats?.totalComments || 0, stats?.friendsCount || 0]
  return (
    <div className="w-full rounded-[20px] border border-astral-gold/20 bg-gradient-to-br from-void-900 to-void-800">
      <div className="flex items-center gap-4 p-5">
        <span className="flex h-[68px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-astral-gold bg-astral-gold/20 shadow-[0_0_14px_rgba(230,198,135,0.45)]">
          {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <span className="text-[26px] font-bold text-astral-gold">{name.slice(0, 1).toUpperCase()}</span>}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-bold text-white">{name}</p>
          <p className="text-xs text-gray-500">@{profile?.username || 'user'}</p>
          {profile?.bio && <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-4 text-slate-300">{profile.bio}</p>}
          {(vis === 'private' || vis === 'friends') && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-astral-gold">
              {vis === 'private' ? <Lock size={12} /> : <Users size={12} />}{vis === 'private' ? t.privateBadge : t.friendsBadge}
            </p>
          )}
        </div>
        <button onClick={onEdit} className="flex shrink-0 items-center gap-1 rounded-full border border-astral-gold px-3 py-1.5 text-xs text-astral-gold">
          <Pencil size={14} />{t.edit}
        </button>
      </div>
      <div className="h-px bg-white/[0.06]" />
      <div className="flex items-center justify-evenly py-3.5">
        {t.stats.map(([label, empty], i) => (
          <div key={label} className="contents">
            {i > 0 && <span className="h-8 w-px bg-white/[0.08]" />}
            <button onClick={i === 2 ? onFriends : undefined} className={`flex flex-col items-center ${i === 2 ? '' : 'cursor-default'}`}>
              {values[i] > 0 ? (
                <><span className="font-serif text-lg font-bold text-astral-gold">{fmt(values[i])}</span><span className="text-[11px] text-gray-500">{label}</span></>
              ) : (
                <span className="max-w-[80px] text-center text-[11px] leading-[14px] text-slate-500">{empty}</span>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProfileGridItem({ imageUrl, title, onClick, innerRef }) {
  const [failed, setFailed] = useState(false)
  return (
    <div ref={innerRef} className="aspect-square p-0.5">
      <button onClick={onClick} className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-void-900">
        {imageUrl && !failed ? (
          <img src={imageUrl} alt="" onError={() => setFailed(true)} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="line-clamp-2 p-2 text-center text-xs text-white">{title}</span>
        )}
      </button>
    </div>
  )
}

function Row({ icon: Icon, label, danger, onClick, href }) {
  const cls = 'flex w-full items-center gap-3.5 px-4 py-3.5 text-left'
  const inner = (
    <>
      <Icon size={20} className={danger ? 'text-semantic-danger-400' : 'text-slate-400'} />
      <span className={`flex-1 text-sm font-medium ${danger ? 'text-semantic-danger-400' : 'text-white'}`}>{label}</span>
      <ChevronRight size={16} className="text-gray-500/50" />
    </>
  )
  return href ? <Link href={href} className={cls}>{inner}</Link> : <button onClick={onClick} className={cls}>{inner}</button>
}

function ChangePasswordDialog({ t, onClose }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  async function save() {
    if (pw.length < 6) return setMsg(t.tooShort)
    if (pw !== pw2) return setMsg(t.mismatch)
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setSaving(false)
    if (error) return setMsg(error.message)
    setMsg(t.pwSuccess)
    setTimeout(onClose, 1200)
  }
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-[28px] bg-void-900 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold text-white">{t.changePassword}</h3>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t.newPw} autoComplete="new-password" className="mb-3 w-full rounded-md border border-white/20 bg-transparent px-3 py-3 text-sm text-white" />
        <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder={t.confirmPw} autoComplete="new-password" className="w-full rounded-md border border-white/20 bg-transparent px-3 py-3 text-sm text-white" />
        {msg && <p className="mt-2 text-xs text-astral-gold">{msg}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400">{t.cancel}</button>
          <button onClick={save} disabled={saving} className="rounded-full bg-astral-gold px-5 py-2 text-sm font-bold text-void-950 disabled:opacity-60">{t.save}</button>
        </div>
      </div>
    </div>
  )
}

// Android ProfileSettingsSheet: özetler, üyelik, davet, hesap/yasal işlemler.
export function ProfileSettingsSheet({ t, lang, user, onClose }) {
  const [premium, setPremium] = useState(null)
  const [pwOpen, setPwOpen] = useState(false)
  useEffect(() => {
    getAuthHeader().then((h) => fetch('/api/user/premium-status', { headers: h })).then((r) => r.json()).then(setPremium).catch(() => {})
  }, [])
  const isPremium = Boolean(premium?.isPremium)
  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-void-950 px-5 pb-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center py-3"><span className="h-1 w-8 rounded-full bg-astral-gold/30" /></div>
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-astral-gold">{t.settings}</h2>
            <button onClick={onClose} aria-label={t.cancel} className="text-slate-400"><X size={20} /></button>
          </div>
          <div className="flex flex-col gap-4">
            <AISummariesCard lang={lang} user={user} />
            <div className={`rounded-2xl border ${isPremium ? 'border-astral-gold bg-void-800' : 'border-void-800 bg-void-900'}`}>
              <div className="flex items-center gap-3.5 p-4">
                <span className={`flex h-11 w-11 items-center justify-center rounded-full ${isPremium ? 'bg-astral-gold/20' : 'bg-void-800'}`}>
                  {isPremium ? <Star size={24} className="text-astral-gold" fill="currentColor" /> : <Sparkles size={24} className="text-gray-500" />}
                </span>
                <div className="flex-1">
                  <p className={`font-bold ${isPremium ? 'text-[15px] text-astral-gold' : 'text-sm text-white'}`}>{isPremium ? t.premium : t.free}</p>
                  <p className={`text-xs ${isPremium ? 'text-slate-300' : 'text-semantic-success-400'}`}>{isPremium ? t.premiumDesc : t.freeDesc}</p>
                </div>
              </div>
              {!isPremium && (
                <a href={SHOP_URL} target="_blank" rel="noopener noreferrer" className="mx-4 mb-4 block rounded-full bg-astral-gold py-2.5 text-center text-sm font-bold text-black">{t.upgrade}</a>
              )}
            </div>
            <ReferralWidget lang={lang} user={user} />
          </div>
          <div className="divide-y divide-white/5 rounded-2xl bg-void-900 py-2">
            {user?.email && <Row icon={Lock} label={t.changePassword} onClick={() => setPwOpen(true)} />}
            <Row icon={Ban} label={t.blocked} href="/blocked-users" />
            <Row icon={ShieldCheck} label={t.privacy} href="/privacy" />
            <Row icon={FileText} label={t.terms} href="/terms" />
            <Row icon={Trash2} label={t.deleteAccount} danger href="/delete-account" />
          </div>
        </div>
      </div>
      {pwOpen && <ChangePasswordDialog t={t} onClose={() => setPwOpen(false)} />}
    </div>
  )
}
