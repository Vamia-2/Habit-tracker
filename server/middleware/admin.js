export default (req,res,next)=>{
  if(req.user.role !== "admin"){
    return res.status(403).json("not admin")
  }
  next()
}