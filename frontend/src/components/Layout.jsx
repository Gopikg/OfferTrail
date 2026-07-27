import Navbar from "./Navbar";

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <div style={{ padding: "30px" }}>
        {children}
      </div>
    </>
  );
}

export default Layout;