import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { getApplications } from "../services/firestore";

function formatDeadline(deadline) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${deadline}T00:00:00`));
}

function deadlineStatus(deadline) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${deadline}T00:00:00`);
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (days === 0) return { label: "Due today", className: "text-orange-600" };
  if (days === 1) return { label: "1 day remaining", className: "text-orange-600" };
  return { label: `${days} days remaining`, className: "text-green-600" };
}

function UpcomingDeadlines() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadApplications() {
      if (!user) return;

      try {
        setApplications(await getApplications(user.uid));
      } catch (err) {
        console.error("Failed to load upcoming deadlines:", err);
        setError("Upcoming deadlines could not be loaded. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadApplications();
  }, [user]);

  const upcomingApplications = applications
    .filter((application) => {
      if (!application.deadline) return false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(`${application.deadline}T00:00:00`) >= today;
    })
    .sort((first, second) => (
      new Date(`${first.deadline}T00:00:00`) - new Date(`${second.deadline}T00:00:00`)
    ));

  return (
    <Layout>
      <div className="page-heading">
        <p className="eyebrow">Application workspace</p>
        <h1 className="page-title">Upcoming deadlines</h1>
        <p className="page-subtitle">
          Stay ahead of every application deadline that is still open.
        </p>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading deadlines...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : upcomingApplications.length === 0 ? (
        <div className="surface p-5 text-gray-500">
          No upcoming deadlines. Add a deadline to an application to track it here.
        </div>
      ) : (
        <div className="space-y-4">
          {upcomingApplications.map((application) => {
            const status = deadlineStatus(application.deadline);

            return (
              <article key={application.id} className="surface p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{application.company}</h2>
                    <p className="text-gray-600 mt-1">{application.role}</p>
                    <p className="text-sm text-gray-500 mt-3">
                      Deadline: {formatDeadline(application.deadline)}
                    </p>
                    <p className={`text-sm font-medium mt-1 ${status.className}`}>
                      {status.label}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate(`/applications/edit/${application.id}`)}
                    className="primary-button"
                  >
                    View / Edit
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

export default UpcomingDeadlines;
