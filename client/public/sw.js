// Service Worker for push notifications - Simplified & Reliable

const log = (msg) => {
  console.log(msg)
  self.clients
    .matchAll({ includeUncontrolled: true, type: "window" })
    .then((clientsList) => {
      for (const client of clientsList) {
        client.postMessage({ type: "sw_log", msg })
      }
    })
    .catch(() => {
      // Ignore logging transport errors; console logging is enough.
    })
}

const isMobileDevice = () => {
  const ua = self.navigator?.userAgent || ''
  return /Android|iPhone|iPad|iPod|Mobi/i.test(ua)
}

// ============================================================
// INSTALL - Set up immediately
// ============================================================
self.addEventListener('install', (event) => {
  log('[SW] Installing Service Worker')
  self.skipWaiting()
})

// ============================================================
// ACTIVATE - Take control immediately
// ============================================================
self.addEventListener('activate', (event) => {
  log('[SW] Activating Service Worker')
  event.waitUntil(clients.claim())
})

// ============================================================
// PUSH - Handle notifications
// ============================================================
self.addEventListener('push', (event) => {
  log('🔔 [SW] PUSH EVENT RECEIVED!')
  
  let data = {
    title: '🔔 Habit Tracker',
    body: 'Нове нагадування',
    url: '/'
  }

  // Try to parse JSON from push
  if (event.data) {
    try {
      data = event.data.json()
      log(`[SW] Parsed push data: ${JSON.stringify(data).substring(0, 150)}`)
    } catch (e) {
      try {
        const text = event.data.text()
        data.body = text
      } catch (e2) {
        log(`[SW] Could not parse push data`)
      }
    }
  }

  const isMobile = isMobileDevice()
  const options = {
    body: data.body || 'Нове нагадування',
    icon: '/assets/icon-192.png',
    badge: '/assets/badge-72.png',
    tag: 'habit-reminder',
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: isMobile ? [300, 100, 300] : undefined,
    data: { url: data.url || '/' },
    actions: [
      { action: 'complete', title: '✅ Виконано' },
      { action: 'dismiss', title: '✕ Закрити' }
    ]
  }

  log(`[SW] Showing notification: "${data.title}"`)
  
  event.waitUntil(
    self.registration
      .showNotification(data.title || '🔔 Habit Tracker', options)
      .then(() => {
        log('✅ [SW] Notification shown!')
      })
      .catch((err) => {
        log(`❌ [SW] Notification error: ${err.message}`)
        // Fallback: try without actions
        return self.registration.showNotification('🔔 Habit Tracker', {
          body: data.body || 'Нове нагадування',
          tag: 'habit-reminder',
          requireInteraction: true
        })
      })
  )
})

// ============================================================
// NOTIFICATION CLICK - Handle user interaction
// ============================================================
self.addEventListener('notificationclick', (event) => {
  log(`[SW] Notification clicked: ${event.action}`)
  event.notification.close()

  const url = event.notification.data?.url || '/'

  if (event.action === 'dismiss') {
    return
  }

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (let client of windowClients) {
          if (client.url === url || client.url.includes('habit-tracker')) {
            return client.focus()
          }
        }
        return clients.openWindow ? clients.openWindow(url) : null
      })
  )
})

// ============================================================
// NOTIFICATION CLOSE
// ============================================================
self.addEventListener('notificationclose', (event) => {
  log('[SW] Notification closed by user')
})

// ============================================================
// MESSAGE - Communication with main thread
// ============================================================
self.addEventListener('message', (event) => {
  log(`[SW] Message: ${event.data?.type}`)
  if (event.data?.type === 'ping') {
    event.ports[0]?.postMessage({ type: 'pong' })
  }
})

// ============================================================
// ERROR HANDLERS
// ============================================================
self.addEventListener('error', (event) => {
  log(`❌ [SW] Error: ${event.message}`)
})

self.addEventListener('unhandledrejection', (event) => {
  log(`❌ [SW] Unhandled: ${event.reason}`)
})

self.addEventListener('pushsubscriptionchange', (event) => {
  log('[SW] Subscription changed')
})

log('✅ [SW] Service Worker loaded')