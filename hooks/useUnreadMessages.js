import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const POLL_INTERVAL_MS = 20000

// Okunmamış mesaj sayısını uygulama genelinde tek yerden takip eder.
// Navbar (masaüstü) ve BottomNav (mobil) aynı sayıyı Mesaj ikonunun
// üzerinde rozet olarak gösterir.
//
// Neden bildirim zilinden AYRI: sosyal uygulamalarda (WhatsApp, Instagram,
// Messenger) "biri sana özel mesaj attı" sinyali her zaman kendi ikonunda,
// somut bir sayıyla gösterilir — genel aktivite zilinden ayrı tutulur.
// Bunun iki nedeni var:
//   1) Hedef-gradyan etkisi: kullanıcı rozeti gördüğünde tam olarak nereye
//      dokunması gerektiğini bilir (bell → karışık liste, mesaj ikonu →
//      doğrudan gelen kutusu). Eylemle rozet aynı yerde olunca kapatma
//      isteği (Zeigarnik etkisi) çok daha güçlü çalışır.
//   2) Aynı bilgiyi iki ikonda tekrar etmek bildirim yorgunluğu yaratır ve
//      zamanla kullanıcı rozetleri görmezden gelmeye başlar — bu da uzun
//      vadede TÜM rozetlerin etkisini azaltır.
//
// Poll + custom event kombinasyonu kullanılıyor: poll (20sn) arka planda
// tazeliği korur, 'messages-read-updated' event'i ise kullanıcı bir
// sohbeti açıp okuduğu anda rozetin poll beklemeden anında düşmesini
// sağlar (aksi halde rozet "yalan söylüyormuş" gibi hissettirir ve güveni
// zedeler).
export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setUnreadCount(0); return }
      const res = await fetch('/api/messages/unread-count', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const json = await res.json()
      if (res.ok) setUnreadCount(json.unreadCount || 0)
    } catch (err) {
      // sessizce yut: rozet en kötü ihtimalle bir sonraki poll'da güncellenir
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, POLL_INTERVAL_MS)
    window.addEventListener('messages-read-updated', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('messages-read-updated', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [refresh])

  return { unreadCount, refresh }
}
