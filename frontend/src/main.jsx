import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./firebase";
import auth from "./services/auth";
import App from "./App";

console.log(auth);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);