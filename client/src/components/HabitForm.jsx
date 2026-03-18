import { useState } from "react"
import API_URL from "../api"

export default function HabitForm({refresh}){

  const [title,setTitle]=useState("")

  const add = async ()=>{
    await fetch(`${API_URL}/api/habits`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${localStorage.getItem("token")}`
      },
      body:JSON.stringify({ title })
    })

    setTitle("")
    refresh()
  }

  return(
    <div>
      <input value={title} onChange={e=>setTitle(e.target.value)} />
      <button onClick={add}>Add</button>
    </div>
  )
}