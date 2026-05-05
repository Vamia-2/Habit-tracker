import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import api from "../api"
import { useTheme } from "../ThemeContext"

export default function VerifyEmail(){
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState("loading") // loading | success | error
  const [message, setMessage] = useState("")
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const token = searchParams.get("token")

    if (!token) {
      setStatus("error")
      setMessage("Токен підтвердження відсутній")
      return
    }

    api.get(`/verify-email/${token}`)
      .then(res => {
        setStatus("success")
        setMessage(res.data?.message || "Email успішно підтверджено!")
      })
      .catch(e => {
        setStatus("error")
        setMessage(e.response?.data || "Помилка підтвердження email")
      })
  }, [searchParams])

  return (
    <div className={`auth-page ${theme}`}>
      <div className="auth-container">
        <div className="auth-header">
          <h1>🎯 Habit Tracker</h1>
        </div>

        <div className="auth-form" style={{ textAlign: "center" }}>
          {status === "loading" && (
            <>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
              <p>Перевірка посилання...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h2 style={{ marginBottom: 12 }}>Готово!</h2>
              <p style={{ color: "#64748b", marginBottom: 24 }}>{message}</p>
              <a href="/login" className="btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
                Увійти
              </a>
            </>
          )}

          {status === "error" && (
            <>
              <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
              <h2 style={{ marginBottom: 12 }}>Помилка</h2>
              <p style={{ color: "#64748b", marginBottom: 24 }}>{message}</p>
              <a href="/register" style={{ color: "#6366f1" }}>Зареєструватися знову</a>
            </>
          )}
        </div>

        <button className="theme-toggle" onClick={toggleTheme} title="Змінити тему">
          {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🎨"}
        </button>
      </div>
    </div>
  )
}
