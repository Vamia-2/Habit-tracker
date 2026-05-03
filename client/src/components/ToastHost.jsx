import { useEffect, useRef, useState } from "react"

export const APP_TOAST_EVENT = "app:toast"

export const showToast = (message, type = "info", duration = 3200) => {
  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent(APP_TOAST_EVENT, {
      detail: {
        message: String(message ?? ""),
        type,
        duration: Number(duration) > 0 ? Number(duration) : 3200,
      },
    })
  )
}

export default function ToastHost() {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  useEffect(() => {
    const onToast = (event) => {
      const { message, type = "info", duration = 3200 } = event.detail || {}
      if (!message) return

      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      setToasts((prev) => [...prev, { id, message, type }])

      const timerId = window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
        timersRef.current.delete(id)
      }, duration)

      timersRef.current.set(id, timerId)
    }

    window.addEventListener(APP_TOAST_EVENT, onToast)

    return () => {
      window.removeEventListener(APP_TOAST_EVENT, onToast)
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId))
      timersRef.current.clear()
    }
  }, [])

  if (!toasts.length) return null

  return (
    <div className="toast-root" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`app-toast ${toast.type}`} role="status">
          {toast.message}
        </div>
      ))}
    </div>
  )
}