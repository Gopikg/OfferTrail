import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Layout from "../components/Layout";
import ResumeManager from "../components/ResumeManager";
import { useAuth } from "../context/AuthContext";
import { getApplications } from "../services/firestore";

const STAGES = ["Applied", "OA", "Interview", "HR", "Offer", "Rejected"];

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    async function loadApplications() {
      if (!user) return;

      try {
        setApplications(await getApplications(user.uid));
      } catch (error) {
        console.error("Failed to load applications:", error);
      }
    }

    loadApplications();
  }, [user]);

  const counts = useMemo(() => (
    Object.fromEntries(STAGES.map((stage) => [
      stage,
      applications.filter((application) => application.stage === stage).length,
    ]))
  ), [applications]);

  const chartData = STAGES.map((stage) => ({ stage, count: counts[stage] }));
  const totalApplications = applications.length;
  const activeApplications = totalApplications - counts.Offer - counts.Rejected;

  function openStageApplications(bar) {
    const stage = bar?.payload?.stage || bar?.stage;
    if (STAGES.includes(stage)) {
      navigate(`/applications?stage=${encodeURIComponent(stage)}`);
    }
  }

  return (
    <Layout>
      <div className="dashboard-page">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Recruiting operations</p>
            <h1 className="page-title">Application dashboard</h1>
            {user && <p className="text-gray-500 mt-1">Welcome back, {user.email}</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate("/applications/new")} className="primary-button">+ Add application</button>
            <button onClick={() => navigate("/applications")} className="secondary-button">Detailed list</button>
          </div>
        </div>

        <section className="dashboard-stage-chart mt-8">
          <h2>Applications by stage</h2>
          <p className="text-sm text-gray-500 mt-1">Select a bar to view applications at that stage.</p>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={chartData} margin={{ top: 18, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="stageBar" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#00a1e0" />
                  <stop offset="100%" stopColor="#0176d3" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="stage" tick={{ fill: "var(--chart-text)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "var(--chart-text)" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill="url(#stageBar)" radius={[7, 7, 0, 0]} maxBarSize={82} cursor="pointer" onClick={openStageApplications} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <div className="grid grid-cols-1 gap-4 mt-8 md:grid-cols-4">
          <div className="bg-white border rounded-xl p-5 shadow-sm"><p className="text-gray-500">Total applications</p><p className="text-3xl font-bold mt-2">{totalApplications}</p></div>
          <div className="bg-white border rounded-xl p-5 shadow-sm"><p className="text-gray-500">Active applications</p><p className="text-3xl font-bold mt-2">{activeApplications}</p></div>
          <div className="bg-white border rounded-xl p-5 shadow-sm"><p className="text-gray-500">Offers</p><p className="text-3xl font-bold mt-2">{counts.Offer}</p></div>
          <div className="bg-white border rounded-xl p-5 shadow-sm"><p className="text-gray-500">Rejected</p><p className="text-3xl font-bold mt-2">{counts.Rejected}</p></div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8 md:grid-cols-3">
          {STAGES.map((stage) => (
            <button key={stage} onClick={() => navigate(`/applications?stage=${encodeURIComponent(stage)}`)} className="border p-4 rounded text-left hover:bg-blue-50">
              <span className="text-gray-500">{stage}</span>
              <strong className="block text-3xl font-bold">{counts[stage]}</strong>
            </button>
          ))}
        </div>

        {user && <ResumeManager uid={user.uid} />}
      </div>
    </Layout>
  );
}

export default Dashboard;
