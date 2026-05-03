self.addEventListener("push", function(event) {
  let data = { title: "Habit Tracker", body: "Нове нагадування", url: "/" }

  if (event.data) {
    try {
      data = event.data.json()
    } catch {
      data = { title: "Habit Tracker", body: event.data.text() || "Нове нагадування", url: "/" }
    }
  }

  const options = {
    body: data.body,
    icon: "/assets/icon-192.png",
    badge: "/assets/badge-72.png",
    vibrate: [200, 100, 200],
    renotify: true,
    requireInteraction: !!data.requireInteraction,
    data: { url: data.url },
    actions: data.actions || [
      { action: "open", title: "Відкрити", icon: "/assets/icon-192.png" }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

self.addEventListener('pushsubscriptionchange', function(event) {
  // Optionally handle subscription refresh here
})