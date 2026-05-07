import React from "react"

export default function RulesModal({ open, onClose }){
  if (!open) return null

  return (
    <div className="rules-overlay" role="dialog" aria-modal="true" aria-label="Правила програми" onClick={onClose}>
      <div className="rules-card" onClick={(e) => e.stopPropagation()}>
        <div className="rules-header">
          <h2>📜 Правила програми</h2>
          <button className="rules-close" onClick={onClose} aria-label="Закрити правила">×</button>
        </div>

        <ul className="rules-list">
          <li>Не можна писати нецензурну лексику.</li>
          <li>Не можна в "Ім'я" використовувати нецензурну лексику.</li>
          <li>Не можна принижувати, погрожувати чи провокувати конфлікти.</li>
          <li>Пишіть коректні назви звичок, скарг і пропозицій.</li>
          <li>Дотримуйтеся поваги з іншими користувачами та адміністратором.</li>
        </ul>

        <button className="btn-primary rules-action" onClick={onClose}>Зрозуміло</button>
      </div>
    </div>
  )
}
