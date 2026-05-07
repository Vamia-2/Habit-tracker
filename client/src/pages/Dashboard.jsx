import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
import HabitCard from "../components/HabitCard"
import LineChart from "../components/LineChart"
import { useTheme } from "../ThemeContext"

const WEEKDAY_OPTIONS = [
  { value: 0, short: "Нд" },
  { value: 1, short: "Пн" },
  { value: 2, short: "Вт" },
  { value: 3, short: "Ср" },
  { value: 4, short: "Чт" },
  { value: 5, short: "Пт" },
  { value: 6, short: "Сб" }
]

const normalizeCycleDays = (value) => {
  if (!Array.isArray(value)) return []

  return [...new Set(
    value
      .map((day) => Number(day))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  )].sort((a, b) => a - b)
}

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

export default function Dashboard({ initialSection = "habits" }){
  const [habits, setHabits] = useState([])
  const [achievements, setAchievements] = useState([])
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analyticsTab, setAnalyticsTab] = useState("overview")
  const [activeSection, setActiveSection] = useState(initialSection === "cycles" ? "cycles" : "habits")
  const [habitFilter, setHabitFilter] = useState("all")
  const [selectedWeekday, setSelectedWeekday] = useState(null)
  const [title, setTitle] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState("09:00")
  const [reminder, setReminder] = useState(false)
  const [cycleDays, setCycleDays] = useState([])
  const [user, setUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [suggestionOpen, setSuggestionOpen] = useState(false)
  const [suggestionText, setSuggestionText] = useState("")
  const [sendingSuggestion, setSendingSuggestion] = useState(false)
  const menuRef = useRef(null)
  const skipNextFocusLoadRef = useRef(false)
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const blockedUntil = user?.blockedUntil ? new Date(user.blockedUntil) : null
  const isBlocked = user?.isBlocked && blockedUntil && blockedUntil > new Date()
  const blockedDays = isBlocked ? Math.max(1, Math.ceil((blockedUntil - Date.now()) / (1000 * 60 * 60 * 24))) : 0

  const getHabitCompletionStatus = (habit) => {
    if (!habit) return false
    const isRecurring = normalizeCycleDays(habit.cycleDays).length > 0
    
    if (!isRecurring) {
      return habit.completed
    }
    
    // Для циклічних: розпізнаємо, чи виконана сьогодні
    if (!habit.completedAt) return false
    const today = new Date()
    const completedDate = new Date(habit.completedAt)
    const completedKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, "0")}-${String(completedDate.getDate()).padStart(2, "0")}`
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    return completedKey === todayKey
  }

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
    const handleFocus = () => {
      if (skipNextFocusLoadRef.current) {
        skipNextFocusLoadRef.current = false
        return
      }
      load()
    }
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

  const completedCount = habits.filter(h => getHabitCompletionStatus(h)).length
  const overdueCount = habits.filter(h => !getHabitCompletionStatus(h) && new Date(h.date) < new Date()).length
  const pendingCount = habits.filter(h => !getHabitCompletionStatus(h) && new Date(h.date) >= new Date()).length
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

  const isRecurringHabit = (habit) => normalizeCycleDays(habit.cycleDays).length > 0

  const matchesSelectedDay = (habit, weekday) => {
    if (weekday === null || weekday === undefined) return true

    const cycle = normalizeCycleDays(habit.cycleDays)
    if (cycle.length > 0) return cycle.includes(weekday)

    return new Date(habit.date).getDay() === weekday
  }

  const visibleHabits = useMemo(() => {
    const sorted = habits.slice().sort((a, b) => new Date(a.date) - new Date(b.date))
    const now = new Date()

    return sorted.filter((habit) => {
      if (habitFilter === "overdue") {
        return !habit.completed && new Date(habit.date) < now
      }

      if (habitFilter === "day") {
        return matchesSelectedDay(habit, selectedWeekday)
      }

      return true
    })
  }, [activeSection, habitFilter, habits, selectedWeekday])

  const toggleCycleDay = (weekday) => {
    setCycleDays((prev) => prev.includes(weekday)
      ? prev.filter((day) => day !== weekday)
      : [...prev, weekday].sort((a, b) => a - b))
  }

  const add = async () => {
    if (isBlocked) {
      return alert(`Ви заблоковані на ${blockedDays} ${blockedDays === 1 ? 'день' : 'днів'} і не можете додавати звички.`)
    }
    if(!title) return alert("Введіть названя звички")
    if (activeSection === "cycles" && cycleDays.length === 0) {
      return alert("Оберіть хоча б один день для циклу")
    }
    
    try {
      await api.post("/habits", {
        title,
        date: new Date(`${date}T${time}`),
        reminder,
        dueTime: time,
        timezoneOffset: new Date().getTimezoneOffset(),
        cycleDays: activeSection === "cycles" ? cycleDays : []
      })
      setTitle("")
      setDate(new Date().toISOString().split('T')[0])
      setTime("09:00")
      setReminder(false)
      setCycleDays([])
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
      skipNextFocusLoadRef.current = true
      await api.delete(`/habits/${id}`)
      setHabits(prev => prev.filter(h => h._id !== id))
      setAchievements(prev => prev.filter(a => a._id !== id))
    } catch (e) {
      console.error(e)
      skipNextFocusLoadRef.current = false
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

  const openRules = () => {
    setMenuOpen(false)
    setRulesOpen(true)
  }

  const closeRules = () => {
    setRulesOpen(false)
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
    const shouldEnable = event.target.checked
    console.log("🔔 Reminder toggle:", shouldEnable)
    
    if (!shouldEnable) {
      // Unchecking is always allowed
      setReminder(false)
      return
    }

    // Checking the box - immediately mark as checked, then set up push
    setReminder(true)

    try {
      console.log("🔔 Triggering push setup...")
      // Просто одразу налаштовуємо push без запиту
      const { ensurePushNotificationsReady } = await import("../utils/pushNotifications")
      console.log("🔔 Calling ensurePushNotificationsReady...")
      const ready = await ensurePushNotificationsReady()
      console.log("🔔 Push setup result:", ready)
      
      if (!ready) {
        console.log("🔔 Push setup failed, unchecking reminder")
        setReminder(false)
        return
      }

      await load()
    } catch (error) {
      console.error("❌ Error enabling reminder:", error)
      alert(`Помилка при увімкненні нагадувань: ${error.message || error}`)
      setReminder(false)
    }
  }

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
  }

  const openSuggestionDialog = () => {
    setSuggestionOpen(true)
  }

  const closeSuggestionDialog = () => {
    if (sendingSuggestion) return
    setSuggestionOpen(false)
    setSuggestionText("")
  }

  const submitSuggestion = async () => {
    if (!suggestionText.trim()) {
      alert("Напишіть, що ви хочете додати, змінити або видалити")
      return
    }

    try {
      setSendingSuggestion(true)
      await api.post("/suggestions", { text: suggestionText.trim() })
      alert("Пропозицію відправлено адміну")
      setSuggestionText("")
      setSuggestionOpen(false)
    } catch (error) {
      console.error(error)
      alert("Не вдалося відправити пропозицію")
    } finally {
      setSendingSuggestion(false)
    }
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
                <button className="menu-item" onClick={openRules}>
                  📜 Правила програми
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

      {rulesOpen && (
        <div className="rules-overlay" role="dialog" aria-modal="true" aria-label="Правила програми" onClick={closeRules}>
          <div className="rules-card" onClick={(event) => event.stopPropagation()}>
            <div className="rules-header">
              <h2>📜 Правила програми</h2>
              <button className="rules-close" onClick={closeRules} aria-label="Закрити правила">×</button>
            </div>
            <ul className="rules-list">
              <li>Не можна писати нецензурну лексику.</li>
              <li>Не можна ображати себе або інших.</li>
              <li>Не можна принижувати, погрожувати чи провокувати конфлікти.</li>
              <li>Пишіть коректні назви звичок, скарг і пропозицій.</li>
              <li>Дотримуйтеся поваги в спілкуванні з іншими користувачами та адміністратором.</li>
            </ul>
            <button className="btn-primary rules-action" onClick={closeRules}>Зрозуміло</button>
          </div>
        </div>
      )}

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

      <div className="section-tabs habit-tabs">
        <button
          className={`tab ${activeSection === "habits" ? "active" : ""}`}
          onClick={() => setActiveSection("habits")}
        >
          � Нагадування
        </button>
        <button
          className={`tab ${activeSection === "cycles" ? "active" : ""}`}
          onClick={() => setActiveSection("cycles")}
        >
          🗂️ Звички
        </button>
      </div>

      <div className="add-habit-form">
        <h3>{activeSection === "cycles" ? "Додай нову звичку" : "Додай звичку з нагадуванням"}</h3>

        {activeSection === "cycles" && (
          <div className="cycle-days-picker">
            <p className="picker-label">Оберіть дні повторення</p>
            <div className="weekday-grid">
              {WEEKDAY_OPTIONS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  className={`weekday-pill ${cycleDays.includes(day.value) ? "active" : ""}`}
                  onClick={() => toggleCycleDay(day.value)}
                  disabled={isBlocked}
                >
                  {day.short}
                </button>
              ))}
            </div>
          </div>
        )}
        
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
            <label>Дата (ДД-ММ-РРРР)</label>
            <input 
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              disabled={isBlocked}
            />
          </div>
          
          <div className="form-group">
            <label>Час (ГГ:ХХ)</label>
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

      <div className="habit-filters">
        <button className={`tab ${habitFilter === "all" ? "active" : ""}`} onClick={() => setHabitFilter("all")}>
          Усі
        </button>
        <button className={`tab ${habitFilter === "overdue" ? "active" : ""}`} onClick={() => setHabitFilter("overdue")}>
          Просрочені
        </button>
        <button className={`tab ${habitFilter === "day" ? "active" : ""}`} onClick={() => setHabitFilter("day")}>
          Окремі дні
        </button>
      </div>

      {habitFilter === "day" && (
        <div className="weekday-filter-row">
          {WEEKDAY_OPTIONS.map((day) => (
            <button
              key={day.value}
              className={`weekday-chip ${selectedWeekday === day.value ? "active" : ""}`}
              onClick={() => setSelectedWeekday(day.value)}
            >
              {day.short}
            </button>
          ))}
        </div>
      )}

      <div className="habits-grid">
        {visibleHabits.length === 0 ? (
          <p className="no-habits">Нема звичок. Додай першу!</p>
        ) : (
          visibleHabits.map(h => (
              <HabitCard 
                key={h._id}
                habit={h}
                onToggle={() => toggleComplete(h._id, getHabitCompletionStatus(h))}
                onDelete={() => deleteHabit(h._id)}
                onShare={() => toggleShare(h)}
              />
            ))
        )}
      </div>

      <button className="floating-suggestion-btn" onClick={openSuggestionDialog} aria-label="Suggest new features">
        💡 Пропозиції
      </button>

      {suggestionOpen && (
        <div className="suggestion-modal-backdrop" onClick={closeSuggestionDialog}>
          <div className={`suggestion-modal ${theme}`} onClick={(event) => event.stopPropagation()}>
            <div className="suggestion-modal-header">
              <h3>💡 Пропозиція</h3>
              <button className="modal-close" onClick={closeSuggestionDialog} disabled={sendingSuggestion}>×</button>
            </div>
            <p className="suggestion-modal-text">Які ваші ідеї для покращення? Чого не вистачає? Що заважає користуватися додатком? Допоможіть зробити його кращим!</p>
            <textarea
              className="suggestion-textarea"
              rows="6"
              value={suggestionText}
              onChange={(event) => setSuggestionText(event.target.value)}
              disabled={sendingSuggestion}
            />
            <div className="suggestion-actions">
              <button className="btn-secondary" onClick={closeSuggestionDialog} disabled={sendingSuggestion}>Скасувати</button>
              <button className="btn-primary" onClick={submitSuggestion} disabled={sendingSuggestion}>
                {sendingSuggestion ? "⏳ Надсилаємо..." : "📨 Відправити"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}