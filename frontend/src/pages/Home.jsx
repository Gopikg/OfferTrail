import Layout from "../components/Layout";
import Hero from "../components/Hero";
import StatCard from "../components/StatCard";
import stats from "../data/stats";

function Home() {
  return (
    <Layout>
      <Hero />

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
          />
        ))}

      </section>
    </Layout>
  );
}

export default Home;