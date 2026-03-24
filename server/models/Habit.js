import mongoose from "mongoose"

export default mongoose.model("Habit", new mongoose.Schema({
  title: String,
  user: String,
  date: Date,
  dueTime: String,
  reminder: { type: Boolean, default: false },
  completed: { type: Boolean, default: false },
  completedAt: Date,
  color: { type: String, default: "#3498db" },
  streakCount: { type: Number, default: 0 },
  notes: String,
  public: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true }))