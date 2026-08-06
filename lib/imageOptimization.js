/**
 * Image Optimization Utilities
 * Provides standardized props for next/image component
 */

export const IMAGE_SIZES = {
  thumbnail: {
    width: 150,
    height: 150,
    sizes: '(max-width: 768px) 100px, 150px'
  },
  card: {
    width: 400,
    height: 300,
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
  },
  grid: {
    width: 300,
    height: 300,
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
  },
  avatar: {
    width: 48,
    height: 48,
    sizes: '48px'
  },
  hero: {
    width: 1200,
    height: 600,
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 100vw'
  }
}

export function getImageProps(type = 'card', overrides = {}) {
  const base = IMAGE_SIZES[type] || IMAGE_SIZES.card
  return {
    ...base,
    loading: 'lazy',
    // DİKKAT: placeholder='blur' burada KASITLI OLARAK varsayılan DEĞİL.
    // next/image, statik import edilmeyen (bu projedeki HER görsel gibi —
    // Supabase Storage/Pixabay URL'leri) resimlerde placeholder='blur'
    // için elle bir blurDataURL bekler; sağlanmazsa derleme zamanında değil
    // ÇALIŞMA ZAMANINDA hata fırlatır ("missing blurDataURL property").
    // Bulanık placeholder isteniyorsa çağıran taraf kendi blurDataURL'ini
    // (ör. görseli yüklerken küçük bir base64 önizleme üretip) geçmeli.
    ...overrides,
  }
}
