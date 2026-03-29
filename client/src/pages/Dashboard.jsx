import { useEffect, useState, useRef } from "react"
import api from "../api"
import HabitCard from "../components/HabitCard"
import LineChart from "../components/LineChart"
import { useTheme } from "../ThemeContext"

export default function Dashboard(){
  const [habits, setHabits] = useState([])
  const [publicHabits, setPublicHabits] = useState([])
  const [commentText, setCommentText] = useState({})
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [title, setTitle] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState("09:00")
  const [reminder, setReminder] = useState(false)
  const [user, setUser] = useState(null)
  const reminderTimeouts = useRef([])
  const { theme, toggleTheme } = useTheme()

  const load = async () => {
    try {
      const res = await api.get("/habits")
      setHabits(res.data)
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
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  const scheduleReminders = async (habitList) => {
    reminderTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId))
    reminderTimeouts.current = []

    if (!('Notification' in window) || Notification.permission === 'denied') return
    if (Notification.permission === 'default') {
      await requestReminderPermission()
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
  const completionChartHabits = habits
    .filter(h => h.completed)
    .map(h => ({ completedDates: [new Date(h.completedAt || h.date).toISOString().slice(0,10)] }))
  const myAchievements = habits.filter(h => h.completed)
  const publicAchievements = publicHabits.filter(h => h.user?._id !== user?._id)

  const add = async () => {
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
    if(confirm("Видалити звичку?")) {
      await api.delete(`/habits/${id}`)
      load()
    }
  }

  const toggleComplete = async (id, completed) => {
    await api.put(`/habits/${id}`, {
      completed: !completed,
      completedAt: !completed ? new Date() : null
    })
    load()
  }

  const toggleShare = async (habit) => {
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
          <a className="btn-secondary" href="/chat">💬 Chat</a>
          <a className="btn-secondary" href="/admin">⚙️ Admin</a>
        </div>
      </div>

      {showAnalytics && (
        <div className="analytics-panel">
          <h2>📊 Аналітика моїх звичок</h2>
          <div className="analytics-cards">
            <div className="stat-card">
              <h3>✅ Виконано</h3>
              <p className="stat-number">{completedCount}</p>
            </div>
            <div className="stat-card">
              <h3>⭕ Невиконано</h3>
              <p className="stat-number">{pendingCount}</p>
            </div>
            <div className="stat-card">
              <h3>⏰ Просрочено</h3>
              <p className="stat-number">{overdueCount}</p>
            </div>
            <div className="stat-card">
              <h3>📈 Відсоток</h3>
              <p className="stat-number">{completionRate}%</p>
            </div>
          </div>
          <div className="analytics-chart">
            <LineChart habits={completionChartHabits} />
          </div>
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
            />
          </div>
          
          <div className="form-group">
            <label>Час (ГГ:ММ)</label>
            <input 
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>

          <div className="form-group checkbox">
            <input 
              type="checkbox"
              id="reminder"
              checked={reminder}
              onChange={async e => {
                const next = e.target.checked
                setReminder(next)
                if (next) {
                  await requestReminderPermission()
                }
              }}
            />
            <label htmlFor="reminder">🔔 Нагадувати</label>
          </div>
        </div>

        <button className="btn-primary" onClick={add}>💾 Зберегти</button>
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
          Тоді адміністратор і інші користувачі зможуть побачити ваше досягнення.
        </p>
        {myAchievements.length === 0 ? (
          <p className="no-habits">У вас поки що немає досягнень.</p>
        ) : (
          myAchievements.map(h => (
            <div key={h._id} className="achievement-card">
              <div className="achievement-header">
                <div>
                  <h3>{h.title}</h3>
                  <p className="achievement-status">
                    {h.public ? "Публічне досягнення" : "Лише для вас"}
                  </p>
                </div>
                <span className={`badge ${h.public ? "shared" : "private"}`}>
                  {h.public ? "✨ Поділено" : "🔒 Приватне"}
                </span>
              </div>

              <p className="achievement-info">
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
          ))
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
          publicAchievements.map(h => (
            <div key={h._id} className="achievement-card">
              <div className="achievement-header">
                <div>
                  <h3>{h.title}</h3>
                  <p className="achievement-status">Від {h.user?.username || h.user?.email}</p>
                </div>
                <span className="badge shared">✨ Публічне</span>
              </div>

              <p className="achievement-info">
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
          ))
        )}
      </div>
    </div>
  )
}