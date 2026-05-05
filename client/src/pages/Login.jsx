import { useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
import { useTheme } from "../ThemeContext"

export default function Login(){
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [notVerified, setNotVerified] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMsg, setResendMsg] = useState("")
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const login = async () => {
    if(!email || !password) {
      setError("Заповніть всі поля")
      return
    }
    
    setLoading(true)
    setNotVerified(false)
    setResendMsg("")
    try {
      const res = await api.post("/login", {email, password})
      localStorage.token = res.data.token
      navigate("/")
    } catch(e) {
      const msg = e.response?.data || "Помилка входу"
      setError(msg)
      if (e.response?.status === 403 && typeof msg === "string" && msg.includes("підтвердіть")) {
        setNotVerified(true)
      }
    }
    setLoading(false)
  }

  const resendVerification = async () => {
    setResendLoading(true)
    setResendMsg("")
    try {
      await api.post("/resend-verification", { email })
      setResendMsg("Лист надіслано! Перевірте вашу пошту.")
    } catch(e) {
      setResendMsg(e.response?.data || "Помилка надсилання листа")
    }
    setResendLoading(false)
  }

  return (
    <div className={`auth-page ${theme}`}>
      <div className="auth-container">
        <div className="auth-header">
          <h1>🎯 Habit Tracker</h1>
          <p>Слідкуй за своїми звичками!</p>
        </div>

        <div className="auth-form">
          <h2>Вхід</h2>
          
          {error && <div className="error-message">{error}</div>}

          {notVerified && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <button
                className="btn-primary"
                onClick={resendVerification}
                disabled={resendLoading}
                style={{ width: "100%", background: "#6366f1" }}
              >
                {resendLoading ? "Надсилання..." : "Надіслати лист повторно"}
              </button>
              {resendMsg && <p style={{ fontSize: 13, marginTop: 6, color: "#64748b" }}>{resendMsg}</p>}
            </div>
          )}
          
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyPress={e => e.key === "Enter" && login()}
            />
          </div>

          <div className="form-group">
            <label>Пароль</label>
            <input 
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyPress={e => e.key === "Enter" && login()}
            />
          </div>

          <button 
            className="btn-primary" 
            onClick={login}
            disabled={loading}
          >
            {loading ? "Завантаження..." : "Увійти"}
          </button>

          <p className="auth-switch">
            Нема аккаунту? <a href="/register">Зареєструватися</a>
          </p>
        </div>

        <button className="theme-toggle" onClick={toggleTheme} title="Змінити тему">
          {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🎨"}
        </button>
      </div>
    </div>
  )
}