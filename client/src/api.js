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

export default api