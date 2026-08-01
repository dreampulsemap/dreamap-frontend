import { useEffect, useRef } from 'react'

// Modal'lar için ortak erişilebilirlik + gezinme davranışı:
//  - açılınca modal içindeki ilk odaklanabilir elemana focus verir
//  - Escape ile kapatır
//  - Tab/Shift+Tab focus'u modal dışına kaçırmaz (focus trap)
//  - fiziksel/tarayıcı GERİ tuşuna basınca sayfadan çıkmak yerine modal'ı kapatır
// Önceden CreateGoalModal/GoalDetailModal gibi hiçbir modal'da bunlardan
// hiçbiri yoktu — klavye/ekran okuyucu kullanıcılar için modal'lar
// pratikte kullanılamazdı (Tab ile arkadaki sayfaya kaçılıyordu), ve
// mobilde GERİ tuşuna basınca modal kapanmak yerine sayfa geçmişinde
// beklenenden çok daha geriye gidiliyordu.
export function useModalA11y(containerRef, onClose) {
  const lastFocused = useRef(null)
  // onClose her render'da yeni bir fonksiyon referansı olabilir (ör. inline
  // arrow function); bunu dependency olarak kullanırsak efekt her render'da
  // yeniden çalışıp history'e tekrar tekrar girdi eklerdi. Bunun yerine en
  // güncel onClose'u bir ref'te tutuyoruz, efekt yalnızca mount/unmount'ta çalışıyor.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    lastFocused.current = document.activeElement

    const node = containerRef.current
    const focusable = node?.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
    focusable?.[0]?.focus()

    // Sahte bir geçmiş girdisi ekle: fiziksel GERİ tuşu artık önce bunu
    // "tüketir" (popstate), biz de modal'ı kapatırız — kullanıcı sayfadan
    // hiç ayrılmamış, aynı scroll konumunda kalmış olur.
    window.history.pushState({ modalOpen: true }, '')
    let closedByPopState = false

    function handlePopState() {
      closedByPopState = true
      onCloseRef.current?.()
    }
    window.addEventListener('popstate', handlePopState)

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onCloseRef.current?.()
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
      window.removeEventListener('popstate', handlePopState)
      // Modal, GERİ tuşuyla DEĞİL de bir UI aksiyonuyla (X, arka plana
      // tıklama, Escape) kapatıldıysa, açılışta eklediğimiz sahte girdiyi
      // de temizleyelim — yoksa kullanıcı asıl sayfadan çıkmak için GERİ'ye
      // bir kez daha (boşuna) basmak zorunda kalır.
      if (!closedByPopState) {
        window.history.back()
      }
      // Modal kapanınca odağı, modal açılmadan önce neredeyse oraya geri ver
      lastFocused.current?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef])
}
