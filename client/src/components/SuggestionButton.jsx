import { useState } from "react"
import { submitSuggestion } from "../api"
import { useTheme } from "../ThemeContext"

const suggestionTypes = ["Додати", "Змінити", "Видалити"]

export default function SuggestionButton(){
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState(suggestionTypes[0])
  const [text, setText] = useState("")
  const [status, setStatus] = useState({ kind: "", message: "" })
  const [sending, setSending] = useState(false)
  const { theme } = useTheme()

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedText = text.trim()
    if (!trimmedText) {
      setStatus({ kind: "error", message: "Введіть текст пропозиції" })
      return
    }
    if (!localStorage.token) {
      setStatus({ kind: "error", message: "Увійдіть в акаунт, щоб надіслати пропозицію" })
      return
    }

    try {
      setSending(true)
      setStatus({ kind: "", message: "" })
      await submitSuggestion({ type, text: trimmedText })
      setStatus({ kind: "success", message: "Дякуємо! Пропозицію надіслано." })
      setText("")
      setType(suggestionTypes[0])
    } catch (error) {
      const responseMessage = typeof error.response?.data === "string" ? error.response.data : null
      const message = error.message === "AUTH_REQUIRED"
        ? "Увійдіть в акаунт, щоб надіслати пропозицію"
        : (responseMessage || "Не вдалося надіслати пропозицію")
      setStatus({ kind: "error", message })
    } finally {
      setSending(false)
    }
  }

  const closeModal = () => {
    if (sending) return
    setIsOpen(false)
    setStatus({ kind: "", message: "" })
  }

  return (
    <>
      <button
        className={`suggestion-fab ${theme}`}
        onClick={() => setIsOpen(true)}
        aria-label="Надіслати пропозицію"
      >
        💡
      </button>

      {isOpen && (
        <div className="suggestion-modal-overlay" onClick={closeModal}>
          <div
            className={`suggestion-modal ${theme}`}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Форма пропозиції"
          >
            <h3>Пропозиція</h3>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="suggestion-type">Що потрібно?</label>
                <select
                  id="suggestion-type"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  disabled={sending}
                >
                  {suggestionTypes.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="suggestion-text">Опис</label>
                <textarea
                  id="suggestion-text"
                  rows="5"
                  placeholder="Напишіть, що варто додати, змінити або видалити..."
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  disabled={sending}
                />
              </div>

              {status.message && (
                <p className={`suggestion-status ${status.kind}`}>
                  {status.message}
                </p>
              )}

              <div className="suggestion-actions">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={sending}>
                  Закрити
                </button>
                <button type="submit" className="btn-primary" disabled={sending}>
                  {sending ? "Надсилаємо..." : "Надіслати"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
