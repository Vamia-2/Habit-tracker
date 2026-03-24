import mongoose from "mongoose"

export default mongoose.model("Habit", new mongoose.Schema({
  title:String,
  user:String,
}))