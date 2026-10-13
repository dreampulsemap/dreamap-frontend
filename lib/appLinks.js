// "Uygulamayı indir" bağlantılarının tek kaynağı (Navbar, indirme şeridi, /app).
// Android ve masaüstü → doğrudan Play Store (masaüstünden de telefona uzaktan
// kurulabiliyor). iOS → /app: iPhone sürümü henüz yok, Play Store linki orada
// çıkmaz sokak olur; /app dürüstçe anlatıp "Ana Ekrana Ekle" yolunu gösteriyor.
import { useEffect, useState } from 'react'
import { captureEvent } from '@/lib/posthog-client'

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=io.lunosfer.dreamap'

// Play Console > Edinme raporları, mağaza sayfası URL'sindeki utm_* parametrelerini
// okuyor — hangi butonun kurulum getirdiği orada görünür.
export function playStoreUrl(placement = 'web') {
  const params = new URLSearchParams({ utm_source: 'lunosfer_web', utm_medium: placement, utm_campaign: 'get_app' })
  return `${PLAY_STORE_URL}&${params.toString()}`
}

export function detectPlatform() {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent || ''
  if (/Android/i.test(ua)) return 'android'
  // iPadOS 13+ kendini masaüstü Safari (MacIntel) gibi tanıtıyor; dokunmatik noktadan ayırt ediliyor.
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'
  return 'other'
}

// SSR'da her zaman 'other' (→ Play Store linki); gerçek platform mount'tan sonra
// belirleniyor, böylece hydration uyuşmazlığı oluşmuyor.
export function useAppPlatform() {
  const [platform, setPlatform] = useState('other')
  useEffect(() => { setPlatform(detectPlatform()) }, [])
  return platform
}

export function appLinkFor(platform, placement) {
  if (platform === 'ios') return { href: '/app', external: false }
  return { href: playStoreUrl(placement), external: true }
}

export function trackGetApp(placement, platform) {
  captureEvent('get_app_click', { placement, platform })
}
