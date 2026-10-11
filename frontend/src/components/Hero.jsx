import { useNavigate } from "react-router-dom";

import Button from "./Button";

function Hero() {
  const navigate = useNavigate();

  return (
    <section className="hero-panel">
      <span className="eyebrow text-cyan-100">Application operations, simplified</span>
      <h1>
        Track Every Placement Opportunity
      </h1>

      <p>
        Organize applications, interviews, deadlines and offers
        from one place.
      </p>

      <div className="hero-actions">
        <Button onClick={() => navigate("/get-started")}>Get Started</Button>

        <button
          type="button"
          className="secondary-button"
          onClick={() => document.getElementById("placement-statistics")?.scrollIntoView({ behavior: "smooth" })}
        >
          View Statistics
        </button>
      </div>

    </section>
  );
}

export default Hero;
