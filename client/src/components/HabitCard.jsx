export default function HabitCard({habit,toggle,remove}){

return(

<div className="habit">

<h3>{habit.title}</h3>

<p>
{habit.completed ? "Completed" : "Not completed"}
</p>

<button onClick={()=>toggle(habit._id)}>
Toggle
</button>

<button onClick={()=>remove(habit._id)}>
Delete
</button>

</div>

)

}