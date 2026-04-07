import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
import { useTheme } from "../ThemeContext"

const decodeJwtPayload = (token) => {
  try {
    const payload = token?.split(".")?.[1]
    if (!payload) return null

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64 + "=".repeat((4 - base64.length % 4) % 4)

    return JSON.parse(window.atob(padded))
  } catch {
    return null
  }
}

export default function PublicAchievements(){
  const [publicAchievements, setPublicAchievements] = useState([])
  const [commentText, setCommentText] = useState({})
  const [user, setUser] = useState(null)
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const load = async () => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/login")
      return
    }

    const decoded = decodeJwtPayload(token)
    if (!decoded?.id) {
      navigate("/login")
      return
    }

    try {
      const [publicRes, userRes] = await Promise.all([
        api.get("/habits/public"),
        api.get(`/user/${decoded.id}`)
      ])

      setPublicAchievements(publicRes.data.filter(item => item.user?._id !== decoded.id))
      setUser(userRes.data)
    } catch (error) {
      const status = error?.response?.status
      if (status === 401 || status === 403) {
        navigate("/login")
        return
      }
      console.error("Не вдалося завантажити публічні досягнення", error)
    }
  }

  useEffect(() => { load() }, [])

  const isBlocked = user?.isBlocked && user?.blockedUntil && new Date(user.blockedUntil) > new Date()
  const blockedDays = isBlocked ? Math.max(1, Math.ceil((new Date(user.blockedUntil) - Date.now()) / (1000 * 60 * 60 * 24))) : 0

  const addComment = async (habitId) => {
    if (isBlocked) {
      return alert(`Ви заблоковані на ${blockedDays} ${blockedDays === 1 ? "день" : "днів"} і не можете додавати коментарі.`)
    }

    const text = commentText[habitId]
    if (!text) return

    try {
      await api.post(`/habits/${habitId}/comment`, { text })
      setCommentText(prev => ({ ...prev, [habitId]: "" }))
      await load()
    } catch (error) {
      alert("Не вдалося додати коментар")
    }
  }

  return (
    <div className={`dashboard ${theme}`}>
      <div className="dashboard-header">
        <h1>🌍 Публічні досягнення інших</h1>
        <div className="header-controls">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Змінити тему">
            {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🎨"}
          </button>
          <button className="btn-secondary" onClick={() => navigate("/")}>← Назад</button>
        </div>
      </div>

      <div className="achievements-section">
        <p className="achievement-help">
          Тут ви можете переглядати і коментувати досягнення інших користувачів.
        </p>
        {publicAchievements.length === 0 ? (
          <p className="no-habits">Поки що нема публічних досягнень.</p>
        ) : (
          <div className="achievements-grid">
            {publicAchievements.map(h => (
              <div key={h._id} className="achievement-card">
                <div className="achievement-header">
                  <div>
                    <h3>🏆 Досягнення</h3>
                    <p className="achievement-status">Від {h.user?.username || h.user?.email}</p>
                  </div>
                  <div className="achievement-actions">
                    <span className="badge shared">✨ Публічне</span>
                    <span className={`comment-status-badge ${h.commentsEnabled === false ? "off" : "on"}`}>
                      {h.commentsEnabled === false ? "🚫 Коментарі вимкнені" : "💬 Коментарі увімкнені"}
                    </span>
                  </div>
                </div>

                <p className="achievement-info">
                  Звичка: {h.title}
                  <br />
                  Дата: {new Date(h.date).toLocaleDateString("uk-UA")} • Час: {h.dueTime}
                </p>

                <div className="achievement-comments">
                  <h4>Коментарі</h4>
                  {h.comments?.length === 0 ? (
                    <p className="no-data">Поки що немає коментарів</p>
                  ) : (
                    h.comments.map((c, idx) => (
                      <div key={idx} className="comment-row">
                        <strong>{c.username}</strong>: {c.text}
                      </div>
                    ))
                  )}
                  {h.commentsEnabled === false ? (
                    <p className="no-data">Коментарі до цього досягнення вимкнені власником.</p>
                  ) : (
                    <div className="comment-form">
                      <input
                        type="text"
                        placeholder="Залишити коментар..."
                        value={commentText[h._id] || ""}
                        onChange={e => setCommentText(prev => ({ ...prev, [h._id]: e.target.value }))}
                      />
                      <button className="btn-primary" onClick={() => addComment(h._id)}>
                        📝 Відправити
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
