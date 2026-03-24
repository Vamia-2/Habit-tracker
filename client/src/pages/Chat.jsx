import { useEffect, useState } from "react"
import { io } from "socket.io-client"
import api from "../api"
import { useTheme } from "../ThemeContext"

const socket = io(import.meta.env.VITE_API ? import.meta.env.VITE_API.replace("/api", "") : "http://localhost:5000")

export default function Chat(){
  const [text, setText] = useState("")
  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const token = localStorage.token
    const decoded = JSON.parse(atob(token.split(".")[1]))
    setCurrentUser(decoded.id)
    
    socket.emit("join", decoded.id)

    socket.on("newMessage", (m) => {
      if(m.sender === selectedUser || m.receiver === selectedUser) {
        setMessages(prev => [...prev, m])
      }
    })

    // Завантажуємо список всіх користувачів
    api.get("/admin/users").then(res => {
      setUsers(res.data.filter(u => u._id !== decoded.id))
    }).catch(err => {
      console.log("Можливо, ви не адмін")
    })

    return () => socket.off("newMessage")
  }, [])

  // Завантажуємо історію повідомлень коли виберемо користувача
  useEffect(() => {
    if(selectedUser) {
      api.get(`/messages/${selectedUser}`).then(res => {
        setMessages(res.data)
      })
    }
  }, [selectedUser])

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
              {theme === "dark" ? "☀️" : theme === "light" ? "🌙" : "🎨"}
            </button>
            <a className="btn-secondary" href="/">← Back</a>
          </div>
        </div>

        <div className="chat-wrapper">
          <div className="users-list">
            <h3>Користувачі</h3>
            <div className="users-container">
              {users.map(u => (
                <button
                  key={u._id}
                  className={`user-button ${selectedUser === u._id ? "active" : ""}`}
                  onClick={() => setSelectedUser(u._id)}
                >
                  <div className="user-button-content">
                    <p className="user-button-name">{u.username || u.email.split("@")[0]}</p>
                    <p className="user-button-email">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="chat-area">
            {selectedUser ? (
              <>
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