import { useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
import { useTheme } from "../ThemeContext"

export default function Register(){
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()
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
      navigate("/login")
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
        </div>

        <button className="theme-toggle" onClick={toggleTheme} title="Змінити тему">
          {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🎨"}
        </button>
      </div>
    </div>
  )
}