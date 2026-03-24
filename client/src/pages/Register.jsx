import { useState } from "react"
import api from "../api"

export default function Register(){

  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")

  const reg = async ()=>{
    await api.post("/register",{email,password})
    location.href="/login"
  }

  return(
    <div className="center">
      <h2>Register</h2>
      <input onChange={e=>setEmail(e.target.value)}/>
      <input onChange={e=>setPassword(e.target.value)}/>
      <button onClick={reg}>Register</button>
    </div>
  )
}