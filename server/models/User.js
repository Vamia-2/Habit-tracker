import mongoose from "mongoose"

export default mongoose.model("User", new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  avatar: { type: String, default: "👤" },
  role: { type: String, default: "user" },
  isBlocked: { type: Boolean, default: false },
  blockedUntil: Date,
  isVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: null },
  emailVerificationExpires: { type: Date, default: null },
  pushSubscription: {
    type: Object,
    default: null
  },
  achievements: [String],
  followers: [String],
  following: [String],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true }))