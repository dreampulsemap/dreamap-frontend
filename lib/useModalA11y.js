import { useEffect, useRef } from 'react'

// Modal'lar için ortak erişilebilirlik davranışı:
//  - açılınca modal içindeki ilk odaklanabilir elemana focus verir
//  - Escape ile kapatır
//  - Tab/Shift+Tab focus'u modal dışına kaçırmaz (focus trap)
// Önceden CreateGoalModal/GoalDetailModal gibi hiçbir modal'da bunlardan
// hiçbiri yoktu — klavye/ekran okuyucu kullanıcılar için modal'lar
// pratikte kullanılamazdı (Tab ile arkadaki sayfaya kaçılıyordu).
export function useModalA11y(containerRef, onClose) {
  const lastFocused = useRef(null)

  useEffect(() => {
    lastFocused.current = document.activeElement

    const node = containerRef.current
    const focusable = node?.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
    focusable?.[0]?.focus()

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose?.()
        return
      }
      if (e.key !== 'Tab' || !node) return

      const items = node.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Modal kapanınca odağı, modal açılmadan önce neredeyse oraya geri ver
      lastFocused.current?.focus?.()
    }
  }, [containerRef, onClose])
}
