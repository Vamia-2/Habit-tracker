import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* ================= SETUP ================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "db.json");

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = "secret123";

app.use(cors());
app.use(express.json());

/* ================= DB ================= */

const readDB = () => {
  if (!fs.existsSync(DB_PATH)) return { users: [], habits: [] };
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
};

const writeDB = data =>
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

/* ================= MIDDLEWARE ================= */

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

/* ================= AUTH ================= */

app.post("/api/auth/register", (req, res) => {
  const { email, password } = req.body;
  const db = readDB();

  if (db.users.find(u => u.email === email))
    return res.status(400).json({ message: "User exists" });

  const user = {
    id: Date.now(),
    email,
    password: bcrypt.hashSync(password, 8),
    role: email === "admin@gmail.com" ? "admin" : "user"
  };

  db.users.push(user);
  writeDB(db);

  res.json({ message: "Registered" });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const db = readDB();

  const user = db.users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    SECRET
  );

  res.json({
    user: { id: user.id, email: user.email, role: user.role },
    token
  });
});

/* ================= HABITS ================= */

/* ➕ ADD HABIT */
app.post("/api/habits", auth, (req, res) => {
  const db = readDB();

  const habit = {
    id: Date.now(),
    title: req.body.title,
    date: req.body.date,
    time: req.body.time,
    reminder: req.body.reminder,
    userId: req.user.id
  };

  db.habits.push(habit);
  writeDB(db);
  res.json(habit);
});

/* 🔐 MY HABITS */
app.get("/api/habits/my", auth, (req, res) => {
  const db = readDB();
  res.json(db.habits.filter(h => h.userId === req.user.id));
});

/* 👑 ALL HABITS (ADMIN) */
app.get("/api/habits/all", auth, (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);

  const db = readDB();
  const habits = db.habits.map(h => {
    const u = db.users.find(u => u.id === h.userId);
    return { ...h, user: u?.email || "unknown" };
  });

  res.json(habits);
});

/* ✏️ UPDATE */
app.put("/api/habits/:id", auth, (req, res) => {
  const db = readDB();
  const habit = db.habits.find(h => h.id == req.params.id);
  if (!habit) return res.sendStatus(404);

  habit.title = req.body.title;
  habit.date = req.body.date;
  habit.time = req.body.time;
  habit.reminder = req.body.reminder;

  writeDB(db);
  res.json(habit);
});

/* ❌ DELETE */
app.delete("/api/habits/:id", auth, (req, res) => {
  const db = readDB();
  db.habits = db.habits.filter(h => h.id != req.params.id);
  writeDB(db);
  res.sendStatus(204);
});

/* ================= START ================= */

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
