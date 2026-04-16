import { useEffect, useState } from "react"
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

export default function Complaint(){
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState("")
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedUserStats, setSelectedUserStats] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [complaintReason, setComplaintReason] = useState("")
  const [complaintDescription, setComplaintDescription] = useState("")
  const [sending, setSending] = useState(false)
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
        const decoded = decodeJwtPayload(token)
        if (!decoded?.id) return
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

  const openComplaintForm = (user) => {
    if (isBlocked) {
      alert("Ви заблоковані і не можете подавати скарги.")
      return
    }

    setSelectedUser(user._id)
    setComplaintReason("")
    setComplaintDescription("")
  }

  const reportUser = async () => {
    if (isBlocked) {
      return alert("Ви заблоковані і не можете подавати скарги.")
    }

    if (!selectedUser) {
      return alert("Спочатку виберіть користувача")
    }

    if (!complaintReason.trim()) {
      return alert("Вкажіть причину скарги")
    }

    if (!complaintDescription.trim()) {
      return alert("Опишіть ситуацію детальніше")
    }

    try {
      setSending(true)
      const token = localStorage.token
      const decoded = decodeJwtPayload(token)

      const targetUser = users.find(user => user._id === selectedUser)
      if (!targetUser) {
        return alert("Користувача не знайдено")
      }

      await api.post("/complaint", {
        reportedUser: targetUser._id,
        reportedUserEmail: targetUser.email,
        reason: complaintReason.trim(),
        description: complaintDescription.trim(),
        reporterEmail: decoded?.email || currentUser?.email || null
      })

      alert("Скаргу відправлено адміну")
      setComplaintReason("")
      setComplaintDescription("")
    } catch (e) {
      console.error(e)
      alert("Не вдалося відправити скаргу")
    } finally {
      setSending(false)
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
                      onClick={() => openComplaintForm(u)}
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
                        openComplaintForm(u)
                      }}
                      disabled={isBlocked}
                      title={isBlocked ? "Ви заблоковані і не можете подавати скарги" : "Відкрити форму скарги"}
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
                  <h3>Аналітика та скарга</h3>
                  {selectedUserStats ? (
                    <>
                      <div className="selected-user-card">
                        <strong>{selectedUserStats.user.username || selectedUserStats.user.email}</strong>
                        <span>{selectedUserStats.user.email}</span>
                      </div>
                      <div className="user-stats-row">
                        <div>Виконано: {selectedUserStats.completedCount}</div>
                        <div>Невиконано: {selectedUserStats.pendingCount}</div>
                        <div>Просрочено: {selectedUserStats.overdueCount}</div>
                        <div>Загалом: {selectedUserStats.totalCount}</div>
                        <div>Рейтинг: {selectedUserStats.completionRate}%</div>
                      </div>
                    </>
                  ) : (
                    <p>Завантаження аналітики...</p>
                  )}

                  <div className="complaint-form-card">
                    <h4>Нова скарга</h4>
                    <div className="form-group">
                      <label>Причина</label>
                      <input
                        type="text"
                        placeholder="Наприклад: образи, спам, порушення правил"
                        value={complaintReason}
                        onChange={e => setComplaintReason(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Опис</label>
                      <textarea
                        rows="5"
                        placeholder="Опишіть ситуацію детальніше"
                        value={complaintDescription}
                        onChange={e => setComplaintDescription(e.target.value)}
                      />
                    </div>
                    <button
                      className="btn-danger"
                      onClick={reportUser}
                      disabled={isBlocked || sending || !selectedUser}
                    >
                      {sending ? "⏳ Відправляємо..." : "🚨 Надіслати скаргу"}
                    </button>
                  </div>
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
