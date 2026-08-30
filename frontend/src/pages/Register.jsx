import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Layout from "../components/Layout";
import Toast from "../components/Toast";
import { register } from "../services/auth";

function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      await register(email, password);

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
          <h1 className="page-title">Create your workspace</h1>
          <p className="page-subtitle">Start tracking every opportunity in one focused view.</p>
        </div>

      <form
        onSubmit={handleSubmit}
        className="surface form-card"
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
          Register
        </button>
      </form>

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

export default Register;
