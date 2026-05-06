import { useEffect, useState } from "react"
import api from "../api"

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

const withTimeout = (promise, label, timeoutMs = 12000) => {
  let timerId

  const timeoutPromise = new Promise((_, reject) => {
    timerId = window.setTimeout(() => {
      reject(new Error(label))
    }, timeoutMs)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    window.clearTimeout(timerId)
  })
}

const waitForServiceWorkerActivation = (registration, timeoutMs = 12000) => {
  if (registration?.active) {
    return Promise.resolve(registration)
  }

  return withTimeout(
    new Promise((resolve, reject) => {
      const sw = registration?.installing || registration?.waiting
      if (!sw) {
        reject(new Error("Service Worker не активувався"))
        return
      }

      const onStateChange = () => {
        if (sw.state === "activated") {
          sw.removeEventListener("statechange", onStateChange)
          resolve(registration)
        }
      }

      sw.addEventListener("statechange", onStateChange)
    }),
    "Service Worker не активувався вчасно.",
    timeoutMs
  )
}

const ensureSwMessageListener = () => {
  if (typeof window === "undefined" || !navigator?.serviceWorker) return
  if (window.swMessageListener) return

  window.swMessageListener = true
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "sw_log") {
      console.debug("📋 [From SW]", event.data.msg)
    }
    if (event.data?.type === "sw_push") {
      console.info("📋 [From SW] push:", event.data.payload)
    }
  })

  // BroadcastChannel fallback
  try {
    const bc = new BroadcastChannel('habit-tracker-sw')
    bc.addEventListener('message', (ev) => {
      if (ev?.data?.type === 'sw_log') console.debug('📋 [From SW BC]', ev.data.msg)
      if (ev?.data?.type === 'sw_push') console.info('📋 [From SW BC] push:', ev.data.payload)
    })
  } catch (e) {
    // Ignore
  }
}

const pingServiceWorker = async (registration) => {
  const active = registration?.active
  if (!active) {
    console.warn("⚠️ No active Service Worker for ping")
    return false
  }

  return withTimeout(
    new Promise((resolve) => {
      const channel = new MessageChannel()
      channel.port1.onmessage = (event) => {
        const ok = event?.data?.type === "pong"
        console.log(ok ? "✅ SW ping/pong works" : "⚠️ SW responded unexpectedly", event?.data)
        resolve(ok)
      }
      active.postMessage({ type: "ping" }, [channel.port2])
    }),
    "SW ping timeout",
    5000
  ).catch((e) => {
    console.warn("⚠️ SW ping failed:", e.message)
    return false
  })
}

const getFriendlyPushError = (error) => {
  const raw = String(error?.message || error || "")
  const message = raw.toLowerCase()

  if (message.includes("incognito")) {
    return "Push-сповіщення не працюють у режимі інкогніто. Відкрийте звичайне вікно браузера."
  }

  if (message.includes("permission denied") || message.includes("denied")) {
    return "Браузер заборонив push-сповіщення. Дозвольте сповіщення для цього сайту в налаштуваннях браузера або відкрийте сайт у звичайному (не інкогніто) вікні."
  }

  if (message.includes("no active service worker")) {
    return "Service Worker ще не готовий. Оновіть сторінку і спробуйте увімкнути нагадування ще раз."
  }

  return "Не вдалося підписатися на push-нагадування"
}

export const subscribeToPushNotifications = async () => {
  console.log("🔔 subscribeToPushNotifications started")
  if (typeof window === "undefined" || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.error("❌ Push not supported:", { hasWindow: typeof window !== "undefined", hasServiceWorker: 'serviceWorker' in navigator, hasPushManager: 'PushManager' in window })
    alert("Push-сповіщення не підтримуються у цьому браузері.")
    return false
  }

  if (typeof Notification !== "undefined" && Notification.permission === "denied") {
    console.warn("⚠️ Notifications denied")
    alert("Push-сповіщення заблоковані у браузері. Дозвольте їх у налаштуваннях сайту.")
    return false
  }

  try {
    console.log("🔔 Checking notification permission:", Notification.permission)
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      console.log("🔔 Requesting notification permission...")
      const permission = await withTimeout(
        Notification.requestPermission(),
        "Запит дозволу на сповіщення завис. Спробуйте ще раз.",
        10000
      )
      console.log("🔔 Permission response:", permission)
      if (permission !== "granted") {
        alert("Без дозволу на сповіщення push-нагадування не працюватимуть.")
        return false
      }
    }

    console.log("🔔 Getting push public key...")
    const keyRes = await withTimeout(
      api.get("/push-public-key"),
      "Не вдалося отримати push-ключ. Перевірте сервер.",
      10000
    )
    console.log("🔔 Got public key:", keyRes.data.publicKey?.substring(0, 20) + "...")

    console.log("🔔 Registering Service Worker at /sw.js...")
    const reg = await withTimeout(
      navigator.serviceWorker.register(`/sw.js?v=${Date.now()}`),
      "Service worker не відповів вчасно.",
      12000
    )
    console.log("🔔 Service Worker registered:", reg.scope)
    console.log("🔔 Service Worker state:", reg.active?.state || reg.installing?.state || "unknown")
    ensureSwMessageListener()

    // Ensure service worker is active before calling PushManager.subscribe.
    console.log("🔔 Waiting for Service Worker ready...")
    const readyReg = await withTimeout(
      navigator.serviceWorker.ready,
      "Service Worker не готовий до push-підписки.",
      12000
    )
    console.log("🔔 Service Worker ready")
    await waitForServiceWorkerActivation(readyReg)
    console.log("🔔 Service Worker active")
    await pingServiceWorker(readyReg)

    // don't show local SW notification test in production flow; rely on push test

    const requestSubscription = async () => {
      console.log("🔔 Requesting push subscription...")
      const current = await readyReg.pushManager.getSubscription()
      console.log("🔔 Current subscription:", current ? "exists" : "none")
      if (current) {
        try {
          await current.unsubscribe()
          console.log("🔔 Unsubscribed from old subscription")
        } catch (e) {
          console.warn("⚠️ Unsubscribe failed:", e.message)
          // Continue with fresh subscribe even if unsubscribe fails.
        }
      }

      console.log("🔔 Subscribing to push with VAPID key...")
      const subscription = await withTimeout(
        readyReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyRes.data.publicKey)
        }),
        "Підписка на push зависла. Спробуйте ще раз.",
        12000
      )
      console.log("🔔 Push subscription created:", subscription.endpoint.substring(0, 50) + "...")
      return subscription
    }

    console.log("🔔 Checking existing subscription...")
    let sub = await withTimeout(
      readyReg.pushManager.getSubscription(),
      "Не вдалося отримати поточну push-підписку.",
      10000
    )
    console.log("🔔 Existing subscription:", sub ? "found" : "none")

    if (!sub) {
      sub = await requestSubscription()
    }

    const sendTestPush = async (subscription) => {
      console.log("🔔 Saving subscription on server...")
      await withTimeout(
        api.post("/subscribe", subscription),
        "Не вдалося зберегти push-підписку на сервері.",
        10000
      )
      console.log("🔔 Subscription saved successfully")
      
      console.log("🔔 Sending test push notification...")
      await withTimeout(
        api.post("/push/send", {
        title: "✅ Push увімкнено",
        body: "Тестове сповіщення доставлено успішно",
        skipOverlay: true
        }),
        "Тестове push-сповіщення не дійшло вчасно.",
        12000
      )
      console.log("🔔 Test push sent successfully")
    }

    try {
      await sendTestPush(sub)
    } catch {
      // Refresh potentially stale subscription (e.g., after browser/VAPID changes) and retry once.
      sub = await requestSubscription()

      try {
        await sendTestPush(sub)
      } catch (retryError) {
        const message = retryError?.response?.data || "Push підписка є, але тестове сповіщення не доставляється"
        alert(message)
        return false
      }
    }

    return true
  } catch (e) {
    console.error(e)
    alert(getFriendlyPushError(e))
    return false
  }
}

export default function PushSettings({ onSubscribed }){
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isWorking, setIsWorking] = useState(false)

  useEffect(() => {
    const checkSubscription = async () => {
      if (typeof window === "undefined" || !('serviceWorker' in navigator) || !('PushManager' in window)) return
      try {
        // Unregister old service workers first to clear cache
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (let reg of registrations) {
          await reg.unregister()
          console.log("🔄 Unregistered old Service Worker")
        }
        
        // Register with cache busting - add timestamp to force fresh load
        const swUrl = `/sw.js?v=${Date.now()}`
        console.log("📥 Registering Service Worker from:", swUrl)
        const reg = await navigator.serviceWorker.register(swUrl, { updateViaCache: 'none' })
        
        // Force update check immediately
        reg.update().catch(e => console.error("Update check failed:", e))
        
        // Listen for messages from Service Worker
        ensureSwMessageListener()
        
        const sub = await reg.pushManager.getSubscription()
        setIsSubscribed(Boolean(sub))
      } catch {
        setIsSubscribed(false)
      }
    }

    checkSubscription()
  }, [])

  const subscribe = async ()=>{
    if (isWorking) return
    setIsWorking(true)
    try {
      // Test 1: Simple browser notification (no Service Worker needed)
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        console.log("📢 Testing simple browser notification (no SW)...")
        alert("🧪 About to test direct notification - watch for popup!")
        new Notification('🧪 Test Notification', {
          body: 'This is a direct notification WITHOUT Service Worker',
          icon: '/assets/icon-192.png'
        })
        console.log("📢 Test notification shown!")
        alert("✅ Direct notification test completed!")
      } else {
        alert(`⚠️ Notification permission: ${Notification.permission}`)
      }

      // Test 2: Full push setup
      console.log("🔄 Starting full push setup...")
      const ok = await subscribeToPushNotifications()
      console.log("🔄 Push setup result:", ok)
      if (ok) {
        setIsSubscribed(true)
        onSubscribed?.()
        alert("✅ Push нагадування увімкнено")
      } else {
        alert("❌ Push setup failed - check console for details")
      }
    } catch (err) {
      console.error("❌ Error:", err)
      alert(`❌ Error: ${err.message}`)
    } finally {
      setIsWorking(false)
    }
  }

  return(
    <button className="btn-secondary" onClick={subscribe} disabled={isWorking}>
      {isWorking ? "⏳ Підключення..." : isSubscribed ? "✅ Увімкнено" : "🔔 Нагадування"}
    </button>
  )
}