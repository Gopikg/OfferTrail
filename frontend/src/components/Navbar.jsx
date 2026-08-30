import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logout } from "../services/auth";

function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(
    () => localStorage.getItem("offertrail-theme") || "light"
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("offertrail-theme", theme);
  }, [theme]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <nav className="topbar">
      <Link to="/" className="brand">
        <span className="brand-mark">↗</span>
        OfferTrail
      </Link>

      <div className="main-nav">
        <NavLink to="/" end className="nav-link">Overview</NavLink>

        {user ? (
          <>
            <NavLink to="/dashboard" className="nav-link">Applications</NavLink>
            <NavLink to="/gmail" className="nav-link">Mail updates</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/login" className="nav-link">Sign in</NavLink>
            <NavLink to="/register" className="nav-link">Create account</NavLink>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
        className="nav-action"
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? "Light" : "Dark"}
      </button>

      {user && (
        <div className="account-actions">
          <span className="account-email">{user.email}</span>
          <button onClick={handleLogout} className="nav-action">Sign out</button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
