import axios from "axios"

const hostname = window.location.hostname
const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1"
const defaultHost = isLocalHost ? "http://localhost:5000/api" : "/api"

const api = axios.create({
  baseURL: import.meta.env.VITE_API || defaultHost
})

api.interceptors.request.use(config => {
  if (localStorage.token) {
    config.headers.Authorization = localStorage.token
  }
  return config
})

const parseJwtPayload = (token) => {
  try {
    const encodedPayload = token?.split(".")?.[1]
    if (!encodedPayload) return null
    const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64 + "=".repeat((4 - base64.length % 4) % 4)
    return JSON.parse(window.atob(padded))
  } catch {
    return null
  }
}

export const submitSuggestion = ({ type, text }) => {
  const payload = parseJwtPayload(localStorage.token)
  return api.post("/complaint", {
    reportedUser: payload?.id || "000000000000000000000000",
    reportedUserEmail: null,
    reporterEmail: payload?.email || null,
    reason: `Пропозиція: ${type}`,
    description: text.trim()
  })
}

export default api
