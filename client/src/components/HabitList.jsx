import API_URL from "../api"

export default function HabitList({habits,refresh}){

  const del = async (id)=>{
    await fetch(`${API_URL}/api/habits/${id}`,{
      method:"DELETE",
      headers:{
        Authorization:`Bearer ${localStorage.getItem("token")}`
      }
    })
    refresh()
  }

  return(
    <div className="grid">
      {habits.map(h=>(
        <div key={h._id} className="card">
          <p>{h.title}</p>
          <button onClick={()=>del(h._id)}>Delete</button>
        </div>
      ))}
    </div>
  )
}