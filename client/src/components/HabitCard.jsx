export default function HabitCard({ habit, onToggle, onDelete, onShare }) {
  const habitDate = new Date(habit.date)
  const today = new Date()
  const msPerDay = 1000 * 60 * 60 * 24
  const daysUntil = Math.ceil((habitDate - today) / msPerDay)
  const overdueDays = Math.floor((today - habitDate) / msPerDay)
  
  // Визначаємо колір на основі близькості до дати
  const getColorByProximity = () => {
    if(daysUntil < 0) return "#e74c3c" // Червоний - вже пройшло
    if(daysUntil === 0) return "#e67e22" // Сьогодні
    if(daysUntil === 1) return "#f39c12" // Завтра
    if(daysUntil <= 3) return "#f1c40f" // Ближче
    if(daysUntil <= 7) return "#2ecc71" // Скоро
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

  const getProximityText = () => {
    if(daysUntil < 0) {
      const count = Math.abs(overdueDays)
      return `${count} ${pluralizeDays(count)} тому`
    }
    if(daysUntil === 0) return "Сьогодні"
    if(daysUntil === 1) return "Завтра"
    return `За ${daysUntil} ${pluralizeDays(daysUntil)}`
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
          className="btn-danger-small"
          onClick={onDelete}
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
      </div>

      <div className="habit-actions">
        <button 
          className={`btn-toggle ${habit.completed ? "completed" : ""}`}
          onClick={onToggle}
          title={habit.completed ? "Позначити як невиконано" : "Позначити як виконано"}
        >
          {habit.completed ? "✅ Виконано" : "⭕ Невиконано"}
        </button>

        {habit.completed && onShare && (
          <button
            className={`btn-share ${habit.public ? "shared" : ""}`}
            onClick={onShare}
            title={habit.public ? "Приховати досягнення" : "Поділитися досягненням"}
          >
            {habit.public ? "🔒 Приховати" : "✨ Поділитися"}
          </button>
        )}
        
        {habit.reminder && <span className="reminder-badge">🔔 Нагадування</span>}
      </div>
    </div>
  )
}