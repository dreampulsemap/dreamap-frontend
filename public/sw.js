self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload = {}
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Lunosfer', body: event.data.text() }
  }

  const title = payload.title || 'Lunosfer'
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || 'lunosfer-notification',
    data: { url: payload.url || '/' }
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Bildirime tıklandığında: uygulama zaten açık bir sekmede ise onu odakla ve
// ilgili rüyaya yönlendir; değilse yeni bir sekmede doğrudan analiz sayfasını aç.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })

      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) await client.navigate(targetUrl)
          return
        }
      }

      await clients.openWindow(targetUrl)
    })()
  )
})
