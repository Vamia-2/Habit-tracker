import { BrowserRouter,Routes,Route } from "react-router-dom"

import Login from "./pages/Login.jsx"
import Register from "./pages/Register.jsx"
import VerifyEmail from "./pages/VerifyEmail.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import Admin from "./pages/Admin.jsx"
import Complaint from "./pages/Complaint.jsx"
import Achievements from "./pages/Achievements.jsx"
import PublicAchievements from "./pages/PublicAchievements.jsx"
import Cycles from "./pages/Cycles.jsx"
import ToastHost from "./components/ToastHost.jsx"

export default function App(){
  return(
    <BrowserRouter>
      <ToastHost/>
      <Routes>
        <Route path="/" element={<Dashboard/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/register" element={<Register/>}/>
        <Route path="/verify-email" element={<VerifyEmail/>}/>
        <Route path="/admin" element={<Admin/>}/>
        <Route path="/complaint" element={<Complaint/>}/>
        <Route path="/achievements" element={<Achievements/>}/>
        <Route path="/public-achievements" element={<PublicAchievements/>}/>
        <Route path="/cycles" element={<Cycles/>}/>
      </Routes>
    </BrowserRouter>
  )
}