import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from "chart.js"

import { Line } from "react-chartjs-2"

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
)

export default function LineChart({ habits }) {


  const days = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().slice(0, 10)
  }).reverse()


  const data = {
    labels: days,
    datasets: [
      {
        label: "Активність по днях",
        data: days.map(day =>
          habits.filter(h => h.completedDates.includes(day)).length
        ),


        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.3)",
        tension: 0.4,
        fill: true,
        pointRadius: 4
      }
    ]
  }


  const options = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: "white"
        }
      }
    },
    scales: {
      x: {
        ticks: { color: "white" }
      },
      y: {
        ticks: { color: "white" },
        beginAtZero: true
      }
    }
  }

  return (
    <div className="card">
      <h2>Активність за 7 днів</h2>
      <Line data={data} options={options} />
    </div>
  )
}