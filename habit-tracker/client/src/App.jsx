import { useAuth } from "./context/AuthContext";
import Auth from "./pages/Auth";
import Habits from "./pages/Habits";
import Admin from "./pages/Admin";

export default function App() {
  const { user } = useAuth();

  if (!user) return <Auth />;

  return (
    <>
      <Habits />
      {user.role === "admin" && <Admin />}
    </>
  );
}
