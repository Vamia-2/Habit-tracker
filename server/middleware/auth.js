import jwt from "jsonwebtoken"
import User from "../models/User.js"

export default async (req,res,next) => {
  const token = req.headers.authorization
  if(!token) return res.status(403).json("no token")

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch (e) {
    return res.status(403).json("invalid token")
  }

  const user = await User.findById(decoded.id)
  if(!user) return res.status(403).json("user not found")

  if (user.isBlocked && user.blockedUntil && new Date() > new Date(user.blockedUntil)) {
    user.isBlocked = false
    user.blockedUntil = null
    await user.save()
  }

  req.user = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    isBlocked: user.isBlocked,
    blockedUntil: user.blockedUntil
  }

  next()
}
