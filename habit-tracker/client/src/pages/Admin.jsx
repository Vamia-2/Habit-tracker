import { useEffect, useState } from "react";
import { getAllHabitsApi, updateHabitApi, deleteHabitApi } from "../api/habits";
import { useAuth } from "../context/AuthContext";

export default function Admin() {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ title: "", date: "", time: "" });

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user]);

  const load = async () => setHabits(await getAllHabitsApi());

  const formatDate = d =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });

  if (user?.role !== "admin") return null;

  return (
    <div className="container">
      <h2>Admin Panel</h2>

      <table className="admin-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Habit</th>
            <th>Date</th>
            <th>Time</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {habits.map(h => (
            <tr key={h.id}>
              <td>{h.user}</td>

              <td>
                {editId === h.id
                  ? <input value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })} />
                  : h.title}
              </td>

              <td>
                {editId === h.id
                  ? <input type="date" lang="en"
                      value={form.date}
                      onChange={e => setForm({ ...form, date: e.target.value })} />
                  : formatDate(h.date)}
              </td>

              <td>
                {editId === h.id
                  ? <input type="time"
                      value={form.time}
                      onChange={e => setForm({ ...form, time: e.target.value })} />
                  : h.time}
              </td>

              <td>
                {editId === h.id ? (
                  <>
                    <button onClick={() => {
                      updateHabitApi(h.id, form).then(load);
                      setEditId(null);
                    }}>Save</button>
                    <button onClick={() => setEditId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => {
                      setEditId(h.id);
                      setForm({ title: h.title, date: h.date, time: h.time });
                    }}>Update</button>
                    <button onClick={() => deleteHabitApi(h.id).then(load)}>
                      Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
