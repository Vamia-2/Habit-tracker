import mongoose from "mongoose";

export default mongoose.model("User", new mongoose.Schema({
  email: String,
  password: String,
  role: String
}));
