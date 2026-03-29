import { useEffect, useState } from "react"
import api from "../api"
import { useTheme } from "../ThemeContext"
import BarChart from "../components/BarChart"
import LineChart from "../components/LineChart"

export default function Admin(){
  const [users, setUsers] = useState([])
  const [complaints, setComplaints] = useState([])
  const [habitsStats, setHabitsStats] = useState(null)
  const [tab, setTab] = useState("users") // users, complaints, stats
  const [userSearch, setUserSearch] = useState("")
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

      const habitsStatsRes = await api.get("/admin/habits-stats")
      setHabitsStats(habitsStatsRes.data)
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
      alert(`Скарга ${status === "approved" ? "прийнята" : "відхилена"}`)
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
              {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🎨"}
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
            <div className="users-search">
              <input
                type="search"
                placeholder="Пошук користувача за email або іменем"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="user-search-input"
              />
            </div>
            <div className="users-table">
              {users
                .filter(u =>
                  u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
                  u.email.toLowerCase().includes(userSearch.toLowerCase())
                )
                .map(u => (
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
                      <p><strong>Від кого:</strong> {c.reporter?.username || c.reporterEmail || c.reporter?.email || "Unknown"}</p>
                      <p><strong>На кого:</strong> {c.reportedUser?.username || c.reportedUserEmail || c.reportedUser?.email || "Unknown"}</p>
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
            <h2>📊 Аналітика звичок</h2>
            
            {habitsStats ? (
              <>
                {/* Загальна статистика */}
                <div className="stats-overview">
                  <div className="stat-card">
                    <h3>📝 Всього звичок</h3>
                    <p className="stat-number">{habitsStats.totalHabits}</p>
                  </div>
                  <div className="stat-card">
                    <h3>✅ Виконаних</h3>
                    <p className="stat-number">{habitsStats.completedHabits}</p>
                  </div>
                  <div className="stat-card">
                    <h3>📈 Відсоток виконання</h3>
                    <p className="stat-number">
                      {habitsStats.totalHabits > 0 
                        ? Math.round((habitsStats.completedHabits / habitsStats.totalHabits) * 100) 
                        : 0}%
                    </p>
                  </div>
                  <div className="stat-card">
                    <h3>👥 Активних користувачів</h3>
                    <p className="stat-number">{habitsStats.userStats.length}</p>
                  </div>
                </div>

                {/* Графіки */}
                <div className="charts-section">
                  <div className="chart-container">
                    <h3>📊 Активність по днях (останні 30 днів)</h3>
                    <div className="chart-wrapper">
                      <LineChart habits={habitsStats.dailyStats.map(day => ({
                        completedDates: Array(day.completed).fill(day.date)
                      }))} />
                    </div>
                  </div>

                  <div className="chart-container">
                    <h3>📊 Рейтинг користувачів по виконанню</h3>
                    <div className="chart-wrapper">
                      <BarChart habits={habitsStats.userStats
                        .sort((a, b) => b.completionRate - a.completionRate)
                        .slice(0, 10)
                        .map(stat => ({
                          title: stat.user.username || stat.user.email,
                          completedDates: Array(stat.completedHabits).fill('completed')
                        }))} />
                    </div>
                  </div>
                </div>

                {/* Детальна статистика по користувачах */}
                <div className="user-stats-section">
                  <h3>👥 Статистика по користувачах</h3>
                  <div className="user-stats-table">
                    {habitsStats.userStats
                      .sort((a, b) => b.totalHabits - a.totalHabits)
                      .map(stat => (
                      <div key={stat.user._id} className="user-stat-row">
                        <div className="user-stat-info">
                          <p className="user-stat-name">{stat.user.username || stat.user.email}</p>
                          <p className="user-stat-email">{stat.user.email}</p>
                        </div>
                        <div className="user-stat-numbers">
                          <span className="stat-item">
                            📝 {stat.totalHabits} звичок
                          </span>
                          <span className="stat-item">
                            ✅ {stat.completedHabits} виконано
                          </span>
                          <span className="stat-item completion-rate">
                            📈 {stat.completionRate}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="loading">Завантаження статистики...</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}