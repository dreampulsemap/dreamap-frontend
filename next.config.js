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
    ],
  },
}

module.exports = nextConfig
