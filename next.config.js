const { withSentryConfig } = require('@sentry/nextjs/config')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // ÖNEMLİ: Bu liste önceden yalnızca pollinations.ai + tek bir Supabase
    // proje domaini içeriyordu. Ama pages/api/generate-dream-image.js'e
    // bakınca gerçek görsel kaynaklarının Replicate (Flux) ve OpenAI
    // (DALL-E, fallback) olduğunu gördüm — ikisi de whitelist'te yoktu.
    // Bu, next/image kullanılan yerlerde (globe.js, profile.js, auth.js)
    // AI-üretilmiş görsellerin muhtemelen hiç yüklenmediği/hata verdiği
    // anlamına geliyor. Ekliyorum.
    domains: ['image.pollinations.ai', 'hhtoezrhvipiketlelqh.supabase.co'],
    remotePatterns: [
      { protocol: 'https', hostname: 'replicate.delivery' },
      { protocol: 'https', hostname: '*.blob.core.windows.net' }, // DALL-E (Azure)
      { protocol: 'https', hostname: '*.supabase.co' }, // farklı Supabase projeleri/storage için genel
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' }, // AI Gateway (Vercel) çıktı depolama — whitelist'te yoktu, next/image tüm bu görselleri 400 ile reddediyordu
    ],
  },
}

// withSentryConfig otomatik olarak TÜM pages/api/*.js route'larını
// (60+ dosya, tek tek dokunmadan) ve getServerSideProps'u sarmalayıp
// unhandled hataları Sentry'ye gönderiyor. SENTRY_ORG/SENTRY_PROJECT env
// var'ları tanımlı değilse (henüz DSN kurulmadıysa) source-map yükleme
// adımı sessizce atlanır — build asla bu yüzden kırılmaz.
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: false,
  disableLogger: true,
  automaticVercelMonitors: false,
})
