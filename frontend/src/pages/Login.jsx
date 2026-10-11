import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Layout from "../components/Layout";
import Toast from "../components/Toast";
import { login, signInWithGoogleAsStudent } from "../services/auth";
import { isPlacementAdmin } from "../services/publicInsights";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const credential = await login(email, password);
      const isAdmin = await isPlacementAdmin(credential.user.uid);
      navigate(isAdmin ? "/placement-admin" : "/dashboard");
    } catch (err) {
      setToast({
        message: err.message,
        type: "error",
      });
    }
  }

  async function handleGoogleSignIn() {
    try {
      setGoogleLoading(true);
      await signInWithGoogleAsStudent();
      navigate("/dashboard");
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <Layout centered>
      <div className="form-shell auth-page">
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
          <div className="auth-divider"><span>or</span></div>
          <button
            type="button"
            className="google-button"
            disabled={googleLoading}
            onClick={handleGoogleSignIn}
          >
            {googleLoading ? "Connecting to Google…" : "Continue with Google — students"}
          </button>
          <p className="auth-help-text">Placement staff use their assigned staff sign-in.</p>
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
