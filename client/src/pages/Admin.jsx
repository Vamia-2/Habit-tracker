import { useEffect, useState } from "react"
import api from "../api"
import { useTheme } from "../ThemeContext"

export default function Admin(){
  const [users, setUsers] = useState([])
  const [complaints, setComplaints] = useState([])
  const [tab, setTab] = useState("users") // users, complaints, stats
  const [blockDays, setBlockDays] = useState(7)
  const [selectedUser, setSelectedUser] = useState(null)
  const { theme, toggleTheme } = useTheme()

  const load = async () => {
    try {
      const token = localStorage.token
      const decoded = JSON.parse(atob(token.split('.')[1]))
      
      // Перевіряємо, чи користувач є адміном
      const userRes = await api.get(`/user/${decoded.id}`)
      if(userRes.data.role !== "admin") {
        window.location.href = "/"
        return
      }

      const usersRes = await api.get("/admin/users")
      setUsers(usersRes.data)

      const complaintsRes = await api.get("/complaints")
      setComplaints(complaintsRes.data)
    } catch(e) {
      alert("У вас немає доступу до адмін панелі")
      window.location.href = "/"
    }
  }

  useEffect(() => { load() }, [])

  const blockUser = async (userId) => {
    if(!blockDays || blockDays < 1) {
      alert("Введіть кількість днів")
      return
    }
    
    try {
      await api.post(`/admin/block/${userId}`, { days: blockDays })
      alert(`Користувач заблокований на ${blockDays} днів`)
      load()
    } catch(e) {
      alert("Помилка блокування")
    }
  }

  const unblockUser = async (userId) => {
    try {
      await api.post(`/admin/unblock/${userId}`, {})
      alert("Користувач розблокований")
      load()
    } catch(e) {
      alert("Помилка розблокування")
    }
  }

  const handleComplaint = async (complaintId, status) => {
    try {
      const blockDaysValue = status === "approved" ? blockDays : 0
      await api.put(`/complaint/${complaintId}`, {
        status,
        blockDuration: blockDaysValue
      })
      alert(`Скарга ${status === "approved" ? "відхилена" : "прийнята"}`)
      load()
    } catch(e) {
      alert("Помилка обробки скарги")
    }
  }

  return (
    <div className={`admin-page ${theme}`}>
      <div className="admin-container">
        <div className="admin-header">
          <h1>⚙️ Admin Panel</h1>
          <div className="header-controls">
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === "dark" ? "☀️" : theme === "light" ? "🌙" : "🎨"}
            </button>
            <a className="btn-secondary" href="/">← Back to Dashboard</a>
          </div>
        </div>

        <div className="admin-tabs">
          <button 
            className={`tab ${tab === "users" ? "active" : ""}`}
            onClick={() => setTab("users")}
          >
            👥 Users ({users.length})
          </button>
          <button 
            className={`tab ${tab === "complaints" ? "active" : ""}`}
            onClick={() => setTab("complaints")}
          >
            📋 Complaints ({complaints.filter(c => c.status === "pending").length})
          </button>
          <button 
            className={`tab ${tab === "stats" ? "active" : ""}`}
            onClick={() => setTab("stats")}
          >
            📊 Statistics
          </button>
        </div>

        {/* === USERS TAB === */}
        {tab === "users" && (
          <div className="admin-content">
            <h2>Управління користувачами</h2>
            <div className="users-table">
              {users.map(u => (
                <div key={u._id} className="user-row">
                  <div className="user-info">
                    <p className="user-name">{u.username || u.email}</p>
                    <p className="user-email">{u.email}</p>
                    <div className="user-badges">
                      <span className={`badge ${u.role === "admin" ? "admin" : "user"}`}>
                        {u.role === "admin" ? "👑 Admin" : "👤 User"}
                      </span>
                      {u.isBlocked && (
                        <span className="badge blocked">🔒 Заблоковано</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="user-actions">
                    {u.isBlocked ? (
                      <button 
                        className="btn-success"
                        onClick={() => unblockUser(u._id)}
                      >
                        🔓 Розблокувати
                      </button>
                    ) : (
                      <>
                        <input 
                          type="number"
                          min="1"
                          placeholder="Дні"
                          value={blockDays}
                          onChange={e => setBlockDays(Number(e.target.value))}
                          className="block-input"
                        />
                        <button 
                          className="btn-danger"
                          onClick={() => blockUser(u._id)}
                        >
                          🔒 Заблокувати
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === COMPLAINTS TAB === */}
        {tab === "complaints" && (
          <div className="admin-content">
            <h2>Скарги користувачів</h2>
            {complaints.length === 0 ? (
              <p className="no-data">Нема скарг</p>
            ) : (
              <div className="complaints-list">
                {complaints.map(c => (
                  <div key={c._id} className={`complaint-card ${c.status}`}>
                    <div className="complaint-header">
                      <h3>Скарга від {c.reporter?.username || "Unknown"}</h3>
                      <span className={`status-badge ${c.status}`}>
                        {c.status === "pending" ? "⏳ Очікує" : c.status === "approved" ? "✅ Одобрено" : "❌ Відхилено"}
                      </span>
                    </div>

                    <div className="complaint-body">
                      <p><strong>На користувача:</strong> {c.reportedUser?.username || "Unknown"} ({c.reportedUser?.email})</p>
                      <p><strong>Причина:</strong> {c.reason}</p>
                      <p><strong>Опис:</strong> {c.description}</p>
                    </div>

                    {c.status === "pending" && (
                      <div className="complaint-actions">
                        <div className="form-group">
                          <label>Блокувати на днів:</label>
                          <input 
                            type="number"
                            min="1"
                            value={blockDays}
                            onChange={e => setBlockDays(Number(e.target.value))}
                            className="block-input"
                          />
                        </div>
                        <button 
                          className="btn-success"
                          onClick={() => handleComplaint(c._id, "approved")}
                        >
                          ✅ Одобрити
                        </button>
                        <button 
                          className="btn-danger"
                          onClick={() => handleComplaint(c._id, "rejected")}
                        >
                          ❌ Відхилити
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === STATS TAB === */}
        {tab === "stats" && (
          <div className="admin-content">
            <h2>Статистика</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>👥 Всього користувачів</h3>
                <p className="stat-number">{users.length}</p>
              </div>
              <div className="stat-card">
                <h3>⚠️ Заблокованих</h3>
                <p className="stat-number">{users.filter(u => u.isBlocked).length}</p>
              </div>
              <div className="stat-card">
                <h3>📋 Очікуючих скарг</h3>
                <p className="stat-number">{complaints.filter(c => c.status === "pending").length}</p>
              </div>
              <div className="stat-card">
                <h3>👑 Адміністраторів</h3>
                <p className="stat-number">{users.filter(u => u.role === "admin").length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}