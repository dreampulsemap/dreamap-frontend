// pages/delete-account.js
//
// Google Play "Hesap Silme" politikası (2023), uygulamayı kurmadan da
// erişilebilen bir hesap silme yolu istiyor — bu sayfa o yolu sağlıyor.
// Play Console > App content > Account deletion alanına bu sayfanın
// tam URL'ini gireceksiniz: https://www.lunosfer.com/delete-account
//
// NOT (i18n): Projenin geri kalanı react-i18next + lib/translations.js
// kullanıyor; zaman kısıtı nedeniyle bu sayfa kendi içinde basit bir
// TR/EN metin objesiyle yazıldı, mevcut çeviri sözlüğüne taşınmadı.
// İstersen ileride `lib/translations.js`'e taşıyıp diğer sayfalarla
// aynı sisteme bağlayabilirsin.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { auth, getAuthHeader } from '@/lib/supabase'

const COPY = {
  tr: {
    title: 'Hesabını Sil',
    intro:
      'Bu sayfa, Lunosfer hesabını ve buna bağlı tüm verileri kalıcı olarak silmeni sağlar. Uygulamayı telefonunda kurulu tutmana gerek yoktur.',
    whatGetsDeleted: 'Ne silinir?',
    deletedList: [
      'Profil bilgilerin (kullanıcı adı, biyografi, fotoğraf)',
      'Tüm rüya kayıtların, vizyon/hedef panoların ve günlük girişlerin',
      'Yorumların, beğenilerin ve arkadaşlık bağların',
      'Mesajların ve bildirimlerin',
    ],
    retainedNote:
      'İstisna: satın alma/abonelik kayıtların, muhasebe ve yasal yükümlülükler nedeniyle kişisel bağı kaldırılarak (anonim olarak) saklanır — ayrıntı için Gizlilik Politikamıza bakabilirsin.',
    emailLabel: 'E-posta',
    passwordLabel: 'Şifre',
    signInBtn: 'Giriş yap',
    signingIn: 'Giriş yapılıyor…',
    loggedInAs: (email) => `${email} olarak giriş yaptın.`,
    notYou: 'Bu sen değil misin? Çıkış yap',
    confirmCheckbox:
      'Hesabımın ve tüm içeriğimin kalıcı olarak silineceğini, bu işlemin geri alınamayacağını anlıyorum.',
    deleteBtn: 'Hesabımı Kalıcı Olarak Sil',
    deleting: 'Siliniyor…',
    successTitle: 'Hesabın silindi',
    successBody: 'Hesabın ve ilişkili verilerin kalıcı olarak silindi. İyi yolculuklar.',
    errorGeneric: 'Hesap silinemedi. Lütfen daha sonra tekrar dene ya da bizimle iletişime geç.',
    privacyLink: 'Gizlilik Politikası',
  },
  en: {
    title: 'Delete Your Account',
    intro:
      'This page lets you permanently delete your Lunosfer account and all associated data. You do not need to have the app installed.',
    whatGetsDeleted: 'What gets deleted',
    deletedList: [
      'Your profile info (username, bio, photo)',
      'All your dreams, vision/goal boards and diary entries',
      'Your comments, likes and friendships',
      'Your messages and notifications',
    ],
    retainedNote:
      'Exception: purchase/subscription records are retained (with the personal link removed) for accounting and legal reasons — see our Privacy Policy for details.',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    signInBtn: 'Sign in',
    signingIn: 'Signing in…',
    loggedInAs: (email) => `Signed in as ${email}.`,
    notYou: 'Not you? Sign out',
    confirmCheckbox:
      'I understand my account and all my content will be permanently deleted, and this cannot be undone.',
    deleteBtn: 'Permanently Delete My Account',
    deleting: 'Deleting…',
    successTitle: 'Your account has been deleted',
    successBody: 'Your account and associated data have been permanently removed. Safe travels.',
    errorGeneric: 'We could not delete your account. Please try again later or contact us.',
    privacyLink: 'Privacy Policy',
  },
}

export default function DeleteAccountPage() {
  const router = useRouter()
  const [lang, setLang] = useState('tr')
  useEffect(() => {
    const browserLang = (navigator.language || 'tr').slice(0, 2)
    setLang(browserLang === 'tr' ? 'tr' : 'en')
  }, [])
  const t = COPY[lang]

  const [user, setUser] = useState(null)
  const [checkingUser, setCheckingUser] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    auth.getUser().then((u) => {
      if (mounted) {
        setUser(u)
        setCheckingUser(false)
      }
    })
    return () => { mounted = false }
  }, [])

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setSigningIn(true)
    try {
      const { user: signedInUser } = await auth.signIn(email, password)
      setUser(signedInUser)
    } catch (err) {
      setError(err.message || t.errorGeneric)
    } finally {
      setSigningIn(false)
    }
  }

  async function handleSignOut() {
    await auth.signOut()
    setUser(null)
  }

  async function handleDelete() {
    if (!confirmed) return
    setError('')
    setDeleting(true)
    try {
      const headers = await getAuthHeader()
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || t.errorGeneric)
      }
      setDone(true)
    } catch (err) {
      setError(err.message || t.errorGeneric)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-void-950 text-white px-4 py-16">
      <Head>
        <title>{t.title} — Lunosfer</title>
      </Head>

      <div className="max-w-md mx-auto">
        <button
          onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
          className="text-xs text-white/50 mb-6 underline"
        >
          {lang === 'tr' ? 'English' : 'Türkçe'}
        </button>

        <h1 className="text-2xl font-bold text-astral-gold mb-4">{t.title}</h1>

        {done ? (
          <div className="rounded-lg border border-semantic-success-500/30 bg-semantic-success-500/10 px-4 py-6 text-center">
            <p className="text-lg font-semibold mb-2">{t.successTitle}</p>
            <p className="text-white/70 text-sm">{t.successBody}</p>
          </div>
        ) : (
          <>
            <p className="text-white/70 text-sm mb-6">{t.intro}</p>

            <div className="rounded-lg border border-white/10 bg-void-900 px-4 py-4 mb-6">
              <p className="font-semibold mb-2 text-sm">{t.whatGetsDeleted}</p>
              <ul className="list-disc list-inside text-sm text-white/70 space-y-1">
                {t.deletedList.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="text-xs text-white/40 mt-3">{t.retainedNote}</p>
            </div>

            {error && (
              <div className="mb-4 rounded bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            {checkingUser ? null : !user ? (
              <form onSubmit={handleSignIn} className="space-y-3 mb-6">
                <div>
                  <label className="text-xs text-white/50 block mb-1">{t.emailLabel}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded px-3 py-2 bg-black/40"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">{t.passwordLabel}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded px-3 py-2 bg-black/40"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={signingIn}
                  className="w-full rounded bg-violet-600 py-2 text-white font-semibold disabled:opacity-50"
                >
                  {signingIn ? t.signingIn : t.signInBtn}
                </button>
              </form>
            ) : (
              <>
                <p className="text-sm text-white/70 mb-2">{t.loggedInAs(user.email)}</p>
                <button onClick={handleSignOut} className="text-xs text-white/40 underline mb-6">
                  {t.notYou}
                </button>

                <label className="flex items-start gap-2 text-sm text-white/80 mb-4">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-1"
                  />
                  {t.confirmCheckbox}
                </label>

                <button
                  onClick={handleDelete}
                  disabled={!confirmed || deleting}
                  className="w-full rounded bg-semantic-danger-500 py-3 text-white font-bold disabled:opacity-40"
                >
                  {deleting ? t.deleting : t.deleteBtn}
                </button>
              </>
            )}
          </>
        )}

        <a href="/privacy" className="block text-center text-xs text-white/40 underline mt-8">
          {t.privacyLink}
        </a>
      </div>
    </div>
  )
}
