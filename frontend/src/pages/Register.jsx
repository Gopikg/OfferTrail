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
      <h1 className="text-3xl font-bold mb-6">
        Create Account
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 max-w-md"
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
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
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
    </Layout>
  );
}

export default Register;