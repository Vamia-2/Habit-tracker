import {useEffect,useState} from "react";

import {apiRequest} from "../api";

import HabitCard from "../components/HabitCard";
import AnalyticsChart from "../components/AnalyticsChart";

export default function Dashboard(){

const[habits,setHabits]=useState([]);
const[title,setTitle]=useState("");
const[stats,setStats]=useState(null);

async function load(){

const data = await apiRequest("/habits");

setHabits(data);

const s = await apiRequest("/stats");

setStats(s);

}

useEffect(()=>{

load();

},[]);

async function addHabit(e){

e.preventDefault();

await apiRequest("/habits","POST",{title});

setTitle("");

load();

}

async function toggle(id){

await apiRequest("/habits/"+id,"PUT");

load();

}

async function remove(id){

await apiRequest("/habits/"+id,"DELETE");

load();

}

return(

<div>

<h2>My Habits</h2>

<form onSubmit={addHabit}>

<input
value={title}
onChange={e=>setTitle(e.target.value)}
placeholder="New habit"
/>

<button>Add</button>

</form>

<AnalyticsChart stats={stats}/>

<div className="habits">

{habits.map(h=>(
<HabitCard
key={h._id}
habit={h}
toggle={toggle}
remove={remove}
/>
))}

</div>

</div>

)

}