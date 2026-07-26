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

      let subscription = await reg.pushManager.getSubscription()
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        })
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return false

      await fetch('/api/push/subscribe', {
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
