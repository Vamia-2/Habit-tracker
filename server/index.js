import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = "secret123";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ================= MIDDLEWARE ================= */

app.use(cors());
app.use(express.json());

/* ================= TEMP DB (memory) ================= */

let users = [];
let habits = [];

/* ================= HEALTH CHECK ================= */

app.get("/", (req, res) => {
  res.send("🚀 Habit Tracker API is running");
});

/* ================= AUTH ================= */

app.post("/api/auth/register", (req, res) => {
  const { email, password } = req.body;

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ message: "User exists" });
  }

  const user = {
    id: Date.now(),
    email,
    password: bcrypt.hashSync(password, 8),
    role: email === "admin@gmail.com" ? "admin" : "user"
  };

  users.push(user);

  res.json({ message: "Registered" });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    SECRET
  );

  res.json({
    user: { id: user.id, email: user.email, role: user.role },
    token
  });
});

/* ================= AUTH MIDDLEWARE ================= */

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

/* ================= HABITS ================= */

app.get("/api/habits", auth, (req, res) => {
  res.json(habits.filter(h => h.userId === req.user.id));
});

app.post("/api/habits", auth, (req, res) => {
  const habit = {
    id: Date.now(),
    title: req.body.title,
    date: req.body.date,
    time: req.body.time,
    userId: req.user.id
  };

  habits.push(habit);
  res.json(habit);
});

app.delete("/api/habits/:id", auth, (req, res) => {
  habits = habits.filter(h => h.id != req.params.id);
  res.sendStatus(204);
});

/* ================= START ================= */

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

app.use(express.static(path.join(__dirname, "../client/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});