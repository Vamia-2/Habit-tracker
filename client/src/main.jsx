import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import "./style.css"
import { ThemeProvider } from "./ThemeContext.jsx"
import { showToast } from "./components/ToastHost.jsx"

const ALERT_PATCH_FLAG = "__habitTrackerAlertPatched"

if (typeof window !== "undefined" && !window[ALERT_PATCH_FLAG]) {
  window[ALERT_PATCH_FLAG] = true
  window.alert = (message) => {
    showToast(message, "info")
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <App/>
  </ThemeProvider>
)