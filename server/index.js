import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

import User from "./models/User.js"
import Habit from "./models/Habit.js"
import auth from "./middleware/auth.js"

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB connected"))
.catch(err=>console.log(err))

// paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// serve React build
app.use(express.static(path.join(__dirname,"public")))


// ---------------- AUTH ----------------

// register
app.post("/api/register", async(req,res)=>{

try{

const user = new User(req.body)

await user.save()

res.json(user)

}catch(err){

res.status(500).json(err)

}

})


// login
app.post("/api/login", async(req,res)=>{

try{

const user = await User.findOne({email:req.body.email})

if(!user){
return res.status(404).json({message:"User not found"})
}

res.json(user)

}catch(err){

res.status(500).json(err)

}

})



// ---------------- HABITS ----------------

// get habits
app.get("/api/habits",auth,async(req,res)=>{

const habits = await Habit.find({user:req.user.id})

res.json(habits)

})


// create habit
app.post("/api/habits",auth,async(req,res)=>{

const habit = new Habit({

title:req.body.title,
user:req.user.id

})

await habit.save()

res.json(habit)

})


// update habit
app.put("/api/habits/:id",auth,async(req,res)=>{

const habit = await Habit.findByIdAndUpdate(
req.params.id,
req.body,
{new:true}
)

res.json(habit)

})


// delete habit
app.delete("/api/habits/:id",auth,async(req,res)=>{

await Habit.findByIdAndDelete(req.params.id)

res.json({message:"deleted"})

})


// React fallback
app.get("*",(req,res)=>{

res.sendFile(path.join(__dirname,"public","index.html"))

})


// start server
const PORT = process.env.PORT || 5000

app.listen(PORT,()=>{

console.log("Server running on port",PORT)

})