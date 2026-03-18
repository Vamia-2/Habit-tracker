import { useState } from "react"
import API_URL from "../api"
import { useNavigate } from "react-router-dom"

export default function Login() {
  const [email,setEmail]=useState("")
  const [password,setPassword]=useState("")
  const navigate = useNavigate()

  const login = async () => {
    const res = await fetch(`${API_URL}/api/login`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ email,password })
    })

    const data = await res.json()

    localStorage.setItem("token",data.token)
    localStorage.setItem("user",JSON.stringify(data.user))

    if(data.user.role === "admin"){
      navigate("/admin")
    }else{
      navigate("/dashboard")
    }
  }

  return (
    <div className="container">
      <h2>Login</h2>
      <input placeholder="Email" onChange={e=>setEmail(e.target.value)} />
      <input placeholder="Password" type="password" onChange={e=>setPassword(e.target.value)} />
      <button onClick={login}>Login</button>
      <p onClick={()=>navigate("/register")}>Register</p>
    </div>
  )
}