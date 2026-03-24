export default function HabitCard({ habit, onToggle, onDelete }) {
  const habitDate = new Date(habit.date)
  const today = new Date()
  const daysUntil = Math.ceil((habitDate - today) / (1000 * 60 * 60 * 24))
  
  // Визначаємо колір на основі близькості до дати
  const getColorByProximity = () => {
    if(daysUntil <= 0) return "#e74c3c" // Червоний - вже пройшло
    if(daysUntil === 1) return "#f39c12" // Помаранчевий - завтра
    if(daysUntil <= 3) return "#f1c40f" // Жовтий - близько
    if(daysUntil <= 7) return "#2ecc71" // Зелений - скоро
    return "#3498db" // Синій - далеко
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
    if(daysUntil < 0) return `${Math.abs(daysUntil)} день назад`
    if(daysUntil === 0) return "Сьогодні"
    if(daysUntil === 1) return "Завтра"
    return `За ${daysUntil} днів`
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
        
        {habit.reminder && <span className="reminder-badge">🔔 Нагадування</span>}
      </div>
    </div>
  )
}