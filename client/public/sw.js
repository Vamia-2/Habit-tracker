// Debug logging that works via postMessage to clients
const debugLog = (msg) => {
  console.log(msg)
  // Also try to notify main thread via postMessage
  self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
    clients.forEach(client => {
      try {
        client.postMessage({ type: 'sw_log', msg })
      } catch (e) {
        // Client might be closed, continue
      }
    })
  }).catch(e => console.error("Error notifying clients:", e))
}

// Try to store logs in localStorage as fallback
const storeLog = (msg) => {
  try {
    const logs = JSON.parse(localStorage.getItem('sw_logs') || '[]')
    logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`)
    if (logs.length > 50) logs.shift()
    localStorage.setItem('sw_logs', JSON.stringify(logs))
  } catch (e) {
    // Fail silently - localStorage may not be available in SW context
  }
}

// Log all errors
self.addEventListener('error', (event) => {
  const msg = `❌ [SW] Error: ${event.message || event.error}`
  debugLog(msg)
  storeLog(msg)
})

self.addEventListener('unhandledrejection', (event) => {
  const msg = `❌ [SW] Unhandled rejection: ${event.reason}`
  debugLog(msg)
  storeLog(msg)
})

// Listen for control messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'ping') {
    debugLog(`📬 [SW] Received ping from main thread`)
  }
})

const isMobileDevice = () => {
  const userAgent = self.navigator?.userAgent || ''
  return /Android|iPhone|iPad|iPod|Mobi/i.test(userAgent)
}

// MAIN: Handle push notifications
self.addEventListener("push", function(event) {
  const msg1 = "🔔 [SW] Push event received!"
  debugLog(msg1)
  storeLog(msg1)
  
  const msg2 = `Event data: ${event.data ? 'present' : 'null'}`
  debugLog(msg2)
  storeLog(msg2)
  
  let data = { title: "Habit Tracker", body: "Нове нагадування", url: "/" }

  if (event.data) {
    try {
      data = event.data.json()
      const msg3 = `Parsed JSON: ${JSON.stringify(data).substring(0, 100)}`
      debugLog(msg3)
      storeLog(msg3)
    } catch (e) {
      const msg3 = `Parse error: ${e.message}`
      debugLog(msg3)
      storeLog(msg3)
      try {
        const text = event.data.text()
        data = { title: "Habit Tracker", body: text || "Нове нагадування", url: "/" }
      } catch (e2) {
        data = { title: "Habit Tracker", body: "Нове нагадування", url: "/" }
      }
    }
  }

  const onMobile = isMobileDevice()
  const options = {
    body: data.body,
    icon: "/assets/icon-192.png",
    badge: "/assets/badge-72.png",
    vibrate: onMobile ? [200, 100, 200] : undefined,
    tag: 'habit-reminder', // Required when renotify is true
    renotify: true,
    // Desktop notifications should stay visible until the user interacts.
    // Mobile devices keep the default OS-specific presentation.
    requireInteraction: !onMobile,
    silent: false,
    data: { url: data.url },
    actions: data.actions || [
      { action: "open", title: "Відкрити", icon: "/assets/icon-192.png" }
    ]
  }

  const msg4 = `Showing notification: "${data.title}"`
  debugLog(msg4)
  storeLog(msg4)
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => {
        const msg5 = "✅ [SW] Notification shown successfully!"
        debugLog(msg5)
        storeLog(msg5)
      })
      .catch(e => {
        const msg5 = `❌ [SW] Failed to show notification: ${e.message}`
        debugLog(msg5)
        storeLog(msg5)
      })
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