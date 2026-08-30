import Button from "./Button";

function Hero() {
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
        <Button>Get Started</Button>

        <Button>View Statistics</Button>
      </div>

    </section>
  );
}

export default Hero;
