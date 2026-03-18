import { useState } from "react"
import API_URL from "../api"
import { useNavigate } from "react-router-dom"

export default function Register(){
  const [email,setEmail]=useState("")
  const [password,setPassword]=useState("")
  const navigate = useNavigate()

  const register = async () => {
    await fetch(`${API_URL}/api/register`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ email,password })
    })

    navigate("/")
  }

  return (
    <div className="container">
      <h2>Register</h2>
      <input onChange={e=>setEmail(e.target.value)} placeholder="Email"/>
      <input onChange={e=>setPassword(e.target.value)} type="password"/>
      <button onClick={register}>Register</button>
    </div>
  )
}