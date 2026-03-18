import { useEffect, useState } from "react"
import API_URL from "../api"

export default function Admin(){

  const [habits,setHabits]=useState([])

  useEffect(()=>{
    fetch(`${API_URL}/api/habits/all`,{
      headers:{
        Authorization:`Bearer ${localStorage.getItem("token")}`
      }
    })
    .then(res=>res.json())
    .then(setHabits)
  },[])

  return(
    <div className="container">
      <h2>Admin Panel</h2>

      {habits.map(h=>(
        <div key={h._id} className="card">
          <p>{h.title}</p>
          <small>{h.user}</small>
        </div>
      ))}
    </div>
  )
}