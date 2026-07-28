import { useEffect } from 'react'

export function useEnvironmentalPriming() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsedSeconds = (Date.now() - startTime) / 1000

      // 0-180 saniye (3 dakika) arasında yumuşak transilasyon
      const factor = Math.min(elapsedSeconds / 180, 1)

      const root = document.documentElement

      const bgOpacity = 0.05 + factor * 0.15 // %5'ten %20'ye koyulaşma
      const animSpeed = 100 + factor * 80    // 100sn'den 180sn'ye yavaşlama
      const blurAmount = 44 + factor * 20    // 44px'ten 64px'e odağın derinleşmesi

      root.style.setProperty('--priming-darkness', bgOpacity.toString())
      root.style.setProperty('--priming-star-speed', `${animSpeed}s`)
      root.style.setProperty('--priming-blur', `${blurAmount}px`)
    }, 2000)

    return () => clearInterval(interval)
  }, [])
}
