import mongoose from "mongoose"

export default mongoose.model("User", new mongoose.Schema({
  email: String,
  password: String,
  username: String,
  avatar: { type: String, default: "👤" },
  role: { type: String, default: "user" },
  isBlocked: { type: Boolean, default: false },
  blockedUntil: Date,
  achievements: [String],
  followers: [String],
  following: [String],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true }))