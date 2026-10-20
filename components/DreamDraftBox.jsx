import { useState } from 'react'
import { useRouter } from 'next/router'
import GetAppLink from '@/components/GetAppLink'
import { captureEvent } from '@/lib/posthog-client'
import { savePendingDream, looksSignedIn } from '@/lib/pendingDream'

// Rehber sayfalarının sonundaki "kendi rüyanı yaz" kutusu (eski AnalyzeCta'nın
// yerine). Google'dan "rüyada yılan görmek" diye gelen kişinin aklında zaten
// belirli bir rüya var; eski buton onu boş bir kayıt formuna atıyordu.
// Şimdi rüyasını ÖNCE burada yazıyor (emek verdiği metin onu kayda taşır),
// metin localStorage'da bekliyor, kayıt/giriş biter bitmez /add-dream'de
// kutuya hazır geliyor. Sunucuya kayıttan önce hiçbir şey gitmiyor.

const TEXT = {
  tr: {
    title: 'Kendi rüyanı yaz, sana özel yorumunu al',
    body: 'Genel anlamlar bir yere kadar. Rüyanı kendi kelimelerinle yaz; sembollerini, baskın arketipini ve duygusal izlerini senin rüyana göre yorumlayalım.',
    placeholder: 'Örn: Rüyamda eski evimdeydim, bodrumdan bir ses geliyordu. Aşağı indim ama…',
    tooShort: 'Biraz daha anlat: nerede olduğunu, ne olduğunu ve ne hissettiğini yazarsan yorum sana özel olur.',
    cta: 'Rüyamı yorumla',
    note: 'Ücretsiz başla. Rüyaların varsayılan olarak yalnızca sana görünür.',
    app: 'ya da Android uygulamasında yaz',
  },
  en: {
    title: 'Write your dream, get a reading that is about you',
    body: 'General meanings only go so far. Describe your dream in your own words and get its symbols, dominant archetype and emotional traces read for your dream.',
    placeholder: 'e.g. I was back in my old house and heard a sound from the basement. I went down, but…',
    tooShort: 'Tell a little more: where you were, what happened and how you felt make the reading personal.',
    cta: 'Interpret my dream',
    note: 'Start free. Your dreams are private to you by default.',
    app: 'or write it in the Android app',
  },
}

const MIN_WORDS = 5

export default function DreamDraftBox({ lang = 'tr', source }) {
  const t = TEXT[lang] || TEXT.tr
  const router = useRouter()
  const [text, setText] = useState('')
  const [hint, setHint] = useState('')

  const words = text.trim().split(/\s+/).filter(Boolean).length

  function submit(e) {
    e.preventDefault()
    if (words < MIN_WORDS) {
      setHint(t.tooShort)
      return
    }
    savePendingDream({ content: text.trim(), source, lang })
    const signedIn = looksSignedIn()
    captureEvent('guide_dream_draft', { source, lang, words, signed_in: signedIn })
    router.push(signedIn ? '/add-dream' : '/auth?mode=signup')
  }

  return (
    <form
      onSubmit={submit}
      className="mt-12 rounded-2xl border border-astral-gold/30 bg-astral-gold/10 p-6"
      aria-labelledby="dream-draft-title"
    >
      <p id="dream-draft-title" className="font-serif text-xl font-bold text-white mb-2 text-center">{t.title}</p>
      <p className="text-sm text-white/70 mb-4 text-center">{t.body}</p>
      <label htmlFor="dream-draft" className="sr-only">{t.title}</label>
      <textarea
        id="dream-draft"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (hint) setHint('')
        }}
        rows={4}
        maxLength={5000}
        placeholder={t.placeholder}
        className="w-full rounded-xl border border-white/15 bg-void-950/70 p-3 text-sm leading-relaxed text-white placeholder:text-white/35 focus:border-astral-gold/60 focus:outline-none"
      />
      {hint && <p className="mt-2 text-xs text-astral-gold" role="status">{hint}</p>}
      <div className="mt-4 flex flex-col items-center gap-2">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-astral-gold px-6 py-3 text-xs font-bold uppercase tracking-wider text-void-950 shadow-astral-glow transition-all hover:brightness-110"
        >
          {t.cta}
        </button>
        <p className="text-xs text-white/50">{t.note}</p>
        <GetAppLink placement={`guide_${lang}`} className="text-xs text-white/50 underline-offset-4 hover:text-white hover:underline">
          {t.app}
        </GetAppLink>
      </div>
    </form>
  )
}
