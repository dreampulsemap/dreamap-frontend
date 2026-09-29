const { withSentryConfig } = require('@sentry/nextjs/config')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // ÖNEMLİ: next/image kullanılan yerlerde (globe.js, profile.js, auth.js)
    // AI-üretilmiş görsellerin gerçek kaynakları Replicate (Flux) ve OpenAI
    // (DALL-E, fallback), pollinations.ai ve Supabase storage. `domains` alanı
    // deprecated olduğu için (Coolify build logunda uyarı basıyordu) hepsi
    // remotePatterns'e taşındı.
    remotePatterns: [
      { protocol: 'https', hostname: 'image.pollinations.ai' },
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
