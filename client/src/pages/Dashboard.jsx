import { useEffect, useState } from "react"
import api from "../api"
import HabitCard from "../components/HabitCard"
import { useTheme } from "../ThemeContext"

export default function Dashboard(){
  const [habits, setHabits] = useState([])
  const [title, setTitle] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState("09:00")
  const [reminder, setReminder] = useState(false)
  const [user, setUser] = useState(null)
  const { theme, toggleTheme } = useTheme()

  const load = async () => {
    try {
      const res = await api.get("/habits")
      setHabits(res.data)
      const token = localStorage.token
      // Decode JWT to get user ID
      const decoded = JSON.parse(atob(token.split('.')[1]))
      const userRes = await api.get(`/user/${decoded.id}`)
      setUser(userRes.data)
    } catch(e) {
      console.log("Not authenticated")
      window.location.href = "/login"
    }
  }

  useEffect(() => { load() }, [])

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
      completedAt: new Date()
    })
    load()
  }

  return (
    <div className={`dashboard ${theme}`}>
      <div className="dashboard-header">
        <h1>🎯 My Habits</h1>
        <div className="header-controls">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === "dark" ? "☀️" : theme === "light" ? "🌙" : "🎨"}
          </button>
          <a className="btn-secondary" href="/chat">💬 Chat</a>
          <a className="btn-secondary" href="/admin">⚙️ Admin</a>
        </div>
      </div>

      {user && <p className="user-welcome">👋 Welcome, {user.username}!</p>}

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
              onChange={e => setReminder(e.target.checked)}
            />
            <label htmlFor="reminder">🔔 Нагадувати</label>
          </div>
        </div>

        <button className="btn-primary" onClick={add}>💾 Save</button>
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
              />
            ))
        )}
      </div>
    </div>
  )
}