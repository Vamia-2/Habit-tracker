import { Pie } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js"

ChartJS.register(ArcElement, Tooltip, Legend)

export default function AnalyticsChart({habits}){

  const done = habits.filter(h=>h.completed).length
  const notDone = habits.length - done

  const data = {
    labels:["Done","Not Done"],
    datasets:[
      {
        data:[done,notDone]
      }
    ]
  }

  return(
    <div>
      <h3>Analytics</h3>
      <Pie data={data}/>
    </div>
  )
}