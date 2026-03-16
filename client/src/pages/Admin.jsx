import {useEffect,useState} from "react";
import {apiRequest} from "../api";

export default function Admin(){

const[habits,setHabits]=useState([]);

async function load(){

const data = await apiRequest("/admin/habits");

setHabits(data);

}

useEffect(()=>{

load();

},[]);

return(

<div>

<h2>Admin Panel</h2>

<table>

<thead>
<tr>
<th>User</th>
<th>Habit</th>
<th>Status</th>
</tr>
</thead>

<tbody>

{habits.map(h=>(
<tr key={h._id}>

<td>{h.userId?.email}</td>
<td>{h.title}</td>
<td>{h.completed ? "Done" : "Not done"}</td>

</tr>
))}

</tbody>

</table>

</div>

)

}