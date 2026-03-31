import mongoose from "mongoose"

export default mongoose.model("User", new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  avatar: { type: String, default: "👤" },
  role: { type: String, default: "user" },
  isBlocked: { type: Boolean, default: false },
  blockedUntil: Date,
  pushSubscription: {
    type: Object,
    default: null
  },
  achievements: [String],
  followers: [String],
  following: [String],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true }))