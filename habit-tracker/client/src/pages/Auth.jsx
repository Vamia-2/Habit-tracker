import { useState } from "react";
import { loginApi, registerApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

export default function Auth() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    try {
      if (!email || !password) return alert("Email and password are required");
      console.log("LOGIN CLICKED");
      const data = await loginApi(email, password);
      login(data.user, data.token);
    } catch (err) {
      // Show server message when available for better UX
      alert(err?.message || "Login error");
      console.error(err);
    }
  }

  async function handleRegister() {
    try {
      if (!email || !password) return alert("Email and password are required");
      console.log("REGISTER CLICKED");
      const res = await registerApi(email, password);
      alert(res?.message || "Registered");
    } catch (err) {
      // Display server error message (e.g., "User exists") instead of a generic message
      alert(err?.message || "Register error");
      console.error(err);
    }
  }

  return (
    <motion.div
      className="container"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1>Habit Tracker</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      <button type="button" onClick={handleRegister}>
        Register
      </button>

      <button type="button" onClick={handleLogin}>
        Login
      </button>
    </motion.div>
  );
}
