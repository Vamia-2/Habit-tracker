import { useEffect, useState, useRef } from "react"
import { io } from "socket.io-client"
import api from "../api"
import { useTheme } from "../ThemeContext"

const socketBase = import.meta.env.VITE_API ? import.meta.env.VITE_API.replace(/\/api\/?$/, "") : "http://localhost:5000"

export default function Chat(){
  const socketRef = useRef(null)
  const selectedUserRef = useRef(null)
  const [text, setText] = useState("")
  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedUserStats, setSelectedUserStats] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [searchEmail, setSearchEmail] = useState("")
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const token = localStorage.token
    if(!token) {
      window.location.href = "/login"
      return
    }

    let decoded
    try {
      decoded = JSON.parse(atob(token.split(".")[1]))
    } catch {
      window.location.href = "/login"
      return
    }

    setCurrentUser(decoded.id)

    const socket = io(socketBase || "http://localhost:5000")
    socketRef.current = socket

    socket.on("connect", () => {
      socket.emit("join", decoded.id)
    })

    socket.on("connect_error", (error) => {
      console.error("Socket connect error:", error)
    })

    socket.on("newMessage", (m) => {
      if(m.sender === selectedUserRef.current || m.receiver === selectedUserRef.current) {
        setMessages(prev => [...prev, m])
      }
    })

    const loadUsers = async () => {
      try {
        const res = await api.get("/users")
        setUsers(res.data.filter(u =>
          u._id !== decoded.id &&
          u.role !== "admin" &&
          u.username !== "admin" &&
          u.email !== "admin@gmail.com"
        ))
      } catch(e) {
        console.log("Не вдалося завантажити користувачів")
      }
    }

    loadUsers()

    return () => {
      socket.off("newMessage")
      socket.off("connect")
      socket.off("connect_error")
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    selectedUserRef.current = selectedUser
  }, [selectedUser])

  // Завантажуємо історію повідомлень коли виберемо користувача
  useEffect(() => {
    if(selectedUser) {
      api.get(`/messages/${selectedUser}`).then(res => {
        setMessages(res.data)
      })
      api.get(`/user/${selectedUser}/stats`).then(res => {
        setSelectedUserStats(res.data)
      }).catch(() => {
        setSelectedUserStats(null)
      })
    }
  }, [selectedUser])

  const reportUser = async (user) => {
    const reason = prompt(`Вкажіть причину скарги для ${user.username || user.email}`)
    if(!reason) return

    const description = prompt("Опишіть ситуацію детальніше")
    if(description === null) return

    try {
      const token = localStorage.token
      const decoded = JSON.parse(atob(token.split(".")[1]))

      await api.post("/complaint", {
        reportedUser: user._id,
        reportedUserEmail: user.email,
        reason,
        description,
        reporterEmail: decoded.email
      })
      alert("Скаргу відправлено адміну")
    } catch(e) {
      console.error(e)
      alert("Не вдалося відправити скаргу")
    }
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
    (u.username && u.username.toLowerCase().includes(searchEmail.toLowerCase()))
  )

  const send = () => {
    if(!text || !selectedUser) {
      alert("Виберіть користувача та напишіть повідомлення")
      return
    }

    const message = {
      text,
      sender: currentUser,
      receiver: selectedUser,
      createdAt: new Date()
    }

    const socket = socketRef.current
    if (!socket) {
      alert("Socket не підключений. Спробуйте перезавантажити сторінку.")
      return
    }

    socket.emit("sendMessage", message)
    setMessages(prev => [...prev, message])
    setText("")
  }

  return (
    <div className={`chat-page ${theme}`}>
      <div className="chat-container">
        <div className="chat-header">
          <h1>💬 Chat</h1>
          <div className="header-controls">
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🎨"}
            </button>
            <a className="btn-secondary" href="/">← Back</a>
          </div>
        </div>

        <div className="chat-wrapper">
          <div className="users-list">
            <h3>Користувачі</h3>
            <div className="search-row">
              <input
                type="text"
                placeholder="Пошук за email або ім'ям"
                value={searchEmail}
                onChange={e => setSearchEmail(e.target.value)}
              />
            </div>
            <div className="users-container">
              {filteredUsers.length === 0 ? (
                <p className="no-data">Нема користувачів для показу</p>
              ) : (
                filteredUsers.map(u => (
                  <div key={u._id} className="user-card">
                    <button
                      className={`user-button ${selectedUser === u._id ? "active" : ""}`}
                      onClick={() => setSelectedUser(u._id)}
                    >
                      <div className="user-button-content">
                        <p className="user-button-name">{u.username || u.email.split("@")[0]}</p>
                        <p className="user-button-email">{u.email}</p>
                      </div>
                    </button>
                    <button
                      className="btn-secondary small"
                      onClick={(e) => {
                        e.stopPropagation()
                        reportUser(u)
                      }}
                    >
                      🚨 Скарга
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="chat-area">
            {selectedUser ? (
              <>
                <div className="selected-user-summary">
                  <h3>Аналітика користувача</h3>
                  {selectedUserStats ? (
                    <div className="user-stats-row">
                      <div>Користувач: {selectedUserStats.user.username || selectedUserStats.user.email}</div>
                      <div>Виконано: {selectedUserStats.completedCount}</div>
                      <div>Невиконано: {selectedUserStats.pendingCount}</div>
                      <div>Просрочено: {selectedUserStats.overdueCount}</div>
                      <div>Загалом: {selectedUserStats.totalCount}</div>
                      <div>Рейтинг: {selectedUserStats.completionRate}%</div>
                    </div>
                  ) : (
                    <p>Завантаження аналітики...</p>
                  )}
                </div>

                <div className="messages-container">
                  {messages.length === 0 ? (
                    <p className="no-messages">Нема повідомлень. Почніть розмову!</p>
                  ) : (
                    messages.map((m, i) => (
                      <div 
                        key={i}
                        className={`message ${m.sender === currentUser ? "sent" : "received"}`}
                      >
                        <div className="message-content">{m.text}</div>
                        <div className="message-time">
                          {new Date(m.createdAt).toLocaleTimeString("uk-UA", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="chat-input-area">
                  <input
                    type="text"
                    placeholder="Напишіть повідомлення..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyPress={e => e.key === "Enter" && send()}
                  />
                  <button className="btn-primary send-btn" onClick={send}>📤</button>
                </div>
              </>
            ) : (
              <div className="no-chat-selected">
                <p>👈 Виберіть користувача для спілкування</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}