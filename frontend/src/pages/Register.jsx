import { useState } from "react";
import Layout from "../components/Layout";
import { register } from "../services/auth";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const user = await register(email, password);
      console.log(user.user);
      alert("Registration successful!");
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <Layout>
      <h1>Create Account</h1>

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
          Register
        </button>

      </form>

    </Layout>
  );
}

export default Register;