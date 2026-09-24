// Web tarafında ürün analitiği yoktu (Mixpanel/Amplitude/PostHog — hiçbiri
// kurulu değildi): kim geliyor, nerede terk ediyor, cohort'lara göre
// retention nasıl bilinmiyordu. PostHog seçildi (cömert ücretsiz katman,
// hem web hem event API'si aynı hesapta).
// NEXT_PUBLIC_POSTHOG_KEY boşsa init hiç çalışmaz — güvenli no-op.
import posthog from 'posthog-js'

let initialized = false

export function initPostHogClient() {
  if (initialized || typeof window === 'undefined') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    // Next.js Pages Router'da sayfa değişimi normal bir navigasyon
    // (yeniden yükleme) DEĞİL — otomatik pageview yakalama bunu
    // göremiyor, route değişimlerini _app.js'ten elle bildiriyoruz.
    capture_pageview: false,
    capture_pageleave: true,
  })
  initialized = true
}

export function capturePageview(url) {
  if (!initialized) return
  posthog.capture('$pageview', { $current_url: url })
}

export { posthog }
