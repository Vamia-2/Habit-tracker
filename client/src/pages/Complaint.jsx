import { useEffect, useState } from "react"
import api from "../api"
import { useTheme } from "../ThemeContext"

export default function Complaint(){
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState("")
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedUserStats, setSelectedUserStats] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/users")
        setUsers(res.data.filter(u => u.role !== "admin" && u.email !== "admin@gmail.com"))
      } catch (e) {
        console.error("Не вдалося завантажити користувачів", e)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const token = localStorage.token
        if (!token) return
        const decoded = JSON.parse(atob(token.split('.')[1]))
        const res = await api.get(`/user/${decoded.id}`)
        setCurrentUser(res.data)
      } catch (e) {
        console.error("Не вдалося завантажити поточного користувача", e)
      }
    }
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (!selectedUser) {
      setSelectedUserStats(null)
      return
    }

    const loadStats = async () => {
      try {
        const res = await api.get(`/user/${selectedUser}/stats`)
        setSelectedUserStats(res.data)
      } catch (e) {
        setSelectedUserStats(null)
      }
    }

    loadStats()
  }, [selectedUser])

  const isBlocked = currentUser?.isBlocked && currentUser.blockedUntil && new Date(currentUser.blockedUntil) > new Date()

  const reportUser = async (user) => {
    if (isBlocked) {
      return alert("Ви заблоковані і не можете подавати скарги.")
    }

    const reason = prompt(`Вкажіть причину скарги для ${user.username || user.email}`)
    if (!reason) return

    const description = prompt("Опишіть ситуацію детальніше")
    if (description === null) return

    try {
      const token = localStorage.token
      const decoded = JSON.parse(atob(token.split('.')[1]))

      await api.post("/complaint", {
        reportedUser: user._id,
        reportedUserEmail: user.email,
        reason,
        description,
        reporterEmail: decoded.email
      })
      alert("Скаргу відправлено адміну")
    } catch (e) {
      console.error(e)
      alert("Не вдалося відправити скаргу")
    }
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.username && u.username.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className={`chat-page ${theme}`}>
      <div className="chat-container">
        <div className="chat-header">
          <h1>🚨 Скарга</h1>
          <div className="header-controls">
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🎨"}
            </button>
            <a className="btn-secondary" href="/">← Back</a>
          </div>
        </div>

        <div className="chat-wrapper">
          <div className="users-list">
            <h3>Знайдіть користувача</h3>
            <div className="search-row">
              <input
                type="text"
                placeholder="Пошук за email або ім'ям"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="users-container">
              {filteredUsers.length === 0 ? (
                <p className="no-data">Нема користувачів для показу</p>
              ) : (
                filteredUsers.map(u => (
                  <div key={u._id} className="user-card">
                    <button
                      className={`user-button ${selectedUser === u._id ? "active" : ""}`}
                      onClick={() => setSelectedUser(u._id)}
                    >
                      <div className="user-button-content">
                        <p className="user-button-name">{u.username || u.email.split("@")[0]}</p>
                        <p className="user-button-email">{u.email}</p>
                      </div>
                    </button>
                    <button
                      className="btn-secondary small"
                      onClick={(e) => {
                        e.stopPropagation()
                        reportUser(u)
                      }}
                      disabled={isBlocked}
                      title={isBlocked ? "Ви заблоковані і не можете подавати скарги" : "Подати скаргу"}
                    >
                      🚨 Скарга
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="chat-area">
            {isBlocked && (
              <div className="blocked-banner">
                <h2>Ви заблоковані</h2>
                <p>Ви не можете подавати скарги, доки блокування активне.</p>
              </div>
            )}
            {selectedUser ? (
              <>
                <div className="selected-user-summary">
                  <h3>Аналітика користувача</h3>
                  {selectedUserStats ? (
                    <div className="user-stats-row">
                      <div>Користувач: {selectedUserStats.user.username || selectedUserStats.user.email}</div>
                      <div>Виконано: {selectedUserStats.completedCount}</div>
                      <div>Невиконано: {selectedUserStats.pendingCount}</div>
                      <div>Просрочено: {selectedUserStats.overdueCount}</div>
                      <div>Загалом: {selectedUserStats.totalCount}</div>
                      <div>Рейтинг: {selectedUserStats.completionRate}%</div>
                    </div>
                  ) : (
                    <p>Завантаження аналітики...</p>
                  )}
                </div>
              </>
            ) : (
              <div className="no-chat-selected">
                <p>Оберіть користувача зліва, щоб подивитися його статистику та подати скаргу.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
