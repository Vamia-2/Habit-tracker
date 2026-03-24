import axios from "axios"

const api = axios.create({
baseURL: import.meta.env.VITE_API || "http://localhost:5000/api"

})

api.interceptors.request.use(config=>{
  if(localStorage.token){
    config.headers.Authorization = localStorage.token
  }
  return config
})

export default api