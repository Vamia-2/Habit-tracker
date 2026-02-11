import { apiRequest } from "./client";

export async function registerApi(email, password) {
  const users = JSON.parse(localStorage.getItem("users") || "[]");

  if (users.find(u => u.email === email)) {
    throw new Error("User exists");
  }

  const user = {
    id: Date.now(),
    email,
    role: email === "admin@gmail.com" ? "admin" : "user"
  };

  // Use server endpoint instead of local mock
  await apiRequest("/auth/register", "POST", { email, password });
}

export async function loginApi(email, password) {
  // Server returns { user, token }
  return apiRequest("/auth/login", "POST", { email, password });
}
