import { BrowserRouter,Routes,Route } from "react-router-dom"

import Login from "./pages/Login.jsx"
import Register from "./pages/Register.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import Admin from "./pages/Admin.jsx"
import Complaint from "./pages/Complaint.jsx"
import Achievements from "./pages/Achievements.jsx"
import PublicAchievements from "./pages/PublicAchievements.jsx"

export default function App(){
  return(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/register" element={<Register/>}/>
        <Route path="/admin" element={<Admin/>}/>
        <Route path="/complaint" element={<Complaint/>}/>
        <Route path="/achievements" element={<Achievements/>}/>
        <Route path="/public-achievements" element={<PublicAchievements/>}/>
      </Routes>
    </BrowserRouter>
  )
}