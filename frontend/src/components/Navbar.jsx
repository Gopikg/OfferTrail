import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav
      style={{
        padding: "20px",
        background: "#2563eb",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
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

  <Link
    to="/login"
    style={{ color: "white", marginRight: "20px" }}
  >
    Login
  </Link>

  <Link
    to="/register"
    style={{ color: "white", marginRight: "20px" }}
  >
    Register
  </Link>

  <Link
    to="/applications/new"
    style={{ color: "white" }}
  >
    Add Application
  </Link>
</div>
    </nav>
  );
}

export default Navbar;