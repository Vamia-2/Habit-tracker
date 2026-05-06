export default function HabitCard({ habit, onToggle, onDelete, onShare }) {
  const habitDate = new Date(habit.date)
  const today = new Date()
  const msPerDay = 1000 * 60 * 60 * 24
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startOfHabitDay = new Date(habitDate.getFullYear(), habitDate.getMonth(), habitDate.getDate())
  const dayDifference = Math.round((startOfHabitDay - startOfToday) / msPerDay)
  
  // Для циклічних звичок - показувати як сьогоднішню якщо це відповідний день
  const isRecurring = Array.isArray(habit.cycleDays) && habit.cycleDays.length > 0
  const todayWeekday = today.getDay()
  const isToday = dayDifference === 0 || (isRecurring && habit.cycleDays.includes(todayWeekday))
  
  // Статус дня: для циклічних - перевіряємо за completedAt, для звичних - за completed
  const getCompletionStatus = () => {
    if (!isRecurring) {
      return habit.completed
    }
    // Для циклічних: розпізнаємо, чи виконана сьогодні
    if (!habit.completedAt) return false
    const completedDate = new Date(habit.completedAt)
    const completedKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, "0")}-${String(completedDate.getDate()).padStart(2, "0")}`
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    return completedKey === todayKey
  }

  const isCompleted = getCompletionStatus()
  const isOverdue = habitDate < today && !isRecurring
  const overdueDays = isOverdue && dayDifference !== 0 ? Math.abs(dayDifference) : 0

  // Визначаємо колір на основі близькості до дати
  const getColorByProximity = () => {
    if (isRecurring) {
      return habit.cycleDays.includes(todayWeekday) ? "#e67e22" : "#3498db"
    }
    if (isOverdue) return "#e74c3c" // Червоний - вже пройшло
    if (dayDifference === 0) return "#e67e22" // Сьогодні
    if (dayDifference === 1) return "#f39c12" // Завтра
    if (dayDifference <= 3) return "#f1c40f" // Ближче
    if (dayDifference <= 7) return "#2ecc71" // Скоро
    return "#3498db" // Далеко
  }

  const pluralizeDays = (count) => {
    if (count === 1) return "день"
    if (count >= 2 && count <= 4) return "дні"
    return "днів"
  }

  const formatDate = (date) => {
    const d = new Date(date)
    return d.toLocaleDateString("uk-UA", { 
      year: "numeric", 
      month: "2-digit", 
      day: "2-digit" 
    })
  }

  const formatTime = (time) => {
    return time || "09:00"
  }

  const formatSnoozedUntil = (date) => {
    if (!date) return null
    const d = new Date(date)
    // show date and time similar to screenshot
    const datePart = d.toLocaleDateString('uk-UA', { year: 'numeric', month: '2-digit', day: '2-digit' })
    const timePart = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
    return `${datePart} о ${timePart}`
  }

  const formatCycleDays = (cycleDays) => {
    if (!Array.isArray(cycleDays) || cycleDays.length === 0) return null

    const labels = {
      0: "Нд",
      1: "Пн",
      2: "Вт",
      3: "Ср",
      4: "Чт",
      5: "Пт",
      6: "Сб"
    }

    return cycleDays.slice().sort((a, b) => a - b).map((day) => labels[day] || day).join(", ")
  }

  const getProximityText = () => {
    if (isRecurring) {
      return `Цикл: ${formatCycleDays(habit.cycleDays)}`
    }
    if (isOverdue) {
      if (overdueDays === 0) return "Сьогодні"
      return `${overdueDays} днів тому`
    }
    if (dayDifference === 0) return "Сьогодні"
    if (dayDifference === 1) return "Завтра"
    return `За ${dayDifference} ${pluralizeDays(dayDifference)}`
  }

  return (
    <div 
      className="habit-card"
      style={{ 
        borderLeftColor: getColorByProximity(),
        backgroundColor: `${getColorByProximity()}15`
      }}
    >
      <div className="habit-header">
        <h3>{habit.title}</h3>
        <button 
          type="button"
          className="btn-danger-small"
          onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete() }}
          title="Видалити"
        >
          ✕
        </button>
      </div>

      <div className="habit-meta">
        <span className="date">📅 {formatDate(habit.date)} o {formatTime(habit.dueTime)}</span>
        <span className="proximity" style={{ color: getColorByProximity() }}>
          {getProximityText()}
        </span>
        {formatCycleDays(habit.cycleDays) && (
          <span className="cycle-badge">🔁 {formatCycleDays(habit.cycleDays)}</span>
        )}
      </div>

      <div className="habit-actions">
        <button 
          className={`btn-toggle ${isCompleted ? "completed" : ""}`}
          onClick={onToggle}
          title={isCompleted ? "Позначити як невиконано" : "Позначити як виконано"}
        >
          {isCompleted ? "✅ Виконано" : "⭕ Невиконано"}
        </button>

        {isCompleted && onShare && (
          <button
            className={`btn-share ${habit.public ? "shared" : ""}`}
            onClick={onShare}
            title={habit.public ? "Приховати досягнення" : "Поділитися досягненням"}
          >
            {habit.public ? "🔒 Приховати" : "✨ Поділитися"}
          </button>
        )}
        
        {habit.reminder && <span className="reminder-badge">🔔 Нагадування</span>}
        {habit.snoozedUntil && new Date(habit.snoozedUntil) > new Date() && (
          <span className="snoozed-badge">⏸ Відкладено до {formatSnoozedUntil(habit.snoozedUntil)}</span>
        )}
      </div>
    </div>
  )
}