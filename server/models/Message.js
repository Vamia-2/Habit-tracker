import mongoose from "mongoose"

export default mongoose.model("Message", new mongoose.Schema({
  text:String,
  sender:String,
  receiver:String,
  createdAt:{ type:Date, default:Date.now }
}))