// Service Worker for push notifications - Simplified & Reliable

// Minimal logging flag (set to true while debugging)
const ENABLE_SW_LOGS = false

// BroadcastChannel for robust cross-context messaging (works when postMessage may not)
let bc
try {
  bc = new BroadcastChannel('habit-tracker-sw')
} catch (e) {
  bc = null
}

const postToClients = (payload) => {
  // Send via postMessage to controlled pages
  self.clients
    .matchAll({ includeUncontrolled: true, type: "window" })
    .then((clientsList) => {
      for (const client of clientsList) {
        try { client.postMessage(payload) } catch (e) {}
      }
    })
    .catch(() => {})

  // Also broadcast via BroadcastChannel for other contexts
  try {
    bc?.postMessage(payload)
  } catch (e) {}
}

const log = (msg) => {
  if (ENABLE_SW_LOGS) console.log(msg)
  // surface logs to clients when debugging enabled
  if (ENABLE_SW_LOGS) postToClients({ type: 'sw_log', msg })
}

const isMobileDevice = () => {
  const ua = self.navigator?.userAgent || ''
  return /Android|iPhone|iPad|iPod|Mobi/i.test(ua)
}

// ============================================================
// INSTALL - Set up immediately
// ============================================================
self.addEventListener('install', (event) => {
  if (ENABLE_SW_LOGS) log('[SW] Installing Service Worker')
  self.skipWaiting()
})

// ============================================================
// ACTIVATE - Take control immediately
// ============================================================
self.addEventListener('activate', (event) => {
  if (ENABLE_SW_LOGS) log('[SW] Activating Service Worker')
  event.waitUntil(clients.claim())
})

// ============================================================
// PUSH - Handle notifications
// ============================================================
self.addEventListener('push', (event) => {
  if (ENABLE_SW_LOGS) log('🔔 [SW] PUSH EVENT RECEIVED!')
  
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

  // In-app fallback: broadcast push payload so the page can render a full-screen reminder.
  postToClients({
    type: "sw_push",
    payload: {
      title: data.title || "🔔 Habit Tracker",
      body: data.body || "Нове нагадування",
      url: data.url || "/"
    }
  })

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

  if (ENABLE_SW_LOGS) log(`[SW] Showing notification: "${data.title}"`)
  
  event.waitUntil(
    self.registration
      .showNotification(data.title || '🔔 Habit Tracker', options)
      .catch(() => {
        // ignore; notification may be suppressed by OS/browser
      })
  )
})

// ============================================================
// NOTIFICATION CLICK - Handle user interaction
// ============================================================
self.addEventListener('notificationclick', (event) => {
  if (ENABLE_SW_LOGS) log(`[SW] Notification clicked: ${event.action}`)
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