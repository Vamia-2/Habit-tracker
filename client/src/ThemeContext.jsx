import { createContext, useContext, useState, useEffect } from "react"

// створюємо контекст
const ThemeContext = createContext()

// provider (обгортка для всього додатку)
export function ThemeProvider({ children }) {

  const [theme, setTheme] = useState("dark")

  // при запуску — беремо тему з localStorage
  useEffect(() => {
    const saved = localStorage.getItem("theme")
    if (saved) setTheme(saved)
  }, [])

  // застосовуємо тему до body
  useEffect(() => {
    document.body.className = theme
    localStorage.setItem("theme", theme)
  }, [theme])

  // перемикання теми
  const toggleTheme = () => {
    if (theme === "dark") setTheme("light")
    else if (theme === "light") setTheme("blue")
    else setTheme("dark")
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}