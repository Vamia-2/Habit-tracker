import jwt from "jsonwebtoken"

export default (req,res,next)=>{
  const token = req.headers.authorization
  if(!token) return res.status(403).json("no token")

  const decoded = jwt.verify(token,process.env.JWT_SECRET)

  req.user = decoded

  next()
}