import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import jwt from "jsonwebtoken"
import http from "http"
import { Server } from "socket.io"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

import User from "./models/User.js"
import Habit from "./models/Habit.js"
import auth from "./middleware/auth.js"

dotenv.config()

const app = express()
app.use(cors({ origin: "*" }))
app.use(express.json())

// ✅ Mongo
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB connected"))
.catch(err=>console.log(err))

// ✅ SOCKET
const server = http.createServer(app)
const io = new Server(server,{ cors:{origin:"*"} })

let onlineUsers = {}

io.on("connection",(socket)=>{

  socket.on("join",(id)=>{
    onlineUsers[id] = socket.id
  })

  socket.on("sendMessage",(data)=>{
    if(onlineUsers[data.receiver]){
      io.to(onlineUsers[data.receiver]).emit("newMessage",data)
    }
  })

  socket.on("disconnect",()=>{
    for(let id in onlineUsers){
      if(onlineUsers[id] === socket.id){
        delete onlineUsers[id]
      }
    }
  })

})

// ✅ AUTH
app.post("/api/register", async(req,res)=>{
  const user = await User.create(req.body)
  res.json(user)
})

app.post("/api/login", async(req,res)=>{
  const user = await User.findOne({email:req.body.email})

  if(!user) return res.status(404).json("No user")

  const token = jwt.sign(
    {id:user._id, role:user.role},
    process.env.JWT_SECRET
  )

  res.json({token})
})

// ✅ HABITS
app.get("/api/habits",auth, async(req,res)=>{
  const habits = await Habit.find({user:req.user.id})
  res.json(habits)
})

app.post("/api/habits",auth, async(req,res)=>{
  const habit = await Habit.create({
    title:req.body.title,
    user:req.user.id
  })
  res.json(habit)
})

// ✅ ADMIN
app.get("/api/admin",auth, async(req,res)=>{
  if(req.user.role !== "admin") return res.sendStatus(403)
  res.json(await User.find())
})

// ✅ REACT BUILD
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.static(path.join(__dirname, "../client/dist")))

app.use((req,res)=>{
  res.sendFile(path.join(__dirname, "../client/dist/index.html"))
})

// ✅ PORT (Render)
const PORT = process.env.PORT || 5000
server.listen(PORT,()=>console.log("SERVER RUNNING"))