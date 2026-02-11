import mongoose from "mongoose";

export default mongoose.model("Habit", new mongoose.Schema({
  title: String,
  date: Date,
  userId: String,
  userEmail: String
}));
