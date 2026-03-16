import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function AnalyticsChart({stats}){

if(!stats) return null;

const data = {

labels:["Completed","Not completed"],

datasets:[
{
data:[stats.completed,stats.notCompleted],
backgroundColor:["green","red"]
}
]

};

return(

<div className="chart">

<Pie data={data}/>

</div>

)

}