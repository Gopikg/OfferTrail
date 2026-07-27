import Button from "./Button";

function Hero() {
  return (
    <section className="py-24 text-center">

      <h1 className="text-6xl font-bold text-gray-900">
        Track Every Placement Opportunity
      </h1>

      <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
        Organize applications, interviews, deadlines and offers
        from one place.
      </p>

      <div className="mt-10 flex justify-center gap-4">
        <Button>Get Started</Button>

        <Button>View Statistics</Button>
      </div>

    </section>
  );
}

export default Hero;