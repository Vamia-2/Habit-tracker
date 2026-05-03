import mongoose from "mongoose"

export default mongoose.model("Suggestion", new mongoose.Schema({
  reporter: String,
  reporterEmail: String,
  text: { type: String, required: true, trim: true, minlength: 3, maxlength: 2000 },
  status: { type: String, enum: ["pending", "read"], default: "pending" },
  adminComment: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: Date
}, { timestamps: true }))
