import mongoose from "mongoose"

export default mongoose.model("Log", new mongoose.Schema({
  user:String,
  action:String,
  date:{ type:Date, default:Date.now }
}))