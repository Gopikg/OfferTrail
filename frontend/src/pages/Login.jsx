import { useState } from "react";
import Layout from "../components/Layout";
import { login } from "../services/auth";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const user = await login(email, password);
      console.log(user.user);
      alert("Login successful!");
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <Layout>
      <h1>Login</h1>

      <form onSubmit={handleSubmit}>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <br /><br />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <br /><br />

        <button type="submit">
          Login
        </button>

      </form>
    </Layout>
  );
}

export default Login;