import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import Habit from "./models/Habits.js";
import auth from "./middleware/auth.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

/* ================= DATABASE ================= */

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));

app.listen(5000, () => {
  console.log("Server running on port 5000");
});

/* ================= AUTH ================= */

app.post("/api/auth/register", async (req, res) => {

  const { email, password } = req.body;

  const exist = await User.findOne({ email });

  if (exist)
    return res.status(400).json({ message: "User exists" });

  const hash = bcrypt.hashSync(password, 8);

  const user = new User({
    email,
    password: hash
  });

  await user.save();

  res.json({ message: "Registered" });

});


app.post("/api/auth/login", async (req, res) => {

  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user)
    return res.status(401).json({ message: "Invalid credentials" });

  const valid = bcrypt.compareSync(password, user.password);

  if (!valid)
    return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET
  );

  res.json({
    token,
    user: {
      email: user.email,
      role: user.role
    }
  });

});

/* ================= HABITS ================= */

app.post("/api/habits", auth, async (req, res) => {

  const habit = new Habit({
    title: req.body.title,
    userId: req.user.id
  });

  await habit.save();

  res.json(habit);

});


app.get("/api/habits", auth, async (req, res) => {

  const habits = await Habit.find({
    userId: req.user.id
  });

  res.json(habits);

});


app.put("/api/habits/:id", auth, async (req, res) => {

  const habit = await Habit.findById(req.params.id);

  if (!habit)
    return res.sendStatus(404);

  habit.completed = !habit.completed;

  await habit.save();

  res.json(habit);

});


app.delete("/api/habits/:id", auth, async (req, res) => {

  await Habit.findByIdAndDelete(req.params.id);

  res.json({ message: "Deleted" });

});

/* ================= ANALYTICS ================= */

app.get("/api/stats", auth, async (req, res) => {

  const habits = await Habit.find({ userId: req.user.id });

  const completed = habits.filter(h => h.completed).length;

  res.json({
    total: habits.length,
    completed,
    notCompleted: habits.length - completed
  });

});

/* ================= ADMIN ================= */

app.get("/api/admin/habits", auth, async (req, res) => {

  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Forbidden" });

  const habits = await Habit.find().populate("userId");

  res.json(habits);

});

/* ================= START ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});