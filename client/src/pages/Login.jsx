import { useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
import { useTheme } from "../ThemeContext"

export default function Login(){
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const login = async () => {
    if(!email || !password) {
      setError("Заповніть всі поля")
      return
    }
    
    setLoading(true)
    try {
      const res = await api.post("/login", {email, password})
      localStorage.token = res.data.token
      navigate("/")
    } catch(e) {
      setError(e.response?.data || "Помилка входу")
    }
    setLoading(false)
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
          {theme === "dark" ? "☀️" : theme === "light" ? "🌙" : "🎨"}
        </button>
      </div>
    </div>
  )
}