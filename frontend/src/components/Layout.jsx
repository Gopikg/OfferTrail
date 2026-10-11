import Navbar from "./Navbar";

function Layout({ children, centered = false }) {
  return (
    <div className="app-shell">
      <Navbar />
      <main className={`workspace${centered ? " workspace-centered" : ""}`}>
        {children}
      </main>
    </div>
  );
}

export default Layout;
