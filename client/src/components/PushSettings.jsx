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

export default function PushSettings(){

  const subscribe = async ()=>{
    if (typeof window === "undefined" || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return alert("Push-сповіщення не підтримуються у цьому браузері.")
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

      alert("Push нагадування увімкнено")
    } catch (e) {
      console.error(e)
      alert("Не вдалося підписатися на push-нагадування")
    }
  }

  return(
    <button className="btn-secondary" onClick={subscribe}>
      Увімкнути push-нагадування
    </button>
  )
}