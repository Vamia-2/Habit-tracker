import axios from "axios"

export default function HabitCard({habit,refresh}){

  const complete = async ()=>{
    await axios.post(`/api/habits/${habit._id}/complete`,{},{
      headers:{Authorization:localStorage.getItem("token")}
    })
    refresh()
  }

  return(
    <div className="card fade-in">

      <h3>{habit.title}</h3>

      <p className="streak">{habit.streak} days</p>

      <button className="btn-success" onClick={complete}>
        Виконано
      </button>

      <div className="calendar">
        {habit.completedDates.map((d,i)=>(
          <div key={i} className="day done"></div>
        ))}
      </div>

    </div>
  )
}