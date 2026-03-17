import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  title:{
    type:String,
    required:true
  },
  completed:{
    type:Boolean,
    default:false
  },
  userId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User"
  }
})
export default mongoose.model("Habit",userSchema);
