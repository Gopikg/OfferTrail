import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Layout from "../components/Layout";
import Toast from "../components/Toast";
import { login } from "../services/auth";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      await login(email, password);

      navigate("/dashboard");
    } catch (err) {
      setToast({
        message: err.message,
        type: "error",
      });
    }
  }

  return (
    <Layout>
      <div className="form-shell">
        <div className="page-heading">
          <p className="eyebrow">OfferTrail workspace</p>
          <h1 className="page-title">Welcome back</h1>
          <p className="page-subtitle">Sign in to manage your recruiting pipeline.</p>
        </div>

      <div className="surface form-card">
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded w-full"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded w-full"
        />

        <button
          type="submit"
          className="primary-button"
        >
          Login
        </button>
      </form>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      </div>
    </Layout>
  );
}

export default Login;
