import { useState } from "react";
import { apiRequest } from "../api";

export default function Login() {

  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [mode,setMode] = useState("login");

  async function submit(e){

    e.preventDefault();

    const url = mode === "login"
      ? "/auth/login"
      : "/auth/register";

    const data = await apiRequest(url,"POST",{email,password});

    if(data.token){

      localStorage.setItem("token",data.token);

      if(data.user?.role === "admin")
        window.location="/admin"
      else
        window.location="/dashboard"

    } else {

      alert(data.message);

    }

  }

  return (

    <div className="login">

      <h2>Habit Tracker</h2>

      <form onSubmit={submit}>

        <input
        placeholder="email"
        onChange={e=>setEmail(e.target.value)}
        />

        <input
        type="password"
        placeholder="password"
        onChange={e=>setPassword(e.target.value)}
        />

        <button>
          {mode === "login" ? "Login" : "Register"}
        </button>

      </form>

      <p onClick={()=>setMode(
        mode === "login" ? "register" : "login"
      )}>
        Switch to {mode === "login" ? "register" : "login"}
      </p>

    </div>

  );

}