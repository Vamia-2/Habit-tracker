const API_URL = "http://localhost:3000";

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`
});

/* MY HABITS */
export const getMyHabitsApi = () =>
  fetch(`${API_URL}/api/habits/my`, { headers: headers() })
    .then(r => r.json());

/* ALL HABITS (ADMIN) */
export const getAllHabitsApi = () =>
  fetch(`${API_URL}/api/habits/all`, { headers: headers() })
    .then(r => r.json());

export const addHabitApi = data =>
  fetch(`${API_URL}/api/habits`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data)
  }).then(r => r.json());

export const updateHabitApi = (id, data) =>
  fetch(`${API_URL}/api/habits/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(data)
  }).then(r => r.json());

export const deleteHabitApi = id =>
  fetch(`${API_URL}/api/habits/${id}`, {
    method: "DELETE",
    headers: headers()
  });
