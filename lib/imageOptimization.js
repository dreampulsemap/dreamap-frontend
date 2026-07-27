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
    ...overrides,
    placeholder: 'blur',
    loading: 'lazy'
  }
}
