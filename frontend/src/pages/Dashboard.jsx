import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { logout } from "../services/auth";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <Layout>
      <h1>Dashboard</h1>

      {user ? (
        <>
          <p>Welcome!</p>
          <p>{user.email}</p>

          <button
            onClick={handleLogout}
            className="mt-6 bg-red-600 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </>
      ) : (
        <p>No user logged in.</p>
      )}
    </Layout>
  );
}

export default Dashboard;