import mongoose from "mongoose"

export default mongoose.model("Habit", new mongoose.Schema({
  title: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  date: Date,
  dueTime: String,
  timezoneOffset: { type: Number, default: 0 },
  // When set, reminders for this habit should be suppressed until this Date
  snoozedUntil: Date,
  cycleDays: [{ type: Number }],
  reminder: { type: Boolean, default: false },
  reminderSentAt: Date,
  completed: { type: Boolean, default: false },
  completedAt: Date,
  achievementDeleted: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  deletedAt: Date,
  color: { type: String, default: "#3498db" },
  streakCount: { type: Number, default: 0 },
  notes: String,
  public: { type: Boolean, default: false },
  commentsEnabled: { type: Boolean, default: true },
  comments: [{
    userId: String,
    username: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true }))