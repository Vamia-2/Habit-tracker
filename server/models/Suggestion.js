import mongoose from "mongoose"

export const SUGGESTION_TYPES = ["Додати", "Змінити", "Видалити"]

export default mongoose.model("Suggestion", new mongoose.Schema({
  user: String,
  userEmail: String,
  type: { type: String, enum: SUGGESTION_TYPES, required: true },
  text: { type: String, required: true }
}, { timestamps: true }))
