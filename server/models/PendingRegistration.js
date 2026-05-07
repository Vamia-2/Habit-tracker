import mongoose from "mongoose"

export default mongoose.model("PendingRegistration", new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  emailVerificationToken: { type: String, default: null },
  emailVerificationExpires: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true }))