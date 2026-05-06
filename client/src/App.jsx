import { useEffect, useState } from "react"
import api from "./api"
import { BrowserRouter,Routes,Route } from "react-router-dom"

import Login from "./pages/Login.jsx"
import Register from "./pages/Register.jsx"
import VerifyEmail from "./pages/VerifyEmail.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import Admin from "./pages/Admin.jsx"
import Complaint from "./pages/Complaint.jsx"
import Achievements from "./pages/Achievements.jsx"
import PublicAchievements from "./pages/PublicAchievements.jsx"
import Cycles from "./pages/Cycles.jsx"
import ToastHost from "./components/ToastHost.jsx"

export default function App(){
  const [pushOverlay, setPushOverlay] = useState(null)

  useEffect(() => {
    if (typeof window === "undefined" || !navigator?.serviceWorker) return

    const onMessage = (event) => {
      if (event?.data?.type !== "sw_push") return

      const payload = event.data.payload || {}
      setPushOverlay({
        title: payload.title || "🔔 Нагадування",
        body: payload.body || "Нове нагадування",
        url: payload.url || "/"
      })
    }

    navigator.serviceWorker.addEventListener("message", onMessage)

    // Also listen via BroadcastChannel as a fallback
    let bc
    try {
      bc = new BroadcastChannel('habit-tracker-sw')
      bc.addEventListener('message', (ev) => {
        if (ev?.data?.type === 'sw_push') onMessage({ data: ev.data })
      })
    } catch (e) {
      bc = null
    }

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage)
      try { bc?.close() } catch (e) {}
    }
  }, [])

  const closeOverlay = () => setPushOverlay(null)

  const disableHabit = async (habitId) => {
    if (!habitId) {
      closeOverlay()
      return
    }
    try {
      await api.put(`/habits/${habitId}`, { reminder: false })
      closeOverlay()
      alert('Нагадування вимкнено')
    } catch (e) {
      console.error('Snooze/disable error', e)
      alert('Не вдалося вимкнути нагадування')
    }
  }

  const snoozeHabit = async (habitId, minutes = 10) => {
    if (!habitId) {
      closeOverlay()
      return
    }
    try {
      await api.post(`/habits/${habitId}/snooze`, { minutes })
      closeOverlay()
      alert(`Нагадування відкладено на ${minutes} хв.`)
    } catch (e) {
      console.error('Snooze error', e)
      alert('Не вдалося відкласти нагадування')
    }
  }

  return(
    <BrowserRouter>
      <ToastHost/>
      {pushOverlay && (
        <div className="push-overlay" role="alertdialog" aria-live="assertive" aria-label="Нагадування">
          <div className="push-overlay-card">
            <h2>{pushOverlay.title}</h2>
            <p>{pushOverlay.body}</p>
            <div className="push-overlay-actions">
              <button
                className="btn-primary"
                onClick={() => disableHabit(pushOverlay.habitId)}
              >
                Вимкнути
              </button>
              <button className="btn-secondary" onClick={() => snoozeHabit(pushOverlay.habitId, 10)}>
                Відкласти на 10 хв
              </button>
            </div>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Dashboard/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/register" element={<Register/>}/>
        <Route path="/verify-email" element={<VerifyEmail/>}/>
        <Route path="/admin" element={<Admin/>}/>
        <Route path="/complaint" element={<Complaint/>}/>
        <Route path="/achievements" element={<Achievements/>}/>
        <Route path="/public-achievements" element={<PublicAchievements/>}/>
        <Route path="/cycles" element={<Cycles/>}/>
      </Routes>
    </BrowserRouter>
  )
}