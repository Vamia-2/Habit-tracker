import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

import User from "./models/User.js"
import Habit from "./models/Habit.js"
import auth from "./middleware/auth.js"

dotenv.config()

const app = express()

// middleware
app.use(cors())
app.use(express.json())

// MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB connected"))
.catch(err=>console.log(err))

// paths (для React)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// віддаємо React build
app.use(express.static(path.join(__dirname, "public")))


// ================= AUTH =================

// register
app.post("/api/register", async (req, res) => {
  try {
    const hash = bcrypt.hashSync(req.body.password, 8)

    const user = new User({
      email: req.body.email,
      password: hash
    })

    await user.save()

    res.json(user)
  } catch (err) {
    res.status(500).json(err)
  }
})


// login
app.post("/api/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email })

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const valid = bcrypt.compareSync(req.body.password, user.password)

    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET
    )

    res.json({ user, token })

  } catch (err) {
    res.status(500).json(err)
  }
})


// ================= HABITS =================

// get habits
app.get("/api/habits", auth, async (req, res) => {
  const habits = await Habit.find({ user: req.user.id })
  res.json(habits)
})


// create habit
app.post("/api/habits", auth, async (req, res) => {
  const habit = new Habit({
    title: req.body.title,
    user: req.user.id
  })

  await habit.save()
  res.json(habit)
})


// update habit
app.put("/api/habits/:id", auth, async (req, res) => {
  const habit = await Habit.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  )

  res.json(habit)
})


// delete habit
app.delete("/api/habits/:id", auth, async (req, res) => {
  await Habit.findByIdAndDelete(req.params.id)
  res.json({ message: "deleted" })
})


// ================= REACT FIX =================

// ❗ ВАЖЛИВО: тільки app.use, НЕ app.get("*")
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})


// ================= START =================

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log("Server running on port", PORT)
})