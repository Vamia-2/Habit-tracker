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
  if (typeof window === "undefined" || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert("Push-сповіщення не підтримуються у цьому браузері.")
    return false
  }

  if (typeof Notification !== "undefined" && Notification.permission === "denied") {
    alert("Push-сповіщення заблоковані у браузері. Дозвольте їх у налаштуваннях сайту.")
    return false
  }

  try {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      const permission = await withTimeout(
        Notification.requestPermission(),
        "Запит дозволу на сповіщення завис. Спробуйте ще раз.",
        10000
      )
      if (permission !== "granted") {
        alert("Без дозволу на сповіщення push-нагадування не працюватимуть.")
        return false
      }
    }

    const keyRes = await withTimeout(
      api.get("/push-public-key"),
      "Не вдалося отримати push-ключ. Перевірте сервер.",
      10000
    )

    const reg = await withTimeout(
      navigator.serviceWorker.register("/sw.js"),
      "Service worker не відповів вчасно.",
      12000
    )

    // Ensure service worker is active before calling PushManager.subscribe.
    const readyReg = await withTimeout(
      navigator.serviceWorker.ready,
      "Service Worker не готовий до push-підписки.",
      12000
    )
    await waitForServiceWorkerActivation(readyReg)

    const requestSubscription = async () => {
      const current = await readyReg.pushManager.getSubscription()
      if (current) {
        try {
          await current.unsubscribe()
        } catch {
          // Continue with fresh subscribe even if unsubscribe fails.
        }
      }

      return withTimeout(
        readyReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyRes.data.publicKey)
        }),
        "Підписка на push зависла. Спробуйте ще раз.",
        12000
      )
    }

    let sub = await withTimeout(
      readyReg.pushManager.getSubscription(),
      "Не вдалося отримати поточну push-підписку.",
      10000
    )

    if (!sub) {
      sub = await requestSubscription()
    }

    const sendTestPush = async (subscription) => {
      await withTimeout(
        api.post("/subscribe", subscription),
        "Не вдалося зберегти push-підписку на сервері.",
        10000
      )
      await withTimeout(
        api.post("/push/send", {
        title: "✅ Push увімкнено",
        body: "Тестове сповіщення доставлено успішно"
        }),
        "Тестове push-сповіщення не дійшло вчасно.",
        12000
      )
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
        const reg = await navigator.serviceWorker.register("/sw.js")
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
      const ok = await subscribeToPushNotifications()
      if (ok) {
        setIsSubscribed(true)
        onSubscribed?.()
        alert("Push нагадування увімкнено")
      }
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

export const ensurePushNotificationsReady = async () => {
  // Reuse the same flow: it already tests delivery and refreshes stale subscriptions.
  return subscribeToPushNotifications()
}