import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { Download, X } from 'lucide-react'

// Banner'ı tamamen kapatmak istersen (ör. kampanya bitti) false yap.
const BANNER_ENABLED = true

// localStorage'da TEK bir "bu zamana kadar tekrar gösterme" damgası tutuluyor.
// Sinyalin gücüne göre farklı süre: sadece görüp geçmek zayıf bir "hayır"
// (yarın tekrar sorulabilir), bilinçli kapatmak orta güçte (2 hafta), CTA'ya
// basıp /app sayfasına gitmek ise zaten ilgisini göstermiş demek (3 ay
// boyunca hiç rahatsız etme).
const STORAGE_KEY = 'dreamap_app_banner_next_eligible_v2'
const COOLDOWN_PASSIVE_MS = 1 * 24 * 60 * 60 * 1000
const COOLDOWN_DISMISS_MS = 14 * 24 * 60 * 60 * 1000
const COOLDOWN_CLICKED_MS = 90 * 24 * 60 * 60 * 1000
// Sayfa açılır açılmaz göstermiyoruz — anında çıkan bir şerit "reklam" gibi
// hissettirir; kısa bir gecikme, gerçekten sitede kalan bir kullanıcıya
// gösterildiği hissini güçlendirir (mere-exposure + daha az reaktans).
const ENTRANCE_DELAY_MS = 2500

function persistCooldown(ms) {
  try { window.localStorage.setItem(STORAGE_KEY, String(Date.now() + ms)) } catch (e) {}
}

export default function AppDownloadBanner() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!BANNER_ENABLED) return
    let nextEligibleAt = 0
    try { nextEligibleAt = Number(window.localStorage.getItem(STORAGE_KEY) || 0) } catch (e) {}
    // Sadece Android'de göster — iOS/masaüstü kullanıcısına tıklanamaz bir
    // "Android'de indir" çağrısı göstermek çıkmaz sokak olur, güven kırar.
    const isAndroid = /Android/i.test(window.navigator?.userAgent || '')
    if (!isAndroid || Date.now() < nextEligibleAt) return

    const timer = setTimeout(() => {
      setVisible(true)
      persistCooldown(COOLDOWN_PASSIVE_MS)
    }, ENTRANCE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  function handleDismiss() {
    setVisible(false)
    persistCooldown(COOLDOWN_DISMISS_MS)
  }

  function handleCtaClick() {
    persistCooldown(COOLDOWN_CLICKED_MS)
  }

  if (!BANNER_ENABLED || !visible) return null

  return (
    <div className="animate-banner-in flex items-center gap-3 border-b border-astral-gold/20 bg-gradient-to-r from-astral-gold/10 via-void-950 to-void-950 px-3 py-2 sm:px-6">
      <Download size={16} className="shrink-0 text-astral-gold" />
      <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-200">
        {t('app.downloadBannerText')}
      </p>
      <Link
        href="/app"
        onClick={handleCtaClick}
        className="shrink-0 rounded-pill bg-astral-gold px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-void-950 shadow-astral-glow transition hover:brightness-110"
      >
        {t('app.downloadBannerCta')}
      </Link>
      <button
        onClick={handleDismiss}
        aria-label={t('app.downloadBannerClose')}
        className="shrink-0 rounded-full p-1 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}
