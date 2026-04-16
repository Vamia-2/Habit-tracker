import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
import HabitCard from "../components/HabitCard"
import LineChart from "../components/LineChart"
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

export default function Dashboard(){
  const [habits, setHabits] = useState([])
  const [achievements, setAchievements] = useState([])
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analyticsTab, setAnalyticsTab] = useState("overview")
  const [title, setTitle] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState("09:00")
  const [reminder, setReminder] = useState(false)
  const [user, setUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const blockedUntil = user?.blockedUntil ? new Date(user.blockedUntil) : null
  const isBlocked = user?.isBlocked && blockedUntil && blockedUntil > new Date()
  const blockedDays = isBlocked ? Math.max(1, Math.ceil((blockedUntil - Date.now()) / (1000 * 60 * 60 * 24))) : 0

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
      const [habitsRes, achievementsRes, userRes] = await Promise.all([
        api.get("/habits"),
        api.get("/habits/achievements"),
        api.get(`/user/${decoded.id}`)
      ])

      setHabits(habitsRes.data)
      setAchievements(achievementsRes.data)
      setUser(userRes.data)
    } catch(e) {
      const status = e?.response?.status
      if (status === 401 || status === 403) {
        console.log("Not authenticated")
        navigate("/login")
        return
      }

      console.error("Помилка завантаження dashboard:", e)
    }
  }

  useEffect(() => { load() }, [])

  const logout = () => {
    localStorage.removeItem("token")
    navigate("/login")
  }

  useEffect(() => {
    const handleFocus = () => load()
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  const completedCount = habits.filter(h => h.completed).length
  const overdueCount = habits.filter(h => !h.completed && new Date(h.date) < new Date()).length
  const pendingCount = habits.filter(h => !h.completed && new Date(h.date) >= new Date()).length
  const completionRate = habits.length ? Math.round((completedCount / habits.length) * 100) : 0
  const completionChartHabits = achievements
    .map(h => ({ completedDates: [new Date(h.completedAt || h.date).toISOString().slice(0,10)] }))
  const myAchievements = achievements
    .slice()
    .sort((a, b) => new Date(a.completedAt || a.date) - new Date(b.completedAt || b.date))

  const getAchievementTitle = (habit, index) => {
    const isOverdue = habit.completedAt && new Date(habit.completedAt) > new Date(habit.date)

    if (habit.streakCount > 1) {
      return `🔥 ${habit.streakCount} днів підряд`
    }
    if (index === 0) {
      return isOverdue ? "⚠️ Перше прострочене досягнення" : "🥇 Перша звичка"
    }
    if (isOverdue) {
      return "⚠️ Прострочене досягнення"
    }
    return "🏆 Досягнення"
  }

  const getAchievementSubtitle = (habit, index) => {
    const isOverdue = habit.completedAt && new Date(habit.completedAt) > new Date(habit.date)

    if (habit.streakCount > 1) {
      return `Підтримай серію — ${habit.streakCount} дні підряд!`
    }
    if (index === 0) {
      return isOverdue ? "Перший урок: не пропускай наступну звичку." : "Перший крок на шляху до звички."
    }
    if (isOverdue) {
      return "Не засмучуйся — будь уважнішим наступного разу."
    }
    return "Класно, ти рухаєшся вперед!"
  }

  const add = async () => {
    if (isBlocked) {
      return alert(`Ви заблоковані на ${blockedDays} ${blockedDays === 1 ? 'день' : 'днів'} і не можете додавати звички.`)
    }
    if(!title) return alert("Введіть названя звички")
    
    try {
      await api.post("/habits", {
        title,
        date: new Date(`${date}T${time}`),
        reminder,
        dueTime: time
      })
      setTitle("")
      setDate(new Date().toISOString().split('T')[0])
      setTime("09:00")
      setReminder(false)
      load()
    } catch(e) {
      alert("Помилка додавання звички")
    }
  }

  const deleteHabit = async (id) => {
    if (isBlocked) {
      return alert(`Ви заблоковані на ${blockedDays} ${blockedDays === 1 ? 'день' : 'днів'} і не можете змінювати звички.`)
    }
    if (!confirm("Видалити звичку?")) return
    try {
      await api.delete(`/habits/${id}`)
      setHabits(prev => prev.filter(h => h._id !== id))
      setAchievements(prev => prev.filter(a => a._id !== id))
    } catch (e) {
      console.error(e)
      alert("Не вдалося видалити звичку")
    }
  }

  const deleteAchievement = async (id) => {
    if (!confirm("Видалити досягнення?")) return
    try {
      await api.delete(`/achievements/${id}`)
      setAchievements(prev => prev.filter(a => a._id !== id))
    } catch (e) {
      console.error(e)
      alert("Не вдалося видалити досягнення")
    }
  }

  const toggleComplete = async (id, completed) => {
    if (isBlocked) {
      return alert(`Ви заблоковані на ${blockedDays} ${blockedDays === 1 ? 'день' : 'днів'} і не можете змінювати звички.`)
    }
    await api.put(`/habits/${id}`, {
      completed: !completed,
      completedAt: !completed ? new Date() : null
    })
    load()
  }

  const toggleShare = async (habit) => {
    if (isBlocked) {
      return alert(`Ви заблоковані на ${blockedDays} ${blockedDays === 1 ? 'день' : 'днів'} і не можете змінювати звички.`)
    }
    try {
      await api.put(`/habits/${habit._id}`, {
        public: !habit.public
      })
      load()
    } catch(e) {
      alert("Не вдалося змінити статус спільного досягнення")
    }
  }

  const toggleComments = async (habit) => {
    if (isBlocked) {
      return alert(`Ви заблоковані на ${blockedDays} ${blockedDays === 1 ? 'день' : 'днів'} і не можете змінювати звички.`)
    }
    try {
      await api.put(`/habits/${habit._id}`, {
        commentsEnabled: habit.commentsEnabled === false
      })
      load()
    } catch(e) {
      alert("Не вдалося змінити налаштування коментарів")
    }
  }

  const openComplaintPage = () => {
    setMenuOpen(false)
    if (isBlocked) {
      alert(`Ви заблоковані на ${blockedDays} ${blockedDays === 1 ? 'день' : 'днів'}. Ви не можете подавати скаргу.`)
      return
    }
    navigate("/complaint")
  }

  const openAdminPage = () => {
    setMenuOpen(false)
    navigate("/admin")
  }

  const openAchievementsPage = () => {
    setMenuOpen(false)
    navigate("/achievements")
  }

  const openPublicAchievementsPage = () => {
    setMenuOpen(false)
    navigate("/public-achievements")
  }

  const handleThemeToggle = () => {
    setMenuOpen(false)
    toggleTheme()
  }

  const handleReminderChange = async (event) => {
    const next = event.target.checked
    const hasPushSubscription = Boolean(user?.hasPushSubscription || user?.pushSubscription)

    if (next && !hasPushSubscription) {
      const enablePush = window.confirm("Щоб нагадування працювало, потрібно увімкнути push-сповіщення. Увімкнути зараз?")
      if (!enablePush) {
        alert("Для нагадувань потрібно увімкнути push-сповіщення.")
        setReminder(false)
        return
      }

      try {
        const { subscribeToPushNotifications } = await import("../components/PushSettings")
        const subscribed = await subscribeToPushNotifications()
        if (!subscribed) {
          setReminder(false)
          return
        }

        await load()
      } catch (error) {
        console.error(error)
        setReminder(false)
        return
      }
    }

    setReminder(next)
  }

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
  }

  return (
    <div className={`dashboard ${theme}`}>
      <div className="dashboard-header">
        <h1>🎯 My Habits</h1>
        <div className="header-controls">
          <div className="menu-wrap" ref={menuRef}>
            <button
              className={`menu-toggle ${menuOpen ? "active" : ""}`}
              onClick={() => setMenuOpen(prev => !prev)}
              aria-label="Відкрити меню"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>

            {menuOpen && (
              <div className="menu-dropdown menu-dropdown-open" role="menu">
                <button className="menu-item" onClick={handleThemeToggle}>
                  {theme === "dark" ? "🌙 Темна тема" : theme === "light" ? "☀️ Світла тема" : "🎨 Кольорова тема"}
                </button>
                <button className="menu-item" onClick={() => { setMenuOpen(false); setShowAnalytics(prev => !prev) }}>
                  📊 Аналітика
                </button>
                <button className="menu-item" onClick={openAchievementsPage}>
                  🏆 Досягнення
                </button>
                <button className="menu-item" onClick={openPublicAchievementsPage}>
                  🌍 Публічні досягнення
                </button>
                <button className="menu-item" onClick={openComplaintPage} disabled={isBlocked}>
                  🚨 Скарга
                </button>
                {user?.role === "admin" && (
                  <button className="menu-item" onClick={openAdminPage}>
                    ⚙️ Адмін
                  </button>
                )}
                <button className="menu-item danger" onClick={handleLogout}>
                  🔓 Вихід
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAnalytics && (
        <div className="analytics-panel">
          <h2>📊 Аналітика моїх звичок</h2>
          <div className="analytics-tabs">
            <button
              className={`tab ${analyticsTab === "overview" ? "active" : ""}`}
              onClick={() => setAnalyticsTab("overview")}
            >
              🔎 Огляд
            </button>
            <button
              className={`tab ${analyticsTab === "chart" ? "active" : ""}`}
              onClick={() => setAnalyticsTab("chart")}
            >
              📈 Графік
            </button>
          </div>

          {analyticsTab === "overview" && (
            <div className="analytics-cards">
              <div className="stat-card">
                <h3>✅ Виконано</h3>
                <p className="stat-number">{Number(completedCount)}</p>
              </div>
              <div className="stat-card">
                <h3>⭕ Невиконано</h3>
                <p className="stat-number">{Number(pendingCount)}</p>
              </div>
              <div className="stat-card">
                <h3>⏰ Просрочено</h3>
                <p className="stat-number">{Number(overdueCount)}</p>
              </div>
              <div className="stat-card">
                <h3>📈 Відсоток</h3>
                <p className="stat-number">{Number(completionRate)}%</p>
              </div>
            </div>
          )}

          {analyticsTab === "chart" && (
            <div className="analytics-chart">
              <LineChart habits={completionChartHabits} />
            </div>
          )}
        </div>
      )}

      {isBlocked && (
        <div className="blocked-banner">
          <h2>Ви заблоковані на {blockedDays} {blockedDays === 1 ? "день" : "днів"}</h2>
          <p>Ви не можете створювати нові звички, змінювати існуючі або писати коментарі до завершення блокування.</p>
        </div>
      )}

      <div className="add-habit-form">
        <h3>Додай нову звичку</h3>
        
        <div className="form-row">
          <div className="form-group">
            <label>Назва звички</label>
            <input 
              type="text"
              placeholder="напр. Читати книгу, Робити вправи..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={isBlocked}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Дата (РРРР-ММ-ДД)</label>
            <input 
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              disabled={isBlocked}
            />
          </div>
          
          <div className="form-group">
            <label>Час (ГГ:ММ)</label>
            <input 
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              disabled={isBlocked}
            />
          </div>

          <div className="form-group checkbox">
            <input 
              type="checkbox"
              id="reminder"
              checked={reminder}
              disabled={isBlocked}
              onChange={handleReminderChange}
            />
            <label htmlFor="reminder">🔔 Нагадувати</label>
          </div>
        </div>

        <button className="btn-primary" onClick={add} disabled={isBlocked}>
          💾 Зберегти
        </button>
      </div>

      <div className="habits-grid">
        {habits.length === 0 ? (
          <p className="no-habits">Нема звичок. Додай першу!</p>
        ) : (
          habits
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(h => (
              <HabitCard 
                key={h._id}
                habit={h}
                onToggle={() => toggleComplete(h._id, h.completed)}
                onDelete={() => deleteHabit(h._id)}
                onShare={() => toggleShare(h)}
              />
            ))
        )}
      </div>

    </div>
  )
}