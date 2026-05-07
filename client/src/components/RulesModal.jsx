import React from "react"
import api from "../api"

export default function RulesModal({ open, onClose }){
  if (!open) return null

  const handleAgree = async () => {
    try {
      const token = localStorage.getItem("token")
      if (token) {
        // User is logged in - save agreement
        await api.post("/agree-with-rules")
      }
    } catch (e) {
      console.error("Failed to save rules agreement:", e)
    }
    onClose()
  }

  return (
    <div className="rules-overlay" role="dialog" aria-modal="true" aria-label="Правила програми" onClick={onClose}>
      <div className="rules-card" onClick={(e) => e.stopPropagation()}>
        <div className="rules-header">
          <h2>📜 Правила програми</h2>
          <button className="rules-close" onClick={onClose} aria-label="Закрити правила">×</button>
        </div>

        <ul className="rules-list">
          <li><strong>Культурна комунікація:</strong> Заборонено використовувати нецензурну лексику, образи та приниження щодо себе або інших користувачів.</li>
          <li><strong>Коректний контент:</strong> Усі назви звичок, скарги, пропозиції та коментарі повинні бути помірковані та позбавлені провокаційного змісту.</li>
          <li><strong>Особиста безпека:</strong> Категорично забороняються погрози, шантаж та спроби провокування конфліктів.</li>
          <li><strong>Взаємоповага:</strong> Дотримуйтеся взаємної поваги в спілкуванні з іншими користувачами та командою адміністраторів.</li>
          <li><strong>Наслідки порушення:</strong> Порушення цих правил призводять до тимчасового або постійного блокування акаунта та видалення відповідного контенту.</li>
        </ul>

        <button className="btn-primary rules-action" onClick={handleAgree}>Прийняти й закрити</button>
      </div>
    </div>
  )
}
