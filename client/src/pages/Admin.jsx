import { useEffect, useState } from "react"
import api from "../api"
import { useTheme } from "../ThemeContext"
import BarChart from "../components/BarChart"
import LineChart from "../components/LineChart"

export default function Admin(){
  const [users, setUsers] = useState([])
  const [habitsStats, setHabitsStats] = useState(null)
  const [complaints, setComplaints] = useState([])
  const [tab, setTab] = useState("users") // users, stats, complaints
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

      const habitsStatsRes = await api.get("/admin/habits-stats")
      setHabitsStats(habitsStatsRes.data)

      const complaintsRes = await api.get("/complaints")
      setComplaints(complaintsRes.data)
    } catch(e) {
      alert("У вас немає доступу до адмін панелі")
      window.location.href = "/"
    }
  }

  const updateComplaintStatus = async (complaintId, status) => {
    try {
      await api.put(`/complaint/${complaintId}`, { status })
      alert(`Скаргу ${status === 'approved' ? 'підтверджено' : 'відхилено'}`)
      load()
    } catch(e) {
      alert("Не вдалося оновити статус скарги")
    }
  }

  const deleteComplaint = async (complaintId) => {
    try {
      await api.delete(`/complaint/${complaintId}`)
      alert("Скаргу видалено")
      load()
    } catch(e) {
      alert("Не вдалося видалити скаргу")
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

  const toggleRole = async (userId, currentRole) => {
    try {
      const newRole = currentRole === "admin" ? "user" : "admin"
      await api.put(`/admin/role/${userId}`, { role: newRole })
      alert(`Роль користувача змінено на ${newRole}`)
      load()
    } catch (e) {
      alert("Помилка зміни ролі")
    }
  }

  const deleteUser = async (userId) => {

    try {
      await api.delete(`/admin/user/${userId}`)
      load()
    } catch (e) {
      alert("Не вдалося видалити користувача")
    }
  }

  return (
    <div className={`admin-page ${theme}`}>
      <div className="admin-container">
        <div className="admin-header">
          <h1>⚙️ Панель адміністратора</h1>
          <div className="header-controls">
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🎨"}
            </button>
            <a className="btn-secondary" href="/">← Назад на панель</a>
          </div>
        </div>

        <div className="admin-tabs">
          <button 
            className={`tab ${tab === "users" ? "active" : ""}`}
            onClick={() => setTab("users")}
          >
            👥 Користувачі ({users.length})
          </button>
          <button 
            className={`tab ${tab === "stats" ? "active" : ""}`}
            onClick={() => setTab("stats")}
          >
            📊 Статистика
          </button>
          <button 
            className={`tab ${tab === "complaints" ? "active" : ""}`}
            onClick={() => setTab("complaints")}
          >
            📣 Скарги ({complaints.length})
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
                        {u.role === "admin" ? "👑 Адмін" : "👤 Користувач"}
                      </span>
                      {u.isBlocked && (
                        <span className="badge blocked">🔒 Заблоковано</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="user-actions">
                    <button
                      className={u.role === "admin" ? "btn-secondary" : "btn-success"}
                      onClick={() => toggleRole(u._id, u.role)}
                    >
                      {u.role === "admin" ? "👤 Зробити користувачем" : "👑 Зробити адміном"}
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => deleteUser(u._id, u.username || u.email)}
                    >
                      🗑️ Видалити
                    </button>
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

        {tab === "complaints" && (
          <div className="admin-content">
            <h2>📣 Керування скаргами</h2>
            <div className="complaints-list">
              {complaints.length > 0 ? complaints.map((complaint) => (
                <div key={complaint._id} className={`complaint-card ${complaint.status || 'pending'}`}>
                  <div className="complaint-header">
                    <div>
                      <h3>{complaint.reason}</h3>
                      <p>Від: {complaint.reporter?.username || complaint.reporter?.email || complaint.reporterEmail}</p>
                      <p>На: {complaint.reportedUser?.username || complaint.reportedUser?.email || complaint.reportedUserEmail}</p>
                    </div>
                            <span className="complaint-badge">
                      {complaint.status === 'approved' ? 'ПІДТВЕРДЖЕНО' : complaint.status === 'rejected' ? 'ВІДХИЛЕНО' : 'В ОБРОБЦІ'}
                    </span>
                  </div>
                  <div className="complaint-body">
                    <p>{complaint.description || 'Без опису'}</p>
                    <p><strong>Дата:</strong> {new Date(complaint.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="complaint-actions">
                    <button
                      className="btn-success"
                      onClick={() => updateComplaintStatus(complaint._id, 'approved')}
                      disabled={complaint.status === 'approved'}
                    >
                      Підтвердити
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => updateComplaintStatus(complaint._id, 'rejected')}
                      disabled={complaint.status === 'rejected'}
                    >
                      Відхилити
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => deleteComplaint(complaint._id)}
                    >
                      Видалити
                    </button>
                  </div>
                </div>
              )) : (
                <p>Немає нових скарг.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}