import mongoose from "mongoose"

export default mongoose.model("Subscription", new mongoose.Schema({
  user:String,
  subscription:Object
}))