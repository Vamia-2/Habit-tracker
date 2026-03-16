export const API = "https://habit-tracker-5xu3.onrender.com";

export async function apiRequest(url, method = "GET", body) {

  const token = localStorage.getItem("token");

  const res = await fetch(API + url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? "Bearer " + token : ""
    },
    body: body ? JSON.stringify(body) : null
  });

  return res.json();
}