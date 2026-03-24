import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import jwt from "jsonwebtoken"
import http from "http"
import { Server } from "socket.io"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"
import bcrypt from "bcryptjs"

import User from "./models/User.js"
import Habit from "./models/Habit.js"
import Message from "./models/Message.js"
import Complaint from "./models/Complaint.js"
import auth from "./middleware/auth.js"

// Читаємо .env з root директорії
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, "../.env") })

const app = express()
app.use(cors({ origin: "*" }))
app.use(express.json())

// ✅ MongoDB підключення з параметрами
console.log("🔄 Підключення до MongoDB...")
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4 // Use IPv4
})
.then(()=>{
  console.log("✅ MongoDB успішно підключена!")
})
.catch(err=>{
  console.error("❌ Помилка підключення MongoDB:", err.message)
  console.error("📝 MONGO_URI:", process.env.MONGO_URI)
  process.exit(1)
})

// ✅ SOCKET (Chat + Real-time)
const server = http.createServer(app)
const io = new Server(server,{ cors:{origin:"*"} })

let onlineUsers = {}

io.on("connection",(socket)=>{
  socket.on("join",(id)=>{
    onlineUsers[id] = socket.id
  })

  socket.on("sendMessage", async (data)=>{
    await Message.create(data)
    if(onlineUsers[data.receiver]){
      io.to(onlineUsers[data.receiver]).emit("newMessage", data)
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
  try {
    const { email, password, username } = req.body
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({
      email,
      password: hashedPassword,
      username: username || email.split("@")[0]
    })
    res.json(user)
  } catch(e) {
    res.status(400).json(e.message)
  }
})

app.post("/api/login", async(req,res)=>{
  try {
    const user = await User.findOne({email:req.body.email})
    if(!user) return res.status(404).json("No user")

    const match = await bcrypt.compare(req.body.password, user.password)
    if(!match) return res.status(401).json("Wrong password")

    const token = jwt.sign(
      {id:user._id, role:user.role},
      process.env.JWT_SECRET
    )

    res.json({token})
  } catch(e) {
    res.status(400).json(e.message)
  }
})

// ✅ USER PROFILE
app.get("/api/user/:id", async(req,res)=>{
  const user = await User.findById(req.params.id)
  if(!user) return res.status(404).json("No user")
  res.json({...user.toObject(), password: undefined})
})

app.put("/api/user", auth, async(req,res)=>{
  const user = await User.findByIdAndUpdate(req.user.id, req.body, {new: true})
  res.json(user)
})

// ✅ FOLLOW SYSTEM
app.post("/api/follow/:userId", auth, async(req,res)=>{
  await User.findByIdAndUpdate(req.user.id, {$addToSet: {following: req.params.userId}})
  await User.findByIdAndUpdate(req.params.userId, {$addToSet: {followers: req.user.id}})
  res.json("Followed")
})

app.post("/api/unfollow/:userId", auth, async(req,res)=>{
  await User.findByIdAndUpdate(req.user.id, {$pull: {following: req.params.userId}})
  await User.findByIdAndUpdate(req.params.userId, {$pull: {followers: req.user.id}})
  res.json("Unfollowed")
})

// ✅ HABITS
app.get("/api/habits", auth, async(req,res)=>{
  const habits = await Habit.find({user:req.user.id})
  res.json(habits)
})

app.post("/api/habits", auth, async(req,res)=>{
  const habit = await Habit.create({
    ...req.body,
    user:req.user.id
  })
  res.json(habit)
})

app.put("/api/habits/:id", auth, async(req,res)=>{
  const habit = await Habit.findByIdAndUpdate(req.params.id, req.body, {new: true})
  res.json(habit)
})

app.delete("/api/habits/:id", auth, async(req,res)=>{
  await Habit.findByIdAndDelete(req.params.id)
  res.json("Deleted")
})

// ✅ MESSAGES
app.get("/api/messages/:userId", auth, async(req,res)=>{
  const messages = await Message.find({
    $or: [
      {sender: req.user.id, receiver: req.params.userId},
      {sender: req.params.userId, receiver: req.user.id}
    ]
  }).sort({createdAt: 1})
  res.json(messages)
})

// ✅ COMPLAINTS
app.post("/api/complaint", auth, async(req,res)=>{
  const complaint = await Complaint.create({
    reporter: req.user.id,
    ...req.body
  })
  res.json(complaint)
})

app.get("/api/complaints", auth, async(req,res)=>{
  if(req.user.role !== "admin") return res.sendStatus(403)
  const complaints = await Complaint.find().populate("reporter reportedUser")
  res.json(complaints)
})

app.put("/api/complaint/:id", auth, async(req,res)=>{
  if(req.user.role !== "admin") return res.sendStatus(403)
  
  const complaint = await Complaint.findById(req.params.id)
  const duration = (complaint.blockDuration || 7) * 24 * 60 * 60 * 1000
  const blockedUntil = new Date(Date.now() + duration)
  
  if(req.body.status === "approved") {
    await User.findByIdAndUpdate(complaint.reportedUser, {
      isBlocked: true,
      blockedUntil: blockedUntil
    })
  }
  
  const updated = await Complaint.findByIdAndUpdate(
    req.params.id,
    { ...req.body, resolvedAt: new Date() },
    { new: true }
  )
  res.json(updated)
})

// ✅ ADMIN
app.get("/api/admin/users", auth, async(req,res)=>{
  if(req.user.role !== "admin") return res.sendStatus(403)
  const users = await User.find()
  res.json(users)
})

app.post("/api/admin/block/:userId", auth, async(req,res)=>{
  if(req.user.role !== "admin") return res.sendStatus(403)
  const { days } = req.body
  const blockedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const user = await User.findByIdAndUpdate(req.params.userId, {
    isBlocked: true,
    blockedUntil
  }, {new: true})
  res.json(user)
})

app.post("/api/admin/unblock/:userId", auth, async(req,res)=>{
  if(req.user.role !== "admin") return res.sendStatus(403)
  const user = await User.findByIdAndUpdate(req.params.userId, {
    isBlocked: false,
    blockedUntil: null
  }, {new: true})
  res.json(user)
})

// ✅ REACT BUILD
app.use(express.static(path.join(__dirname, "../client/dist")))

app.use((req,res)=>{
  res.sendFile(path.join(__dirname, "../client/dist/index.html"))
})

// ✅ PORT (Render)
const PORT = process.env.PORT || 5000
server.listen(PORT,()=>console.log("SERVER RUNNING"))