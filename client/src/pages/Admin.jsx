import { useEffect,useState } from "react"
import api from "../api"

export default function Admin(){

  const [users,setUsers] = useState([])

  const load = async ()=>{
    const res = await api.get("/admin")
    setUsers(res.data)
  }

  useEffect(()=>{load()},[])

  return(
    <div>
      <h2>Admin</h2>
      {users.map(u=>(
        <div key={u._id}>{u.email} ({u.role})</div>
      ))}
    </div>
  )
}