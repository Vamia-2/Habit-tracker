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
import { sendPush } from "./push.js"

// Читаємо .env з root директорії
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, "../.env") })

const app = express()

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5000",
  "http://127.0.0.1:5000"
].filter(Boolean)

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS blocked by origin: ${origin}`))
    }
  },
  credentials: true
}

// ✅ CORS
app.use(cors(corsOptions))
app.options(/.*/, cors(corsOptions))

app.use(express.json())

// ✅ MongoDB підключення з параметрами
console.log("🔄 Підключення до MongoDB...")
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4 // Use IPv4
})
.then(async ()=>{
  console.log("✅ MongoDB успішно підключена!")

  // ✅ Створюємо адміністратора, якщо його немає
  try {
    const adminExists = await User.findOne({
      $or: [
        { email: "admin@gmail.com" },
        { username: "admin" }
      ]
    })

    const hashedPassword = await bcrypt.hash("1234", 10)
    if(!adminExists) {
      await User.create({
        email: "admin@gmail.com",
        password: hashedPassword,
        username: "admin",
        role: "admin"
      })
      console.log("👑 Адміністратор створений: admin@gmail.com / 1234")
    } else {
      let updated = false
      if(adminExists.role !== "admin") {
        adminExists.role = "admin"
        updated = true
      }
      const passwordMatches = await bcrypt.compare("1234", adminExists.password)
      if(!passwordMatches) {
        adminExists.password = hashedPassword
        updated = true
      }
      if(updated) {
        await adminExists.save()
        console.log("👑 Адміністратор оновлений: admin@gmail.com / 1234")
      } else {
        console.log("👑 Адміністратор вже існує")
      }
    }
  } catch(e) {
        if (e.code === 11000) {
          console.log("👑 Адміністратор вже існує (duplicate key)")
        } else {
          console.error("❌ Не вдалося перевірити / створити адміністратора:", e)
        }
      }

      const startReminderScheduler = () => {
        const reminderWindowMs = 5 * 60 * 1000
        const checkIntervalMs = 60 * 1000

        const sendPendingReminders = async () => {
          try {
            const now = new Date()
            const windowStart = new Date(now.getTime() - reminderWindowMs)
            const windowEnd = new Date(now.getTime() + checkIntervalMs)

            const habits = await Habit.find({
              reminder: true,
              completed: false,
              deleted: false,
              reminderSentAt: null
            }).populate("user", "pushSubscription username email")

            for (const habit of habits) {
              if (!habit.user?.pushSubscription) continue
              if (!habit.dueTime || !habit.date) continue

              const dueDate = new Date(habit.date)
              const [hours, minutes] = habit.dueTime.split(":").map(Number)
              if (Number.isNaN(hours) || Number.isNaN(minutes)) continue
              dueDate.setHours(hours, minutes, 0, 0)

              if (dueDate < windowStart || dueDate > windowEnd) continue

              const payload = {
                title: `🔔 Нагадування: ${habit.title}`,
                body: `Звичка запланована на ${dueDate.toLocaleDateString("uk-UA")} о ${habit.dueTime}`
              }

              try {
                await sendPush(habit.user.pushSubscription, payload)
                habit.reminderSentAt = new Date()
                await habit.save()
                console.log(`⏰ Push reminder sent for habit ${habit._id}`)
              } catch (e) {
                console.error("❌ Не вдалося відправити нагадування для звички:", habit._id, e)
              }
            }
          } catch (e) {
            console.error("❌ Помилка планувальника нагадувань:", e)
          }
        }

        setInterval(sendPendingReminders, checkIntervalMs)
        console.log("⏰ Scheduler for habit reminders started")
      }

      startReminderScheduler()
    })
    .catch(err => {
      console.error("❌ Помилка підключення MongoDB:", err.message)
      console.error("📝 MONGO_URI:", process.env.MONGO_URI)
      process.exit(1)
    })

// ✅ SOCKET (Chat + Real-time)
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
})

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

    // Валідація
    if (!email || !password || !username) {
      return res.status(400).json("Всі поля обов'язкові")
    }

    if (password.length < 6) {
      return res.status(400).json("Пароль повинен містити мінімум 6 символів")
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      username: username.trim()
    })

    res.json({
      message: "Користувач успішно зареєстрований",
      user: {
        id: user._id,
        email: user.email,
        username: user.username
      }
    })
  } catch(e) {
    console.error("Registration error:", e)

    // Обробка помилок дублікатів
    if (e.code === 11000) {
      const field = Object.keys(e.keyValue)[0]
      if (field === 'email') {
        return res.status(400).json("Користувач з таким email вже існує")
      }
      if (field === 'username') {
        return res.status(400).json("Користувач з таким ім'ям вже існує")
      }
    }

    res.status(500).json("Помилка сервера при реєстрації")
  }
})

app.post("/api/login", async(req,res)=>{
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json("Email та пароль обов'язкові")
    }

    const user = await User.findOne({email: email.toLowerCase()})
    if(!user) return res.status(404).json("Користувач не знайдений")

    if (user.isBlocked) {
      return res.status(403).json("Аккаунт заблоковано")
    }

    const match = await bcrypt.compare(password, user.password)
    if(!match) return res.status(401).json("Невірний пароль")

    const token = jwt.sign(
      {id:user._id, email:user.email, role:user.role},
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    })
  } catch(e) {
    console.error("Login error:", e)
    res.status(500).json("Помилка сервера при вході")
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
  const habits = await Habit.find({user:req.user.id, deleted:false})
  res.json(habits)
})

app.get("/api/habits/achievements", auth, async(req,res)=>{
  const achievements = await Habit.find({user:req.user.id, completed:true, achievementDeleted:false}).sort({ completedAt: 1, date: 1 })
  res.json(achievements)
})

app.delete("/api/achievements/:id", auth, async(req,res)=>{
  const habit = await Habit.findById(req.params.id)
  if(!habit) return res.status(404).json("Habit not found")
  if(habit.user.toString() !== req.user.id) return res.status(403).json("Forbidden")
  habit.achievementDeleted = true
  await habit.save()
  res.json(habit)
})

app.get("/api/habits/public", auth, async(req,res)=>{
  const habits = await Habit.find({public:true, deleted:false}).populate("user", "username email")
  res.json(habits)
})

const ensureNotBlocked = (req, res, next) => {
  if (req.user?.isBlocked) {
    return res.status(403).json("Ваш аккаунт тимчасово заблоковано")
  }
  next()
}

app.post("/api/habits", auth, ensureNotBlocked, async(req,res)=>{
  const habit = await Habit.create({
    ...req.body,
    user:req.user.id
  })
  res.json(habit)
})

app.put("/api/habits/:id", auth, ensureNotBlocked, async(req,res)=>{
  const habit = await Habit.findById(req.params.id)
  if(!habit) return res.status(404).json("Habit not found")
  if(habit.user.toString() !== req.user.id) return res.status(403).json("Forbidden")
  Object.assign(habit, req.body)
  await habit.save()
  res.json(habit)
})

app.post("/api/habits/:id/comment", auth, ensureNotBlocked, async(req,res)=>{
  const { text } = req.body
  if(!text) return res.status(400).json("Коментар не може бути порожнім")

  const habit = await Habit.findById(req.params.id)
  if(!habit || !habit.public || habit.deleted) return res.status(404).json("Звичка не знайдена")

  habit.comments.push({
    userId: req.user.id,
    username: req.user.username || req.user.email,
    text,
    createdAt: new Date()
  })

  await habit.save()
  res.json(habit)
})

app.delete("/api/habits/:id", auth, ensureNotBlocked, async(req,res)=>{
  const habit = await Habit.findById(req.params.id)
  if(!habit) return res.status(404).json("Habit not found")
  if(habit.user.toString() !== req.user.id) return res.status(403).json("Forbidden")
  habit.deleted = true
  habit.deletedAt = new Date()
  await habit.save()
  res.json("Deleted")
})

app.get("/api/users", auth, async(req,res)=>{
  const filter = { _id: { $ne: req.user.id } }
  if(req.query.email) {
    filter.email = { $regex: req.query.email, $options: "i" }
  }
  const users = await User.find(filter).select("username email role isBlocked")
  res.json(users)
})

app.get("/api/user/:id/stats", auth, async(req,res)=>{
  const user = await User.findById(req.params.id).select("username email")
  if(!user) return res.status(404).json("User not found")

  const habits = await Habit.find({ user: req.params.id })
  const completedCount = habits.filter(h => h.completed).length
  const overdueCount = habits.filter(h => !h.completed && new Date(h.date) < new Date()).length
  const pendingCount = habits.filter(h => !h.completed && new Date(h.date) >= new Date()).length
  const totalCount = habits.length
  const completionRate = totalCount ? Math.round((completedCount / totalCount) * 100) : 0

  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().slice(0, 10)
  }).reverse()

  const activity = last7Days.map(day => ({
    date: day,
    completed: habits.filter(h => h.completedAt && h.completedAt.toISOString().slice(0, 10) === day).length
  }))

  res.json({
    user,
    totalCount,
    completedCount,
    overdueCount,
    pendingCount,
    completionRate,
    activity
  })
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
app.post("/api/complaint", auth, ensureNotBlocked, async(req,res)=>{
  const { reportedUser, reportedUserEmail, reason, description, reporterEmail } = req.body
  if(!reportedUser || !reason) return res.status(400).json("Потрібні reportedUser та reason")

  const complaint = await Complaint.create({
    reporter: req.user.id,
    reporterEmail: reporterEmail || null,
    reportedUser,
    reportedUserEmail: reportedUserEmail || null,
    reason,
    description
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

app.delete("/api/complaint/:id", auth, async(req,res)=>{
  if(req.user.role !== "admin") return res.sendStatus(403)
  await Complaint.findByIdAndDelete(req.params.id)
  res.json({ message: "Complaint deleted" })
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

app.put("/api/admin/role/:userId", auth, async(req,res)=>{
  if(req.user.role !== "admin") return res.sendStatus(403)
  const { role } = req.body
  if (!["admin", "user"].includes(role)) return res.status(400).json("Недійсна роль")

  const user = await User.findByIdAndUpdate(req.params.userId, { role }, { new: true })
  if (!user) return res.status(404).json("Користувача не знайдено")
  res.json(user)
})

app.get("/api/push-public-key", auth, async(req,res)=>{
  const publicKey = process.env.PUBLIC_KEY
  if(!publicKey) return res.status(500).json("VAPID public key not configured")
  res.json({ publicKey })
})

app.post("/api/subscribe", auth, async(req,res)=>{
  const subscription = req.body
  if(!subscription || !subscription.endpoint) return res.status(400).json("Invalid subscription")

  await User.findByIdAndUpdate(req.user.id, { pushSubscription: subscription })
  res.json("Subscribed")
})

app.post("/api/push/send", auth, async(req,res)=>{
  const user = await User.findById(req.user.id)
  if(!user?.pushSubscription) return res.status(400).json("Push subscription not found")

  const payload = {
    title: req.body.title || "Habit Tracker",
    body: req.body.body || "Тестове push-повідомлення"
  }

  try {
    await sendPush(user.pushSubscription, payload)
    res.json("Push sent")
  } catch (e) {
    console.error("Push send error:", e)
    res.status(500).json("Failed to send push notification")
  }
})

app.get("/api/admin/habits-stats", auth, async(req,res)=>{
  if(req.user.role !== "admin") return res.sendStatus(403)
  
  const habits = await Habit.find().populate('user', 'username email')
  
  // Статистика по днях (останні 30 днів)
  const last30Days = [...Array(30)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().slice(0, 10)
  }).reverse()
  
  const dailyStats = last30Days.map(day => ({
    date: day,
    completed: habits.filter(h => h.completedAt && h.completedAt.toISOString().slice(0, 10) === day).length,
    total: habits.length
  }))
  
  // Статистика по користувачах
  const userStats = habits.reduce((acc, habit) => {
    const userId = habit.user._id.toString()
    if(!acc[userId]) {
      acc[userId] = {
        user: habit.user,
        totalHabits: 0,
        completedHabits: 0,
        completionRate: 0
      }
    }
    acc[userId].totalHabits++
    if(habit.completed) acc[userId].completedHabits++
    acc[userId].completionRate = Math.round((acc[userId].completedHabits / acc[userId].totalHabits) * 100)
    return acc
  }, {})
  
  res.json({
    totalHabits: habits.length,
    completedHabits: habits.filter(h => h.completed).length,
    dailyStats,
    userStats: Object.values(userStats)
  })
})

// ✅ REACT BUILD
app.use(express.static(path.join(__dirname, "../client/dist")))

app.use((req,res)=>{
  res.sendFile(path.join(__dirname, "../client/dist/index.html"))
})

// ✅ PORT (Render)
const PORT = process.env.PORT || 5000
server.listen(PORT,()=>console.log("SERVER RUNNING"))