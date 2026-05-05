import axios from "axios"

const hostname = window.location.hostname
const protocol = window.location.protocol
const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1"
const isNgrok = window.location.hostname.includes('ngrok')

let defaultHost
if (isNgrok) {
  // If using ngrok on frontend, use ngrok backend URL
  // You need to set VITE_BACKEND_NGROK in .env or update this manually
  const backendNgrokUrl = import.meta.env.VITE_BACKEND_NGROK
  defaultHost = backendNgrokUrl || `${protocol}//${hostname}/api`
} else if (isLocalHost) {
  defaultHost = `${protocol}//localhost:5000/api`
} else {
  defaultHost = "/api"
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API || defaultHost
})

api.interceptors.request.use(config => {
  if (localStorage.token) {
    config.headers.Authorization = localStorage.token
  }
  return config
})

export default api