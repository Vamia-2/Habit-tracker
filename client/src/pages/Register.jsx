import { useState } from "react"
import api from "../api"
import { useTheme } from "../ThemeContext"

export default function Register(){
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [registered, setRegistered] = useState(false)
  const { theme, toggleTheme } = useTheme()

  const register = async () => {
    if(!email || !password || !username) {
      setError("Заповніть всі поля")
      return
    }

    if(password !== passwordConfirm) {
      setError("Паролі не збігаються")
      return
    }

    if(password.length < 6) {
      setError("Пароль повинен містити мінімум 6 символів")
      return
    }

    setLoading(true)
    try {
      await api.post("/register", {email, username, password})
      setRegistered(true)
    } catch(e) {
      setError(e.response?.data || "Помилка реєстрації")
    }
    setLoading(false)
  }

  return (
    <div className={`auth-page ${theme}`}>
      <div className="auth-container">
        <div className="auth-header">
          <h1>🎯 Habit Tracker</h1>
          <p>Створи свій аккаунт!</p>
        </div>

        <div className="auth-form">
          <h2>Реєстрація</h2>

          {registered ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Перевірте вашу пошту!</p>
              <p style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>
                Ми надіслали лист підтвердження на <strong>{email}</strong>.
                Перейдіть за посиланням у листі, щоб активувати акаунт.
              </p>
              <p style={{ color: "#94a3b8", fontSize: 13 }}>
                Не отримали листа?{" "}
                <a href="/register" style={{ color: "#6366f1" }}>Зареєструватися знову</a>
              </p>
            </div>
          ) : (
            <>
              {error && <div className="error-message">{error}</div>}

              <div className="form-group">
                <label>Ім'я</label>
                <input
                  type="text"
                  placeholder="Твоє ім'я"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Пароль</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Підтвердіть пароль</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  onKeyPress={e => e.key === "Enter" && register()}
                />
              </div>

              <button
                className="btn-primary"
                onClick={register}
                disabled={loading}
              >
                {loading ? "Завантаження..." : "Зареєструватися"}
              </button>

              <p className="auth-switch">
                Вже є аккаунт? <a href="/login">Увійти</a>
              </p>
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