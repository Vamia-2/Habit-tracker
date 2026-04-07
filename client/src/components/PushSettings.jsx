import { useEffect, useState } from "react"
import axios from "axios"

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

export const subscribeToPushNotifications = async () => {
  if (typeof window === "undefined" || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert("Push-сповіщення не підтримуються у цьому браузері.")
    return false
  }

  try {
    const token = localStorage.getItem("token")
    const keyRes = await axios.get("/api/push-public-key", {
      headers: { Authorization: token }
    })

    const reg = await navigator.serviceWorker.register("/sw.js")
    let sub = await reg.pushManager.getSubscription()

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyRes.data.publicKey)
      })
    }

    await axios.post("/api/subscribe", sub, {
      headers: { Authorization: token }
    })

    return true
  } catch (e) {
    console.error(e)
    alert("Не вдалося підписатися на push-нагадування")
    return false
  }
}

export default function PushSettings({ onSubscribed }){
  const [isSubscribed, setIsSubscribed] = useState(false)

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
    const ok = await subscribeToPushNotifications()
    if (ok) {
      setIsSubscribed(true)
      onSubscribed?.()
      alert("Push нагадування увімкнено")
    }
  }

  return(
    <button className="btn-secondary" onClick={subscribe}>
      {isSubscribed ? "✅ Push увімкнено" : "🔔 Увімкнути push-нагадування"}
    </button>
  )
}