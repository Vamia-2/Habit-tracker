import mongoose from "mongoose"

export default mongoose.model("Habit", new mongoose.Schema({
  title: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  date: Date,
  dueTime: String,
  reminder: { type: Boolean, default: false },
  completed: { type: Boolean, default: false },
  completedAt: Date,
  deleted: { type: Boolean, default: false },
  deletedAt: Date,
  color: { type: String, default: "#3498db" },
  streakCount: { type: Number, default: 0 },
  notes: String,
  public: { type: Boolean, default: false },
  comments: [{
    userId: String,
    username: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true }))