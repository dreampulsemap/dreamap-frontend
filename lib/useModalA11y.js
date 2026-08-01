import { useEffect, useRef } from 'react'

// Modal'lar için ortak erişilebilirlik + gezinme davranışı:
//  - açılınca modal içindeki ilk odaklanabilir elemana focus verir
//  - Escape ile kapatır
//  - Tab/Shift+Tab focus'u modal dışına kaçırmaz (focus trap)
//  - fiziksel/tarayıcı GERİ tuşuna basınca sayfadan çıkmak yerine modal'ı kapatır
//
// İÇ İÇE MODAL DÜZELTMESİ (KÖK NEDEN): Önceki sürümde her modal ÖRNEĞİ kendi
// pushState/history.back() çağrısını yapıyordu. İki modal iç içe açıldığında
// (ör. Vizyon Ekle modalı üstünde Pixabay seçici) tarayıcı geçmişi TEK
// paylaşılan bir yığın olduğundan şu oluyordu: Pixabay seçici bir görsel
// seçilince UI aksiyonuyla (onClose çağrısıyla) kapanıyor, cleanup'ı kendi
// eklediği girdiyi temizlemek için history.back() çağırıyor — bu da bir
// popstate olayı doğuruyor, ve DIŞTAKİ modalın (Vizyon Ekle) hâlâ takılı
// olan popstate dinleyicisi bunu "kullanıcı GERİ'ye bastı" sanıp KENDİSİNİ
// de kapatıyordu. Sonuç: Pixabay'den fotoğraf seçince kullanıcı tüm Vizyon
// Ekle modalından dışarı atılıyordu.
//
// ÇÖZÜM: Tüm modal örnekleri arasında TEK paylaşılan bir yığın + TEK global
// popstate dinleyicisi kullanıyoruz. Yığın boşken açılan İLK (en dıştaki)
// modal gerçek bir history girdisi ekler; ardından iç içe açılan modaller
// aynı girdiyi paylaşır, yeni girdi eklemezler. GERİ tuşu yalnızca en
// üstteki (en son açılan) modalı kapatır — Escape de aynı mantıkla yalnızca
// en üstteki modala etki eder. Bir modal GERİ dışında bir yolla (X, arka
// plana tıklama, Escape, işlem tamamlanması) kapanırsa yığından çıkarılır;
// paylaşılan history girdisi yalnızca yığın tamamen boşaldığında (son modal
// da kapandığında) temizlenir.
const modalStack = []
let popStateAttached = false

function handleGlobalPopState() {
  const top = modalStack[modalStack.length - 1]
  if (!top) return
  top.closedByPopState = true
  modalStack.pop()
  top.onCloseRef.current?.()
}

function attachPopStateListener() {
  if (popStateAttached) return
  window.addEventListener('popstate', handleGlobalPopState)
  popStateAttached = true
}

function detachPopStateListenerIfIdle() {
  if (popStateAttached && modalStack.length === 0) {
    window.removeEventListener('popstate', handleGlobalPopState)
    popStateAttached = false
  }
}

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

    // Bu modal örneği için paylaşılan yığına bir girdi ekle. Yığın önceden
    // boşsa (bu en dıştaki/ilk modal ise) gerçek bir history girdisi
    // pushla; iç içe açılan modaller mevcut girdiyi paylaşır.
    const entry = { onCloseRef, closedByPopState: false }
    const wasEmpty = modalStack.length === 0
    modalStack.push(entry)
    if (wasEmpty) {
      window.history.pushState({ modalOpen: true }, '')
    }
    attachPopStateListener()

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        // Yalnızca en üstteki (en son açılan) modal Escape'e tepki versin —
        // yoksa iç içe modallerde (ör. Pixabay seçici üstteyken) Escape
        // ikisini birden kapatırdı.
        if (modalStack[modalStack.length - 1] !== entry) return
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

      const idx = modalStack.indexOf(entry)
      if (idx !== -1) modalStack.splice(idx, 1)

      // Modal, GERİ tuşuyla DEĞİL de bir UI aksiyonuyla (X, arka plana
      // tıklama, Escape, işlem tamamlanması) kapatıldıysa VE artık yığında
      // açık modal kalmadıysa, paylaşılan sahte history girdisini
      // temizleyelim — yoksa kullanıcı asıl sayfadan çıkmak için GERİ'ye
      // bir kez daha (boşuna) basmak zorunda kalır. Yığında hâlâ başka
      // modal(ler) açıksa dokunmuyoruz; paylaşılan girdi onlara ait.
      if (!entry.closedByPopState && modalStack.length === 0) {
        window.history.back()
      }
      detachPopStateListenerIfIdle()

      // Modal kapanınca odağı, modal açılmadan önce neredeyse oraya geri ver
      lastFocused.current?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef])
}
