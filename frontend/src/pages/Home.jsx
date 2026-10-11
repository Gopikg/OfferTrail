import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import Layout from "../components/Layout";
import Hero from "../components/Hero";
import StatCard from "../components/StatCard";
import { getPublicPlacementOverview } from "../services/publicInsights";
import { useAuth } from "../context/AuthContext";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatPeriod(period) {
  if (!period) return "Unknown";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(new Date(`${period}-01T00:00:00`));
}

function formatAsOfDate(value) {
  if (!value) return "Not specified";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(
    new Date(`${value}T00:00:00`)
  );
}

function formatUpdatedAt(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date)
    : null;
}

function Home() {
  const { user, access, accessLoading } = useAuth();
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
  const activityByMonth = Array.isArray(overview?.activityByMonth)
    ? overview.activityByMonth
      .filter((entry) => entry?.period)
      .sort((first, second) => first.period.localeCompare(second.period))
      .map((entry) => ({
        label: formatPeriod(entry.period),
        companies: Number(entry.companies) || 0,
        offers: Number(entry.offers) || 0,
      }))
    : [];

  if (user && !accessLoading && access.isPlacementAdmin) {
    return <Navigate to="/placement-admin" replace />;
  }

  return (
    <Layout>
      {!user && <Hero />}

      <section id="placement-statistics" className={user ? "" : "mt-7"}>
        <div className="page-heading mb-5">
          <p className="eyebrow">Campus placement outlook</p>
          <h2 className="page-title text-2xl">Placement at a glance</h2>
          <p className="page-subtitle">
            Institution-wide outcomes for the OfferTrail community.
          </p>
          {overview?.reportingPeriod && (
            <p className="text-sm text-gray-500 mt-2">
              Reporting period: {overview.reportingPeriod.academicYear} · Figures as of {formatAsOfDate(overview.reportingPeriod.asOfDate)}
              {formatUpdatedAt(overview.updatedAt) ? ` · Last updated ${formatUpdatedAt(overview.updatedAt)}` : ""}
            </p>
          )}
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
          <>
            <section className="overview-highlight mb-7">
              <div>
                <p className="eyebrow">Placement pulse</p>
                <p className="overview-highlight-value">
                  {overview.placementRate == null ? "—" : `${overview.placementRate}%`}
                </p>
                <p className="overview-highlight-label">placement rate for the current reporting period</p>
              </div>
              <div className="overview-highlight-details">
                <div>
                  <span>Highest package</span>
                  <strong>{overview.highestPackageLpa == null ? "—" : `₹${overview.highestPackageLpa} LPA`}</strong>
                </div>
                <div>
                  <span>Average package</span>
                  <strong>{overview.averagePackageLpa == null ? "—" : `₹${overview.averagePackageLpa} LPA`}</strong>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {stats.map((stat) => (
                <StatCard
                  key={stat.title}
                  title={stat.title}
                  value={stat.value}
                />
              ))}
            </div>

            {activityByMonth.length > 0 && (
              <section className="surface placement-trend mt-7">
                <div>
                  <p className="eyebrow">Recruitment activity</p>
                  <h3 className="text-2xl font-bold mt-1">Companies and offers over time</h3>
                  <p className="text-gray-500 mt-2">
                    Published monthly by the placement cell.
                  </p>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={activityByMonth} margin={{ top: 24, right: 12, left: -20, bottom: 4 }}>
                    <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fill: "var(--chart-text)" }} axisLine={{ stroke: "var(--chart-grid)" }} />
                    <YAxis allowDecimals={false} tick={{ fill: "var(--chart-text)" }} axisLine={{ stroke: "var(--chart-grid)" }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="companies" name="Companies" fill="#0176d3" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="offers" name="Offers" fill="#2e844a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </section>
            )}

            <section className="overview-journey mt-7" aria-label="How OfferTrail helps students">
              <div className="overview-journey-heading">
                <p className="eyebrow">Your placement journey</p>
                <h3>From opportunity to offer</h3>
              </div>
              <div className="overview-journey-steps">
                <article>
                  <span>01</span>
                  <h4>Discover</h4>
                  <p>See notices shared with your placement circle in Notifications.</p>
                </article>
                <article>
                  <span>02</span>
                  <h4>Track</h4>
                  <p>Keep every application, deadline, interview, and update together.</p>
                </article>
                <article>
                  <span>03</span>
                  <h4>Progress</h4>
                  <p>Turn recruiter updates into a clear view of your next step.</p>
                </article>
              </div>
            </section>
          </>
        )}
      </section>
    </Layout>
  );
}

export default Home;
