import Navbar from "./Navbar";

function Layout({ children, centered = false }) {
  return (
    <div className="app-shell">
      <Navbar />
      <main className={`workspace${centered ? " workspace-centered" : ""}`}>
        {children}
      </main>
      <footer className="app-footer">
        © {new Date().getFullYear()} OfferTrail. All rights reserved.
      </footer>
    </div>
  );
}

export default Layout;
