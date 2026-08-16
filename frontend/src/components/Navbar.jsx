import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logout } from "../services/auth";

function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <nav
      style={{
        padding: "20px",
        background: "#2563eb",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <h2>OfferTrail</h2>

      <div>
        <Link
          to="/"
          style={{ color: "white", marginRight: "20px" }}
        >
          Home
        </Link>

        {user ? (
          <>
            <Link
              to="/dashboard"
              style={{ color: "white", marginRight: "20px" }}
            >
              Dashboard
            </Link>

            <Link
              to="/applications/new"
              style={{ color: "white", marginRight: "20px" }}
            >
              Add Application
            </Link>

            <button
              onClick={handleLogout}
              style={{
                color: "white",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              style={{ color: "white", marginRight: "20px" }}
            >
              Login
            </Link>

            <Link
              to="/register"
              style={{ color: "white" }}
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;