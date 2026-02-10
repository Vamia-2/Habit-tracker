const API_URL = "http://localhost:3000/api";

export async function apiRequest(url, method = "GET", data) {
  const token = localStorage.getItem("token");

  const res = await fetch(API_URL + url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: data ? JSON.stringify(data) : undefined
  });

  if (!res.ok) {
    const err = await res.json();
    throw err;
  }

  return res.json();
}

