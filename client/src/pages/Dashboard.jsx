import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
import HabitCard from "../components/HabitCard"
import LineChart from "../components/LineChart"
import { useTheme } from "../ThemeContext"

export default function Dashboard(){
  const [habits, setHabits] = useState([])
  const [publicHabits, setPublicHabits] = useState([])
  const [achievements, setAchievements] = useState([])
  const [commentText, setCommentText] = useState({})
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analyticsTab, setAnalyticsTab] = useState("overview")
  const [title, setTitle] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState("09:00")
  const [reminder, setReminder] = useState(false)
  const [user, setUser] = useState(null)
  const reminderTimeouts = useRef([])
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const blockedUntil = user?.blockedUntil ? new Date(user.blockedUntil) : null
  const isBlocked = user?.isBlocked && blockedUntil && blockedUntil > new Date()
  const blockedDays = isBlocked ? Math.max(1, Math.ceil((blockedUntil - Date.now()) / (1000 * 60 * 60 * 24))) : 0

  const load = async () => {
    try {
      const res = await api.get("/habits")
      setHabits(res.data)
      const achievementsRes = await api.get("/habits/achievements")
      setAchievements(achievementsRes.data)
      const publicRes = await api.get("/habits/public")
      setPublicHabits(publicRes.data)
      const token = localStorage.token
      if (!token) throw new Error("No token")
      const decoded = JSON.parse(atob(token.split('.')[1]))
      const userRes = await api.get(`/user/${decoded.id}`)
      setUser(userRes.data)
    } catch(e) {
      console.log("Not authenticated")
      window.location.href = "/login"
    }
  }

  const requestReminderPermission = async () => {
    if (!('Notification' in window)) {
      alert("Ваш браузер не підтримує нагадування через Notification API.")
      return false
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }

    if (Notification.permission === 'denied') {
      alert("Ви відхилили повідомлення. Увімкніть сповіщення в налаштуваннях браузера.")
      return false
    }

    return Notification.permission === 'granted'
  }

  const scheduleReminders = async (habitList) => {
    reminderTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId))
    reminderTimeouts.current = []

    if (!('Notification' in window)) return
    if (Notification.permission === 'denied') return
    if (Notification.permission === 'default') {
      const granted = await requestReminderPermission()
      if (!granted) return
    }
    if (Notification.permission !== 'granted') return

    habitList.forEach(habit => {
      if (!habit.reminder || habit.completed) return
      const dueDate = new Date(habit.date)
      const [hours, minutes] = (habit.dueTime || '09:00').split(":")
      dueDate.setHours(Number(hours), Number(minutes), 0, 0)
      const delay = dueDate.getTime() - Date.now()
      if (delay <= 0) return

      const timeoutId = window.setTimeout(() => {
        new Notification(`Нагадування: ${habit.title}`, {
          body: `Звичка запланована на ${new Date(habit.date).toLocaleDateString('uk-UA')} о ${habit.dueTime}`,
          silent: false
        })
      }, delay)

      reminderTimeouts.current.push(timeoutId)
    })
  }

  useEffect(() => { load() }, [])

  const logout = () => {
    localStorage.removeItem("token")
    navigate("/login")
  }

  useEffect(() => {
    scheduleReminders(habits)
  }, [habits])

  useEffect(() => {
    const handleFocus = () => load()
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
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
  const publicAchievements = publicHabits.filter(h => h.user?._id !== user?._id)

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

  const addComment = async (habitId) => {
    if (isBlocked) {
      return alert(`Ви заблоковані на ${blockedDays} ${blockedDays === 1 ? 'день' : 'днів'} і не можете додавати коментарі.`)
    }
    const text = commentText[habitId]
    if(!text) return
    try {
      await api.post(`/habits/${habitId}/comment`, { text })
      setCommentText(prev => ({ ...prev, [habitId]: "" }))
      load()
    } catch(e) {
      alert("Не вдалося додати коментар")
    }
  }

  return (
    <div className={`dashboard ${theme}`}>
      <div className="dashboard-header">
        <h1>🎯 My Habits</h1>
        <div className="header-controls">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🎨"}
          </button>
          <button className="btn-secondary" onClick={() => setShowAnalytics(prev => !prev)}>
            📊 Аналітика
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              if (isBlocked) {
                alert(`Ви заблоковані на ${blockedDays} ${blockedDays === 1 ? 'день' : 'днів'}. Ви не можете подавати скаргу.`)
                return
              }
              navigate("/complaint")
            }}
            disabled={isBlocked}
          >
            🚨 Скарга
          </button>
          <a className="btn-secondary" href="/admin">⚙️ Admin</a>
          <button className="btn-danger" onClick={logout}>
            🔓 Вихід
          </button>
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
              onChange={async e => {
                const next = e.target.checked
                if (next) {
                  const granted = await requestReminderPermission()
                  if (!granted) {
                    setReminder(false)
                    return
                  }
                }
                setReminder(next)
              }}
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

      <div className="achievements-section">
        <h2>🏆 Мої досягнення</h2>
        <p className="achievement-help">
          Щоб отримати досягнення, відмітьте звичку як виконану і натисніть "✨ Поділитися".
          Отримане досягнення зберігається навіть після видалення звички, але ви можете видалити його тут.
        </p>
        {myAchievements.length === 0 ? (
          <p className="no-habits">У вас поки що немає досягнень.</p>
        ) : (
          <div className="achievements-grid">
            {myAchievements.map((h, idx) => (
              <div key={h._id} className="achievement-card">
              <div className="achievement-header">
                <div>
                  <h3>{getAchievementTitle(h, idx)}</h3>
                  <p className="achievement-note">{getAchievementSubtitle(h, idx)}</p>
                  <p className="achievement-status">
                    {h.public ? "Публічне досягнення" : "Лише для вас"}
                  </p>
                </div>
                <div className="achievement-actions">
                  <button
                    type="button"
                    className="btn-danger-small"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); deleteAchievement(h._id) }}
                    title="Видалити досягнення"
                  >
                    ✕
                  </button>
                  <span className={`badge ${h.public ? "shared" : "private"}`}>
                    {h.public ? "✨ Поділено" : "🔒 Приватне"}
                  </span>
                </div>
              </div>

              <p className="achievement-info">
                Звичка: {h.title}
                <br />
                Дата: {new Date(h.date).toLocaleDateString('uk-UA')} • Час: {h.dueTime}
              </p>

              {h.public && (
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
                </div>
              )}
            </div>
          ))}
          </div>
        )}
      </div>

      <div className="achievements-section">
        <h2>🌍 Публічні досягнення інших</h2>
        <p className="achievement-help">
          Тут ви можете коментувати досягнення інших користувачів.
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
                  <span className="badge shared">✨ Публічне</span>
                </div>

                <p className="achievement-info">
                  Звичка: {h.title}
                  <br />
                  Дата: {new Date(h.date).toLocaleDateString('uk-UA')} • Час: {h.dueTime}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}