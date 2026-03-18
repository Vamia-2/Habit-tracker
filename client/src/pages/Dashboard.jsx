import { useEffect, useState } from "react"
import API_URL from "../api"
import HabitForm from "../components/HabitForm"
import HabitList from "../components/HabitList"
import AnalyticsChart from "../components/AnalyticsChart"

export default function Dashboard(){

  const [habits,setHabits]=useState([])

  const fetchHabits = async ()=>{
    const res = await fetch(`${API_URL}/api/habits`,{
      headers:{
        Authorization:`Bearer ${localStorage.getItem("token")}`
      }
    })
    const data = await res.json()
    setHabits(data)
  }

  useEffect(()=>{
    fetchHabits()
  },[])

  return(
    <div className="container">
      <h2>My Habits</h2>

      <HabitForm refresh={fetchHabits}/>
      <HabitList habits={habits} refresh={fetchHabits}/>
      <AnalyticsChart habits={habits}/>
    </div>
  )
}