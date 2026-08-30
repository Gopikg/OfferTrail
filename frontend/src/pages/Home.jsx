import { useEffect, useState } from "react";

import Layout from "../components/Layout";
import Hero from "../components/Hero";
import StatCard from "../components/StatCard";
import { getPublicPlacementOverview } from "../services/publicInsights";

function Home() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadOverview() {
      try {
        setOverview(await getPublicPlacementOverview());
      } catch (err) {
        console.error("Failed to load public placement overview:", err);
        setError("Placement insights are temporarily unavailable.");
      } finally {
        setLoading(false);
      }
    }

    loadOverview();
  }, []);

  const stats = overview && [
    { title: "Companies visiting", value: overview.companiesVisited ?? "—" },
    { title: "Total offers", value: overview.totalOffers ?? "—" },
    {
      title: "Placement rate",
      value: overview.placementRate == null
        ? "—"
        : `${overview.placementRate}%`,
    },
    {
      title: "Average package",
      value: overview.averagePackageLpa == null
        ? "—"
        : `₹${overview.averagePackageLpa} LPA`,
    },
    {
      title: "Highest package",
      value: overview.highestPackageLpa == null
        ? "—"
        : `₹${overview.highestPackageLpa} LPA`,
    },
  ];

  return (
    <Layout>
      <Hero />

      <section className="mt-7">
        <div className="page-heading mb-5">
          <p className="eyebrow">Campus placement outlook</p>
          <h2 className="page-title text-2xl">Placement at a glance</h2>
          <p className="page-subtitle">
            Institution-wide outcomes, available to every student before sign-in.
          </p>
        </div>

        {loading ? (
          <div className="surface p-6 text-gray-500">Loading placement insights…</div>
        ) : error ? (
          <div className="surface p-6 text-red-600">{error}</div>
        ) : !overview ? (
          <div className="surface p-6">
            <h3 className="font-bold text-lg">Placement insights are being prepared</h3>
            <p className="text-gray-500 mt-2">
              The placement cell has not published the current overview yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {stats.map((stat) => (
              <StatCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
              />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}

export default Home;
