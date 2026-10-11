import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Layout from "../components/Layout";
import Toast from "../components/Toast";
import { register, signInWithGoogleAsStudent } from "../services/auth";
import {
  createStudentProfile,
  requestCoordinatorAccess,
} from "../services/roleRequests";

function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleIntent, setRoleIntent] = useState("student");
  const [registering, setRegistering] = useState(false);
  const [toast, setToast] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setRegistering(true);
      const credential = await register(email, password);
      const { uid } = credential.user;

      await createStudentProfile(uid, email);

      if (roleIntent === "coordinator-request") {
        await requestCoordinatorAccess(uid, email);
      }

      navigate("/dashboard");
    } catch (err) {
      setToast({
        message: err.message,
        type: "error",
      });
    } finally {
      setRegistering(false);
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

        <fieldset className="role-intent-fieldset">
          <legend>How will you use OfferTrail?</legend>
          <label className="role-intent-option">
            <input
              type="radio"
              name="roleIntent"
              value="student"
              checked={roleIntent === "student"}
              onChange={(event) => setRoleIntent(event.target.value)}
            />
            <span>
              <strong>Student</strong>
              <small>Track your applications and receive opportunities assigned to your circle.</small>
            </span>
          </label>
          <label className="role-intent-option">
            <input
              type="radio"
              name="roleIntent"
              value="coordinator-request"
              checked={roleIntent === "coordinator-request"}
              onChange={(event) => setRoleIntent(event.target.value)}
            />
            <span>
              <strong>Request offer-coordinator access</strong>
              <small>The placement cell must approve the request and assign your student circle.</small>
            </span>
          </label>
        </fieldset>

        <button
          type="submit"
          disabled={registering}
          className="primary-button"
        >
          {registering ? "Creating account…" : "Register"}
        </button>

        {roleIntent === "student" && (
          <>
            <div className="auth-divider"><span>or</span></div>
            <button
              type="button"
              className="google-button"
              disabled={googleLoading}
              onClick={handleGoogleSignIn}
            >
              {googleLoading ? "Connecting to Google…" : "Continue with Google"}
            </button>
          </>
        )}
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
