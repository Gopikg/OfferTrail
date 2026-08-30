import Navbar from "./Navbar";

function Layout({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="workspace">
        {children}
      </main>
    </div>
  );
}

export default Layout;
