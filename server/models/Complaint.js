import mongoose from "mongoose"

export default mongoose.model("Complaint", new mongoose.Schema({
  reporter: String,
  reportedUser: String,
  reason: String,
  description: String,
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  blockDuration: { type: Number, default: 7 }, // days
  adminComment: String,
  createdAt: { type: Date, default: Date.now },
  resolvedAt: Date
}, { timestamps: true }))
