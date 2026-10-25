import { useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

// Aboneliğin oluşturulduğu anahtar bilinmiyorsa (eski tarayıcılar
// options.applicationServerKey vermiyor) eşleşiyor say — gereksiz yere
// abonelikten çıkıp izni yeniden istetmeyelim.
function sameKey(subscriptionKey, serverKey) {
  if (!subscriptionKey) return true
  const a = new Uint8Array(subscriptionKey)
  if (a.length !== serverKey.length) return false
  return a.every((byte, i) => byte === serverKey[i])
}

// Servis çalışanını kaydeder ve, izin verilirse, push aboneliğini backend'e kaydeder.
// İdempotenttir: zaten abone/reddedilmişse sessizce hiçbir şey yapmaz.
export function usePushSubscription() {
  const registrationRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        registrationRef.current = reg
      })
      .catch((err) => console.error('service worker kayıt hatası:', err))
  }, [])

  const subscribe = useCallback(async () => {
    if (typeof window === 'undefined') return false
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) return false

    if (Notification.permission === 'denied') return false

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return false
    }

    try {
      const reg = registrationRef.current || (await navigator.serviceWorker.ready)
      const serverKey = urlBase64ToUint8Array(vapidPublicKey)

      let subscription = await reg.pushManager.getSubscription()
      // Tarayıcıda eski bir VAPID anahtarıyla oluşturulmuş abonelik kalmış
      // olabilir: onu backend'e yeniden kaydetmek her gönderimde 401/403
      // demekti (sunucu satırı siliyor, bir sonraki ziyarette aynı ölü
      // abonelik geri geliyordu). Anahtar farklıysa abonelikten çıkıp
      // güncel anahtarla yeniden abone ol.
      if (subscription && !sameKey(subscription.options?.applicationServerKey, serverKey)) {
        await subscription.unsubscribe().catch(() => {})
        subscription = null
      }
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: serverKey
        })
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return false

      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ subscription: subscription.toJSON() })
      })

      return true
    } catch (err) {
      console.error('push abonelik hatası:', err)
      return false
    }
  }, [])

  return { subscribe }
}
