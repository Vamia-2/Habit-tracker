import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
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

export default function Achievements(){
  const [achievements, setAchievements] = useState([])
  const [commentText, setCommentText] = useState({})
  const [user, setUser] = useState(null)
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

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
      const [achievementsRes, userRes] = await Promise.all([
        api.get("/habits/achievements"),
        api.get(`/user/${decoded.id}`)
      ])

      setAchievements(achievementsRes.data.slice().sort((a, b) => new Date(a.completedAt || a.date) - new Date(b.completedAt || b.date)))
      setUser(userRes.data)
    } catch (error) {
      const status = error?.response?.status
      if (status === 401 || status === 403) {
        navigate("/login")
        return
      }
      console.error("Не вдалося завантажити досягнення", error)
    }
  }

  useEffect(() => { load() }, [])

  const isBlocked = user?.isBlocked && user?.blockedUntil && new Date(user.blockedUntil) > new Date()
  const blockedDays = isBlocked ? Math.max(1, Math.ceil((new Date(user.blockedUntil) - Date.now()) / (1000 * 60 * 60 * 24))) : 0
  const totalAchievements = achievements.length
  const publicAchievements = achievements.filter(item => item.public)
  const privateAchievements = achievements.filter(item => !item.public)
  const commentsEnabledCount = achievements.filter(item => item.public && item.commentsEnabled !== false).length

  const toDayKey = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().slice(0, 10)
  }

  const getLongestStreak = (items) => {
    const uniqueDays = [...new Set(items.map(item => toDayKey(item.completedAt || item.date)).filter(Boolean))]
      .sort((a, b) => new Date(a) - new Date(b))

    if (uniqueDays.length === 0) return 0

    let longest = 1
    let current = 1

    for (let i = 1; i < uniqueDays.length; i++) {
      const prev = new Date(uniqueDays[i - 1])
      const now = new Date(uniqueDays[i])
      const diffDays = Math.round((now - prev) / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        current += 1
        longest = Math.max(longest, current)
      } else {
        current = 1
      }
    }

    return longest
  }

  const parseDueDate = (habit) => {
    const date = new Date(habit.date)
    if (Number.isNaN(date.getTime())) return null

    if (habit.dueTime && typeof habit.dueTime === "string") {
      const [h, m] = habit.dueTime.split(":").map(Number)
      if (!Number.isNaN(h) && !Number.isNaN(m)) {
        date.setHours(h, m, 0, 0)
      }
    }

    return date
  }

  const dueSoonWins = achievements.filter((habit) => {
    const due = parseDueDate(habit)
    const completed = habit.completedAt ? new Date(habit.completedAt) : null
    if (!due || !completed || Number.isNaN(completed.getTime())) return false
    return completed <= due
  }).length

  const morningWins = achievements.filter((habit) => {
    if (!habit.dueTime || typeof habit.dueTime !== "string") return false
    const [hours] = habit.dueTime.split(":").map(Number)
    return !Number.isNaN(hours) && hours < 10
  }).length

  const weekendWins = achievements.filter((habit) => {
    const date = new Date(habit.completedAt || habit.date)
    if (Number.isNaN(date.getTime())) return false
    const day = date.getDay()
    return day === 0 || day === 6
  }).length

  const longestStreak = getLongestStreak(achievements)

  const milestoneAchievements = [
    totalAchievements >= 1 && { id: "first-step", icon: "🌱", title: "Перший крок", subtitle: "Ти відкрив шлях до стабільних звичок." },
    totalAchievements >= 5 && { id: "five-done", icon: "🚀", title: "Розгін", subtitle: "5 виконаних звичок — хороший темп!" },
    totalAchievements >= 10 && { id: "ten-done", icon: "🏅", title: "Двузначний прогрес", subtitle: "10 досягнень у колекції." },
    totalAchievements >= 25 && { id: "twenty-five", icon: "🏆", title: "Майстер ритму", subtitle: "25 досягнень — дисципліна на рівні." },
    totalAchievements >= 50 && { id: "fifty", icon: "👑", title: "Легенда звичок", subtitle: "50+ досягнень — вражаюча стабільність." },
    longestStreak >= 3 && { id: "streak-3", icon: "🔥", title: "Серія 3+", subtitle: `Найдовша серія: ${longestStreak} дні.` },
    longestStreak >= 7 && { id: "streak-7", icon: "💥", title: "Нестримний тиждень", subtitle: `Ти тримав серію ${longestStreak} днів.` },
    dueSoonWins >= 5 && { id: "on-time", icon: "⏱️", title: "Пунктуальність", subtitle: `${dueSoonWins} звичок виконано вчасно.` },
    publicAchievements.length >= 1 && { id: "shared-first", icon: "✨", title: "Відкритий старт", subtitle: "Ти поділився першим публічним досягненням." },
    publicAchievements.length >= 5 && { id: "shared-pro", icon: "🌍", title: "Голос спільноти", subtitle: `${publicAchievements.length} публічних досягнень.` },
    commentsEnabledCount >= 3 && { id: "comments-on", icon: "💬", title: "Діалог відкрито", subtitle: `${commentsEnabledCount} досягнень з відкритими коментарями.` },
    morningWins >= 3 && { id: "morning", icon: "🌅", title: "Ранній драйв", subtitle: `${morningWins} звичок у ранковий час.` },
    weekendWins >= 3 && { id: "weekend", icon: "🎯", title: "Вихідні без пауз", subtitle: `${weekendWins} виконань у вихідні.` }
  ].filter(Boolean)

  const getAchievementTitle = (habit, index) => {
    const isOverdue = habit.completedAt && new Date(habit.completedAt) > new Date(habit.date)
    const templates = ["🏆 Досягнення", "✅ Крок виконано", "🎉 Ще одна перемога", "📈 Прогрес росте"]

    if (habit.streakCount > 1) return `🔥 ${habit.streakCount} днів підряд`
    if (habit.public && habit.commentsEnabled !== false) return "🌍 Публічне досягнення"
    if (habit.public && habit.commentsEnabled === false) return "🔕 Публічне без коментарів"
    if (habit.dueTime && Number(habit.dueTime.split(":")?.[0]) < 10) return "🌅 Ранкова перемога"
    if (index === 0) return isOverdue ? "⚠️ Перше прострочене досягнення" : "🥇 Перша звичка"
    if (isOverdue) return "⚠️ Прострочене досягнення"
    return templates[index % templates.length]
  }

  const getAchievementSubtitle = (habit, index) => {
    const isOverdue = habit.completedAt && new Date(habit.completedAt) > new Date(habit.date)
    const subtitleTemplates = [
      "Ти тримаєш курс і закриваєш заплановане.",
      "Маленькі кроки складаються у великий результат.",
      "Ще один день, ще один виконаний план.",
      "Стабільність перетворюється на стиль життя."
    ]

    if (habit.streakCount > 1) return `Підтримай серію — ${habit.streakCount} дні підряд!`
    if (habit.public && habit.commentsEnabled !== false) return "Досягнення відкрите для інших і для зворотного зв'язку."
    if (habit.public && habit.commentsEnabled === false) return "Ти поділився результатом, але залишив фокус без коментарів."
    if (habit.dueTime && Number(habit.dueTime.split(":")?.[0]) < 10) return "Ранковий ритм додає стабільності на весь день."
    if (index === 0) return isOverdue ? "Перший урок: не пропускай наступну звичку." : "Перший крок на шляху до звички."
    if (isOverdue) return "Не засмучуйся — будь уважнішим наступного разу."
    return subtitleTemplates[index % subtitleTemplates.length]
  }

  const toggleShare = async (habit) => {
    if (isBlocked) {
      return alert(`Ви заблоковані на ${blockedDays} ${blockedDays === 1 ? "день" : "днів"} і не можете змінювати звички.`)
    }

    try {
      await api.put(`/habits/${habit._id}`, {
        public: !habit.public
      })
      load()
    } catch (error) {
      alert("Не вдалося змінити статус спільного досягнення")
    }
  }

  const toggleComments = async (habit) => {
    if (isBlocked) {
      return alert(`Ви заблоковані на ${blockedDays} ${blockedDays === 1 ? "день" : "днів"} і не можете змінювати звички.`)
    }

    try {
      await api.put(`/habits/${habit._id}`, {
        commentsEnabled: habit.commentsEnabled === false
      })
      load()
    } catch (error) {
      alert("Не вдалося змінити налаштування коментарів")
    }
  }

  const deleteAchievement = async (id) => {
    if (!confirm("Видалити досягнення?")) return
    try {
      await api.delete(`/achievements/${id}`)
      setAchievements(prev => prev.filter(item => item._id !== id))
    } catch (error) {
      alert("Не вдалося видалити досягнення")
    }
  }

  const addComment = async (habitId) => {
    if (isBlocked) {
      return alert(`Ви заблоковані на ${blockedDays} ${blockedDays === 1 ? "день" : "днів"} і не можете додавати коментарі.`)
    }

    const text = commentText[habitId]
    if (!text) return

    try {
      await api.post(`/habits/${habitId}/comment`, { text })
      setCommentText(prev => ({ ...prev, [habitId]: "" }))
      load()
    } catch (error) {
      alert("Не вдалося додати коментар")
    }
  }

  return (
    <div className={`dashboard achievements-page ${theme}`}>
      <div className="dashboard-header">
        <h1>🏆 Мої досягнення</h1>
        <div className="header-controls">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Змінити тему">
            {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🎨"}
          </button>
          <button className="btn-secondary" onClick={() => navigate("/")}>← Назад</button>
        </div>
      </div>

      <section className="achievement-hero">
        <div className="achievement-hero-copy">
          <p className="achievement-kicker">Окрема вкладка з досягненнями</p>
          <h2>Твої перемоги зібрані в одному місці</h2>
          <p>
            Тут видно не просто список виконаних звичок, а повну картину прогресу: що вже поділено, що лишається приватним і де відкриті коментарі.
          </p>
        </div>

        <div className="achievement-hero-actions">
          <div className="achievement-pill">
            <span>Всього</span>
            <strong>{totalAchievements}</strong>
          </div>
          <div className="achievement-pill">
            <span>Публічних</span>
            <strong>{publicAchievements.length}</strong>
          </div>
          <div className="achievement-pill">
            <span>Приватних</span>
            <strong>{privateAchievements.length}</strong>
          </div>
          <div className="achievement-pill">
            <span>З коментарями</span>
            <strong>{commentsEnabledCount}</strong>
          </div>
        </div>
      </section>

      {isBlocked && (
        <div className="blocked-banner">
          <h2>Ви заблоковані на {blockedDays} {blockedDays === 1 ? "день" : "днів"}</h2>
          <p>Ви не можете змінювати звички або досягнення до завершення блокування.</p>
        </div>
      )}

      {milestoneAchievements.length > 0 && (
        <section>
          <h2>🎖️ Розблоковані бейджі</h2>
          <div className="achievements-grid">
            {milestoneAchievements.map((badge) => (
              <article key={badge.id} className="achievement-card">
                <h3>{badge.icon} {badge.title}</h3>
                <p className="achievement-note">{badge.subtitle}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {achievements.length === 0 ? (
        <p className="no-habits">У вас поки що немає досягнень.</p>
      ) : (
        <div className="achievements-grid">
          {achievements.map((habit, index) => (
            <div key={habit._id} className="achievement-card achievement-card-large">
              <div className="achievement-header">
                <div>
                  <h3>{getAchievementTitle(habit, index)}</h3>
                  <p className="achievement-note">{getAchievementSubtitle(habit, index)}</p>
                  <p className="achievement-status">
                    {habit.public ? "Публічне досягнення" : "Лише для вас"}
                  </p>
                </div>
                <div className="achievement-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); toggleShare(habit) }}
                    title={habit.public ? "Зробити приватним" : "Поділитися"}
                  >
                    {habit.public ? "🔒 Приховати" : "✨ Поділитися"}
                  </button>
                  {habit.public && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={e => { e.preventDefault(); e.stopPropagation(); toggleComments(habit) }}
                      title={habit.commentsEnabled === false ? "Увімкнути коментарі" : "Вимкнути коментарі"}
                    >
                      {habit.commentsEnabled === false ? "💬 Увімкнути коментарі" : "🚫 Вимкнути коментарі"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-danger-small"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); deleteAchievement(habit._id) }}
                    title="Видалити досягнення"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <p className="achievement-info achievement-info-compact">
                Звичка: {habit.title}
                <br />
                Дата: {new Date(habit.date).toLocaleDateString('uk-UA')} • Час: {habit.dueTime}
              </p>

              <div className="achievement-tags">
                <span className={`achievement-tag ${habit.public ? "shared" : "private"}`}>
                  {habit.public ? "✨ Публічне" : "🔒 Приватне"}
                </span>
                <span className={`achievement-tag ${habit.commentsEnabled === false ? "off" : "on"}`}>
                  {habit.commentsEnabled === false ? "🚫 Коментарі вимкнені" : "💬 Коментарі увімкнені"}
                </span>
              </div>

              {habit.public && (
                <div className="achievement-comments">
                  <h4>Коментарі</h4>
                  {habit.comments?.length === 0 ? (
                    <p className="no-data">Поки що немає коментарів</p>
                  ) : (
                    habit.comments.map((comment, commentIndex) => (
                      <div key={commentIndex} className="comment-row">
                        <strong>{comment.username}</strong>: {comment.text}
                      </div>
                    ))
                  )}

                  {habit.commentsEnabled === false ? (
                    <p className="no-data">Коментарі до цього досягнення вимкнені власником.</p>
                  ) : (
                    <div className="comment-form">
                      <input
                        type="text"
                        placeholder="Залишити коментар..."
                        value={commentText[habit._id] || ""}
                        onChange={e => setCommentText(prev => ({ ...prev, [habit._id]: e.target.value }))}
                      />
                      <button className="btn-primary" onClick={() => addComment(habit._id)}>
                        📝 Відправити
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
