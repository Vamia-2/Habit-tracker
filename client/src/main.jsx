import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import "./style.css"
import ThemeProvider from "./ThemeContext.jsx"

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <App/>
  </ThemeProvider>
)