import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import jwt from "jsonwebtoken"
import http from "http"
import https from "https"
import fs from "fs"
import net from "net"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import nodemailer from "nodemailer"
import rateLimit from "express-rate-limit"
import selfsigned from 'selfsigned'

import User from "./models/User.js"
import Habit from "./models/Habit.js"
import Complaint from "./models/Complaint.js"
import Suggestion from "./models/Suggestion.js"
import auth from "./middleware/auth.js"
import { sendPush } from "./push.js"

// Читаємо .env з root директорії
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, "../.env") })

const app = express()

// ✅ Auth rate limiters
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Забагато запитів. Спробуйте через 15 хвилин."
})

const verifyEmailRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Забагато запитів. Спробуйте через 15 хвилин."
})

// ✅ Email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 години

const generateVerificationToken = () => ({
  token: crypto.randomBytes(32).toString("hex"),
  expires: new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS)
})

const sendVerificationEmail = async (to, token) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173"
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@habit-tracker.com"

  await emailTransporter.sendMail({
    from,
    to,
    subject: "Підтвердіть вашу електронну пошту — Habit Tracker",
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h2 style="margin-bottom: 8px;">🎯 Habit Tracker</h2>
        <p style="color: #475569;">Дякуємо за реєстрацію! Натисніть кнопку нижче, щоб підтвердити вашу електронну пошту.</p>
        <a href="${verifyUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 28px; background: #6366f1; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Підтвердити email
        </a>
        <p style="color: #94a3b8; font-size: 13px;">Посилання дійсне протягом 24 годин. Якщо ви не реєструвалися — просто ігноруйте цей лист.</p>
        <p style="color: #cbd5e1; font-size: 12px; margin-top: 8px; word-break: break-all;">${verifyUrl}</p>
      </div>
    `
  })
}

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

const normalizeCycleDays = (value) => {
  if (!Array.isArray(value)) return []

  return [...new Set(
    value
      .map((day) => Number(day))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  )].sort((a, b) => a - b)
}

const toLocalDayKey = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

const parseDueAt = (dateValue, dueTime) => {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null

  const hasExplicitTimeInDateString =
    typeof dateValue === "string" && /T\d{2}:\d{2}/.test(dateValue)

  if (!hasExplicitTimeInDateString && typeof dueTime === "string" && /^\d{2}:\d{2}$/.test(dueTime)) {
    const [hours, minutes] = dueTime.split(":").map(Number)
    date.setHours(hours, minutes, 0, 0)
  }

  return date
}

const setTimeOnDate = (sourceDate, dueTime) => {
  const date = new Date(sourceDate)
  const [hours, minutes] = typeof dueTime === "string" && /^\d{2}:\d{2}$/.test(dueTime)
    ? dueTime.split(":").map(Number)
    : [9, 0]

  date.setHours(hours, minutes, 0, 0)
  return date
}

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "https://localhost:5173",
  "https://localhost:5174",
  "https://127.0.0.1:5173",
  "https://127.0.0.1:5174",
  "https://localhost:5176",
  "https://127.0.0.1:5176",
  "https://localhost:5000",
  "https://127.0.0.1:5000"
].filter(Boolean)

const isLocalDevOrigin = (origin) => {
  return /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(origin)
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS blocked by origin: ${origin}`))
    }
  },
  credentials: true
}

// Note: permissive CORS used only during debugging; ensure env is not set in production

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
          role: "admin",
          isVerified: true
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
        const staleReminderToleranceMs = 24 * 60 * 60 * 1000
        const checkIntervalMs = 60 * 1000

        const sendPendingReminders = async () => {
          try {
            const now = new Date()
            const windowEnd = new Date(now.getTime() + checkIntervalMs)
            const oldestAllowedDueAt = new Date(now.getTime() - staleReminderToleranceMs)

            const habits = await Habit.find({
              reminder: true,
              deleted: false
            }).populate("user", "pushSubscription username email")

            for (const habit of habits) {
              if (!habit.user?.pushSubscription) continue
              if (!habit.date) continue

              const cycleDays = normalizeCycleDays(habit.cycleDays)
              const isRecurring = cycleDays.length > 0
              const dueAt = parseDueAt(habit.date, habit.dueTime)
              if (!dueAt) continue

              if (isRecurring) {
                const today = new Date()
                if (!cycleDays.includes(today.getDay())) continue

                const todayKey = toLocalDayKey(today)
                const lastReminderKey = habit.reminderSentAt ? toLocalDayKey(new Date(habit.reminderSentAt)) : null
                
                // Reset if completion is from past day
                const completedTodayKey = habit.completedAt ? toLocalDayKey(new Date(habit.completedAt)) : null
                if (habit.completed && completedTodayKey !== todayKey) {
                  habit.completed = false
                  habit.completedAt = null
                  await habit.save()
                }

                // Skip if already reminded today or already completed today
                if (lastReminderKey === todayKey || (habit.completed && completedTodayKey === todayKey)) continue

                const recurringDueAt = setTimeOnDate(today, habit.dueTime)
                if (today < recurringDueAt) continue

                const payload = {
                  title: `🔔 Нагадування: ${habit.title}`,
                  body: `Цикл на сьогодні: ${today.toLocaleDateString("uk-UA")} о ${recurringDueAt.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}`
                }

                try {
                  await sendPush(habit.user.pushSubscription, payload)
                  habit.reminderSentAt = new Date()
                  await habit.save()
                  console.log(`⏰ Push reminder sent for recurring habit ${habit._id}`)
                } catch (e) {
                  console.error("❌ Не вдалося відправити нагадування для циклічної звички:", habit._id, e)
                }

                continue
              }

              if (habit.completed) continue
              if (habit.reminderSentAt) continue

              if (dueAt > windowEnd || dueAt < oldestAllowedDueAt) continue

              const dueTimeLabel = habit.dueTime || dueAt.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })

              const payload = {
                title: `🔔 Нагадування: ${habit.title}`,
                body: `Звичка запланована на ${dueAt.toLocaleDateString("uk-UA")} о ${dueTimeLabel}`
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

// Socket / chat removed (chat replaced by complaint flow)

// ✅ AUTH
app.post("/api/register", authRateLimit, async(req,res)=>{
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

    const { token: verificationToken, expires: verificationExpires } = generateVerificationToken()

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      username: username.trim(),
      isVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    })

    try {
      await sendVerificationEmail(normalizedEmail, verificationToken)
    } catch (emailErr) {
      console.error("Помилка надсилання email підтвердження:", emailErr)
      // Акаунт збережено, але лист не надіслано — користувач зможе запросити повторне надсилання
      return res.status(500).json("Акаунт створено, але не вдалося надіслати лист підтвердження. Скористайтесь повторним надсиланням на сторінці входу.")
    }

    res.json({
      message: "Реєстрацію успішно завершено. Перевірте вашу електронну пошту для підтвердження акаунта.",
      email: user.email
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

app.post("/api/login", authRateLimit, async(req,res)=>{
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

// ✅ EMAIL VERIFICATION
app.get("/api/verify-email/:token", verifyEmailRateLimit, async(req,res)=>{
  try {
    const { token } = req.params

    if (!token) {
      return res.status(400).json("Токен підтвердження відсутній")
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    })

    if (!user) {
      return res.status(400).json("Посилання для підтвердження недійсне або термін його дії закінчився")
    }

    user.isVerified = true
    user.emailVerificationToken = null
    user.emailVerificationExpires = null
    await user.save()

    res.json({ message: "Email успішно підтверджено! Тепер ви можете увійти." })
  } catch(e) {
    console.error("Verify email error:", e)
    res.status(500).json("Помилка сервера при підтвердженні email")
  }
})

app.post("/api/resend-verification", authRateLimit, async(req,res)=>{
  try {
    const { email } = req.body
    const normalizedEmail = normalizeEmail(email)

    if (!normalizedEmail) {
      return res.status(400).json("Email обов'язковий")
    }

    const user = await User.findOne({ email: normalizedEmail })

    if (!user) {
      return res.status(404).json("Користувач не знайдений")
    }

    if (user.isVerified) {
      return res.status(400).json("Цей акаунт вже підтверджено")
    }

    const { token: verificationToken, expires: verificationExpires } = generateVerificationToken()
    user.emailVerificationToken = verificationToken
    user.emailVerificationExpires = verificationExpires
    await user.save()

    try {
      await sendVerificationEmail(normalizedEmail, verificationToken)
    } catch (emailErr) {
      console.error("Помилка повторного надсилання email підтвердження:", emailErr)
      return res.status(500).json("Не вдалося надіслати лист підтвердження. Спробуйте пізніше.")
    }

    res.json({ message: "Лист підтвердження надіслано повторно. Перевірте вашу пошту." })
  } catch(e) {
    console.error("Resend verification error:", e)
    res.status(500).json("Помилка сервера при повторному надсиланні листа")
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

app.post("/api/habits", auth, ensureNotBlocked, async(req,res)=>{
  const allowedFields = pick(req.body, ["title", "date", "dueTime", "reminder", "public", "notes", "commentsEnabled", "cycleDays"])
  if (!allowedFields.title || !allowedFields.date || !allowedFields.dueTime) {
    return res.status(400).json("Потрібні title, date і dueTime")
  }

  allowedFields.cycleDays = normalizeCycleDays(allowedFields.cycleDays)

  const habit = await Habit.create({
    ...allowedFields,
    reminderSentAt: null,
    user:req.user.id
  })

  const habits = await Habit.find({ user: req.user.id, deleted: false }).sort({ createdAt: -1 }).select("_id")
  const maxHabits = 20
  if (habits.length > maxHabits) {
    const excessIds = habits.slice(maxHabits).map((item) => item._id)
    await Habit.deleteMany({ _id: { $in: excessIds } })
  }

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
    "cycleDays",
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

  if (Object.prototype.hasOwnProperty.call(allowedUpdates, "cycleDays")) {
    allowedUpdates.cycleDays = normalizeCycleDays(allowedUpdates.cycleDays)
  }

  const reminderConfigTouched = ["date", "dueTime", "reminder", "cycleDays"].some((key) =>
    Object.prototype.hasOwnProperty.call(allowedUpdates, key)
  )

  if (reminderConfigTouched) {
    allowedUpdates.reminderSentAt = null
  }

  if (Object.prototype.hasOwnProperty.call(allowedUpdates, "completed")) {
    if (allowedUpdates.completed) {
      allowedUpdates.completedAt = new Date()
      allowedUpdates.reminderSentAt = new Date()
    } else {
      allowedUpdates.completedAt = null
    }
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

// Messages API removed (chat converted to complaints)

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

app.post("/api/suggestions", auth, async(req,res)=>{
  try {
    const text = typeof req.body.text === "string" ? req.body.text.trim() : ""
    if (!text) return res.status(400).json("Потрібен текст пропозиції")

    const suggestion = await Suggestion.create({
      reporter: req.user.id,
      reporterEmail: req.user.email || null,
      text
    })

    res.json(suggestion)
  } catch (err) {
    res.status(400).json(err.message || "Помилка при створенні пропозиції")
  }
})

app.get("/api/suggestions", auth, async(req,res)=>{
  try {
    if(req.user.role !== "admin") return res.sendStatus(403)
    const suggestions = await Suggestion.find().sort({ createdAt: -1 }).populate("reporter", "username email")
    res.json(suggestions)
  } catch (err) {
    res.status(500).json(err.message || "Помилка при отриманні пропозицій")
  }
})

app.put("/api/suggestion/:id", auth, async(req,res)=>{
  try {
    if(req.user.role !== "admin") return res.sendStatus(403)

    const suggestion = await Suggestion.findById(req.params.id)
    if(!suggestion) return res.status(404).json("Suggestion not found")

    const status = req.body.status === "read" ? "read" : suggestion.status
    const updated = await Suggestion.findByIdAndUpdate(
      req.params.id,
      { status, adminComment: req.body.adminComment || suggestion.adminComment, resolvedAt: status === "read" ? new Date() : suggestion.resolvedAt },
      { new: true }
    ).populate("reporter", "username email")

    res.json(updated)
  } catch (err) {
    res.status(500).json(err.message || "Помилка при оновленні пропозиції")
  }
})

app.delete("/api/suggestion/:id", auth, async(req,res)=>{
  try {
    if(req.user.role !== "admin") return res.sendStatus(403)
    await Suggestion.findByIdAndDelete(req.params.id)
    res.json({ message: "Suggestion deleted" })
  } catch (err) {
    res.status(500).json(err.message || "Помилка при видаленні пропозиції")
  }
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
    // Message model removed; chat/messages cleaned up
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
  console.log("📥 Subscribe request from user:", req.user.id)
  console.log("📥 Subscription endpoint:", subscription?.endpoint?.substring(0, 50) + "...")
  
  if(!subscription || !subscription.endpoint) {
    console.error("❌ Invalid subscription received")
    return res.status(400).json("Invalid subscription")
  }

  try {
    await User.findByIdAndUpdate(req.user.id, { pushSubscription: subscription })
    console.log("✅ Subscription saved for user:", req.user.id)
    res.json("Subscribed")
  } catch (e) {
    console.error("❌ Error saving subscription:", e.message)
    res.status(500).json("Failed to save subscription")
  }
})

app.post("/api/push/send", auth, async(req,res)=>{
  console.log("📬 Push send request from user:", req.user.id)
  const user = await User.findById(req.user.id)
  
  if(!user?.pushSubscription) {
    console.error("❌ Push subscription not found for user:", req.user.id)
    return res.status(400).json("Push subscription not found")
  }

  console.log("📬 Found subscription:", user.pushSubscription.endpoint.substring(0, 50) + "...")
  const payload = {
    title: req.body.title || "Habit Tracker",
    body: req.body.body || "Тестове push-повідомлення"
  }

  try {
    console.log("📬 Attempting to send push...")
    await sendPush(user.pushSubscription, payload)
    console.log("✅ Push sent successfully")
    res.json("Push sent")
  } catch (e) {
    console.error("❌ Push send error:", e.message, "Status code:", e?.statusCode)

    const statusCode = e?.statusCode || e?.status
    if (statusCode === 404 || statusCode === 410) {
      console.warn("⚠️ Subscription expired, cleaning up")
      await User.findByIdAndUpdate(req.user.id, { pushSubscription: null })
      return res.status(410).json("Push subscription expired. Please re-enable notifications.")
    }

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

const canListenOnPort = (port) => {
  return new Promise((resolve) => {
    const tester = net.createServer()

    tester.once("error", (error) => {
      if (error?.code === "EADDRINUSE") {
        resolve(false)
      } else {
        console.error("❌ Port check failed:", error)
        resolve(false)
      }
    })

    tester.once("listening", () => {
      tester.close(() => resolve(true))
    })

    tester.listen(port, "0.0.0.0")
  })
}

const startServer = async () => {
  const portAvailable = await canListenOnPort(PORT)

  if (!portAvailable) {
    console.log(`ℹ️ Port ${PORT} is already in use. Another server instance is probably running.`)
    process.exit(0)
  }

  const useHttps = process.env.USE_HTTPS === 'true' || process.env.HTTPS === 'true'

  if (useHttps) {
    try {
      const certPath = path.join(__dirname, "../localhost-cert.pem")
      const keyPath = path.join(__dirname, "../localhost-key.pem")
      const httpsOptions = fs.existsSync(certPath) && fs.existsSync(keyPath)
        ? {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
          }
        : (() => {
            const attrs = selfsigned.generate([{ name: 'commonName', value: 'localhost' }], { days: 365, keySize: 2048, altNames: ['localhost', '127.0.0.1'] })
            return { key: attrs.private, cert: attrs.cert }
          })()

      const server = https.createServer(httpsOptions, app)
      server.listen(PORT, () => console.log(`SERVER RUNNING (HTTPS) on port ${PORT}`))

      server.on('error', (error) => {
        if (error?.code === 'EADDRINUSE') {
          console.log(`ℹ️ Port ${PORT} is already in use. Exiting cleanly.`)
          process.exit(0)
          return
        }
        console.error('❌ Server error while starting (HTTPS):', error)
      })
      return
    } catch (e) {
      console.error('❌ Failed to start HTTPS server, falling back to HTTP:', e)
    }
  }

  const listener = app.listen(PORT, () => console.log(`SERVER RUNNING on port ${PORT}`))

  listener.on("error", (error) => {
    if (error?.code === "EADDRINUSE") {
      console.log(`ℹ️ Port ${PORT} is already in use. Exiting cleanly.`)
      process.exit(0)
      return
    }

    console.error("❌ Server error while starting:", error)
  })
}

startServer()