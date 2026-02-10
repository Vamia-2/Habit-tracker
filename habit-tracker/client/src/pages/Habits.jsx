import { useEffect, useState } from "react";
import { getMyHabitsApi, addHabitApi, deleteHabitApi } from "../api/habits";
import { useAuth } from "../context/AuthContext";

export default function Habits() {
  const { logout } = useAuth();
  const [habits, setHabits] = useState([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reminder, setReminder] = useState(true);

  /* 🔔 request permission once */
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  /* load habits */
  useEffect(() => {
    load();
  }, []);

  const load = async () => setHabits(await getMyHabitsApi());

  /* 🔔 reminder timer */
  useEffect(() => {
    const interval = setInterval(() => {
      habits.forEach(h => {
        if (!h.reminder) return;

        const habitTime = new Date(`${h.date}T${h.time}`);
        const now = new Date();
        const diff = habitTime - now;

        // notify 1 minute before
        if (diff > 0 && diff < 60000) {
          new Notification("Habit Reminder", {
            body: `Time to do: ${h.title}`,
            icon: "/bell.png"
          });
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [habits]);

  const formatDate = d =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });

  return (
    <div className="container">
      <h2>My Habits</h2>

      <input
        placeholder="Habit"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />

      <input
        type="date"
        lang="en"
        value={date}
        onChange={e => setDate(e.target.value)}
      />

      <input
        type="time"
        value={time}
        onChange={e => setTime(e.target.value)}
      />

      <label className="checkbox">
        <input
          type="checkbox"
          checked={reminder}
          onChange={e => setReminder(e.target.checked)}
        />
        Enable reminder
      </label>

      <button
        onClick={() => {
          addHabitApi({ title, date, time, reminder }).then(load);
          setTitle(""); setDate(""); setTime(""); setReminder(true);
        }}
      >
        Add Habit
      </button>

      <ul>
        {habits.map(h => (
          <li key={h.id}>
            <b>{h.title}</b><br />
            📅 {formatDate(h.date)} ⏰ {h.time}
            {h.reminder && <span> 🔔</span>}
            <button onClick={() => deleteHabitApi(h.id).then(load)}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      <button onClick={logout}>Logout</button>
    </div>
  );
}
