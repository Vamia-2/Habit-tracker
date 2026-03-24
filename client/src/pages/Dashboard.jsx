import { useEffect,useState } from "react"
import api from "../api"

export default function Dashboard(){

  const [habits,setHabits] = useState([])
  const [title,setTitle] = useState("")

  const load = async ()=>{
    const res = await api.get("/habits")
    setHabits(res.data)
  }

  useEffect(()=>{load()},[])

  const add = async ()=>{
    await api.post("/habits",{title})
    load()
  }

  return(
    <div>
      <h2>Habits</h2>

      <input onChange={e=>setTitle(e.target.value)}/>
      <button onClick={add}>Add</button>

      {habits.map(h=>(
        <div key={h._id}>{h.title}</div>
      ))}
    </div>
  )
}