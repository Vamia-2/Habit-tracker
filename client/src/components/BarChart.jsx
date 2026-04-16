import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js"

import { Bar } from "react-chartjs-2"

// 🔥 реєстрація модулів (ОБОВ'ЯЗКОВО)
ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
)

export default function BarChart({ habits }) {

  // 📊 дані для графіка
  const data = {
    labels: habits.map(h => h.title),
    datasets: [
      {
        label: "Виконання звичок",
        data: habits.map(h => h.completedDates.length),

        backgroundColor: "rgba(59, 130, 246, 0.7)",
        borderRadius: 10
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
        ticks: {
          color: "white"
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "white",
          stepSize: 1,
          callback: value => Number(value).toFixed(0)
        }
      }
    }
  }

  return (
    <div className="card">
      <h2>Прогрес звичок</h2>
      <Bar data={data} options={options} />
    </div>
  )
}