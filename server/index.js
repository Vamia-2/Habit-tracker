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
import { rateLimit } from "express-rate-limit"

import User from "./models/User.js"
import Habit from "./models/Habit.js"
import Message from "./models/Message.js"
import Complaint from "./models/Complaint.js"
import Suggestion, { SUGGESTION_TYPES } from "./models/Suggestion.js"
import auth from "./middleware/auth.js"
import { sendPush } from "./push.js"

// Читаємо .env з root директорії
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, "../.env") })

const app = express()

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value)

const pick = (source, allowedKeys) => {
  const output = {}
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      output[key] = source[key]
    }
  }
  return output
}

const normalizeEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : "")

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

  // ✅ Опціонально створюємо стартового адміна лише через змінні середовища
  try {
    const adminEmail = normalizeEmail(process.env.DEFAULT_ADMIN_EMAIL)
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD

    if (adminEmail && adminPassword) {
      const adminExists = await User.findOne({ email: adminEmail })

      if (!adminExists) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10)
        await User.create({
          email: adminEmail,
          password: hashedPassword,
          username: process.env.DEFAULT_ADMIN_USERNAME?.trim() || "admin",
          role: "admin"
        })
        console.log("👑 Стартовий адміністратор створений через .env")
      } else if (adminExists.role !== "admin") {
        adminExists.role = "admin"
        await adminExists.save()
        console.log("👑 Роль стартового адміністратора оновлена")
      } else {
        console.log("👑 Стартовий адміністратор вже існує")
      }
    } else {
      console.log("ℹ️ Стартовий адміністратор не створюється: немає DEFAULT_ADMIN_EMAIL/DEFAULT_ADMIN_PASSWORD")
    }
  } catch(e) {
    if (e.code === 11000) {
      console.log("👑 Стартовий адміністратор вже існує (duplicate key)")
    } else {
      console.error("❌ Не вдалося перевірити / створити стартового адміністратора:", e)
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
        sendPendingReminders()
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
    const normalizedEmail = normalizeEmail(email)

    // Валідація
    if (!normalizedEmail || !password || !username?.trim()) {
      return res.status(400).json("Всі поля обов'язкові")
    }

    if (password.length < 6) {
      return res.status(400).json("Пароль повинен містити мінімум 6 символів")
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({
      email: normalizedEmail,
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
    const normalizedEmail = normalizeEmail(email)

    if (!normalizedEmail || !password) {
      return res.status(400).json("Email та пароль обов'язкові")
    }

    const user = await User.findOne({email: normalizedEmail})
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
app.get("/api/user/:id", auth, async(req,res)=>{
  if (!isValidObjectId(req.params.id)) return res.status(400).json("Некоректний id користувача")
  if (req.user.id !== req.params.id && req.user.role !== "admin") return res.sendStatus(403)

  const user = await User.findById(req.params.id).select("email username avatar role isBlocked blockedUntil createdAt pushSubscription")
  if(!user) return res.status(404).json("No user")

  res.json({
    id: user._id,
    email: user.email,
    username: user.username,
    avatar: user.avatar,
    role: user.role,
    isBlocked: user.isBlocked,
    blockedUntil: user.blockedUntil,
    createdAt: user.createdAt,
    hasPushSubscription: Boolean(user.pushSubscription)
  })
})

app.put("/api/user", auth, async(req,res)=>{
  const updates = pick(req.body, ["username", "avatar", "email"])

  if (typeof updates.username === "string") {
    updates.username = updates.username.trim()
    if (!updates.username) return res.status(400).json("Ім'я користувача не може бути порожнім")
  }

  if (typeof updates.email === "string") {
    updates.email = normalizeEmail(updates.email)
    if (!updates.email) return res.status(400).json("Некоректний email")
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json("Немає дозволених полів для оновлення")
  }

  const user = await User.findByIdAndUpdate(req.user.id, updates, {new: true, runValidators: true})
  res.json({
    id: user._id,
    email: user.email,
    username: user.username,
    avatar: user.avatar,
    role: user.role,
    isBlocked: user.isBlocked,
    blockedUntil: user.blockedUntil
  })
})

// ✅ FOLLOW SYSTEM
app.post("/api/follow/:userId", auth, async(req,res)=>{
  if (!isValidObjectId(req.params.userId)) return res.status(400).json("Некоректний id користувача")
  if (req.user.id === req.params.userId) return res.status(400).json("Неможливо підписатися на себе")

  await User.findByIdAndUpdate(req.user.id, {$addToSet: {following: req.params.userId}})
  await User.findByIdAndUpdate(req.params.userId, {$addToSet: {followers: req.user.id}})
  res.json("Followed")
})

app.post("/api/unfollow/:userId", auth, async(req,res)=>{
  if (!isValidObjectId(req.params.userId)) return res.status(400).json("Некоректний id користувача")

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

const suggestionRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Забагато запитів. Спробуйте пізніше."
})

app.post("/api/habits", auth, ensureNotBlocked, async(req,res)=>{
  const allowedFields = pick(req.body, ["title", "date", "dueTime", "reminder", "public", "notes", "commentsEnabled"])
  if (!allowedFields.title || !allowedFields.date || !allowedFields.dueTime) {
    return res.status(400).json("Потрібні title, date і dueTime")
  }

  const habit = await Habit.create({
    ...allowedFields,
    user:req.user.id
  })
  res.json(habit)
})

app.put("/api/habits/:id", auth, ensureNotBlocked, async(req,res)=>{
  const habit = await Habit.findById(req.params.id)
  if(!habit) return res.status(404).json("Habit not found")
  if(habit.user.toString() !== req.user.id) return res.status(403).json("Forbidden")

  const allowedUpdates = pick(req.body, [
    "title",
    "date",
    "dueTime",
    "reminder",
    "completed",
    "completedAt",
    "public",
    "notes",
    "commentsEnabled",
    "achievementDeleted"
  ])

  if (Object.keys(allowedUpdates).length === 0) {
    return res.status(400).json("Немає дозволених полів для оновлення")
  }

  const reminderConfigTouched = ["date", "dueTime", "reminder"].some((key) =>
    Object.prototype.hasOwnProperty.call(allowedUpdates, key)
  )

  if (reminderConfigTouched) {
    allowedUpdates.reminderSentAt = null
  }

  if (Object.prototype.hasOwnProperty.call(allowedUpdates, "completed")) {
    allowedUpdates.reminderSentAt = allowedUpdates.completed ? new Date() : null
  }

  Object.assign(habit, allowedUpdates)
  await habit.save()
  res.json(habit)
})

app.post("/api/habits/:id/comment", auth, ensureNotBlocked, async(req,res)=>{
  const { text } = req.body
  if(!text) return res.status(400).json("Коментар не може бути порожнім")

  const habit = await Habit.findById(req.params.id)
  if(!habit || !habit.public || habit.deleted) return res.status(404).json("Звичка не знайдена")
  if(habit.commentsEnabled === false) return res.status(403).json("Коментарі вимкнені власником")

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

app.post("/api/suggestion", auth, ensureNotBlocked, suggestionRateLimit, async (req, res) => {
  const { type, text } = req.body

  if (!SUGGESTION_TYPES.includes(type) || !text?.trim()) {
    return res.status(400).json("Потрібні коректні type та text")
  }

  try {
    const suggestion = await Suggestion.create({
      user: req.user.id,
      userEmail: req.user.email || null,
      type,
      text: text.trim()
    })

    res.json(suggestion)
  } catch {
    res.status(500).json("Помилка при збереженні пропозиції")
  }
})

app.get("/api/complaints", auth, async(req,res)=>{
  if(req.user.role !== "admin") return res.sendStatus(403)
  const complaints = await Complaint.find().populate("reporter reportedUser")
  res.json(complaints)
})

app.put("/api/complaint/:id", auth, async(req,res)=>{
  if(req.user.role !== "admin") return res.sendStatus(403)
  
  const complaint = await Complaint.findById(req.params.id)
  if(!complaint) return res.status(404).json("Complaint not found")

  const allowedStatuses = ["approved", "rejected"]
  if (!allowedStatuses.includes(req.body.status)) {
    return res.status(400).json("Недійсний статус скарги")
  }

  const blockDuration = Number.isFinite(Number(req.body.blockDuration))
    ? Math.max(1, Math.min(365, Number(req.body.blockDuration)))
    : (Number.isFinite(Number(complaint.blockDuration)) ? Number(complaint.blockDuration) : 7)

  const duration = blockDuration * 24 * 60 * 60 * 1000
  const blockedUntil = new Date(Date.now() + duration)
  
  if(req.body.status === "approved") {
    await User.findByIdAndUpdate(complaint.reportedUser, {
      isBlocked: true,
      blockedUntil: blockedUntil
    })
  }
  
  const updated = await Complaint.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status, blockDuration, resolvedAt: new Date() },
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
  const users = await User.find().select("email username avatar role isBlocked blockedUntil createdAt followers following")
  res.json(users)
})

app.post("/api/admin/block/:userId", auth, async(req,res)=>{
  if(req.user.role !== "admin") return res.sendStatus(403)
  if (!isValidObjectId(req.params.userId)) return res.status(400).json("Некоректний id користувача")

  const days = Number(req.body.days)
  if (!Number.isFinite(days) || days < 1 || days > 365) return res.status(400).json("Некоректна кількість днів")

  const blockedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const user = await User.findByIdAndUpdate(req.params.userId, {
    isBlocked: true,
    blockedUntil
  }, {new: true})
  res.json(user)
})

app.post("/api/admin/unblock/:userId", auth, async(req,res)=>{
  if(req.user.role !== "admin") return res.sendStatus(403)
  if (!isValidObjectId(req.params.userId)) return res.status(400).json("Некоректний id користувача")

  const user = await User.findByIdAndUpdate(req.params.userId, {
    isBlocked: false,
    blockedUntil: null
  }, {new: true})
  res.json(user)
})

app.put("/api/admin/role/:userId", auth, async(req,res)=>{
  if(req.user.role !== "admin") return res.sendStatus(403)
  if (!isValidObjectId(req.params.userId)) return res.status(400).json("Некоректний id користувача")

  const { role } = req.body
  if (!["admin", "user"].includes(role)) return res.status(400).json("Недійсна роль")

  const user = await User.findByIdAndUpdate(req.params.userId, { role }, { new: true })
  if (!user) return res.status(404).json("Користувача не знайдено")
  res.json(user)
})

app.delete("/api/admin/user/:userId", auth, async(req,res)=>{
  if(req.user.role !== "admin") return res.sendStatus(403)
  if(req.user.id === req.params.userId) return res.status(400).json("Неможливо видалити власний акаунт")

  const user = await User.findById(req.params.userId)
  if(!user) return res.status(404).json("Користувача не знайдено")

  await Promise.all([
    Habit.deleteMany({ user: req.params.userId }),
    Message.deleteMany({
      $or: [
        { sender: req.params.userId },
        { receiver: req.params.userId }
      ]
    }),
    Complaint.deleteMany({
      $or: [
        { reporter: req.params.userId },
        { reportedUser: req.params.userId }
      ]
    }),
    User.findByIdAndDelete(req.params.userId)
  ])

  res.json({ message: "Користувача та пов'язані дані видалено" })
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
