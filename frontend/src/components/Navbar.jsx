import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logout } from "../services/auth";
import JobNoticeNotification from "./JobNoticeNotification";

function Navbar() {
  const { user, access, accessLoading } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(
    () => localStorage.getItem("offertrail-theme") || "light"
  );
  const isPlacementAdmin = !accessLoading && access.isPlacementAdmin;

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
      <Link to={isPlacementAdmin ? "/placement-admin" : "/"} className="brand">
        <span className="brand-mark">↗</span>
        OfferTrail
      </Link>

      <div className="main-nav">
        {!isPlacementAdmin && <NavLink to="/" end className="nav-link">Overview</NavLink>}

        {user ? (
          <>
            {isPlacementAdmin ? (
              <NavLink to="/placement-admin" className="nav-link">Placement admin</NavLink>
            ) : (
              <>
                <NavLink to="/dashboard" className="nav-link">Dashboard</NavLink>
                <NavLink to="/applications" className="nav-link">Detailed list of applications</NavLink>
                <NavLink to="/gmail" className="nav-link">Mail updates</NavLink>
                <NavLink to="/deadlines" className="nav-link">Upcoming deadlines</NavLink>
                <JobNoticeNotification uid={user.uid} />
                {!accessLoading && access.isCoordinator && (
                  <NavLink to="/offer-coordinator" className="nav-link">Publish notice</NavLink>
                )}
              </>
            )}
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
