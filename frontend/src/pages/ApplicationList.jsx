import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import AIInsight from "../components/AIInsight";
import ConfirmModal from "../components/ConfirmModal";
import Layout from "../components/Layout";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { deleteApplication, getApplications } from "../services/firestore";

const STAGES = ["Applied", "OA", "Interview", "HR", "Offer", "Rejected"];

function stageStyle(stage) {
  return {
    Applied: "bg-blue-100 text-blue-800",
    OA: "bg-purple-100 text-purple-800",
    Interview: "bg-yellow-100 text-yellow-800",
    HR: "bg-orange-100 text-orange-800",
    Offer: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
  }[stage] || "bg-gray-100 text-gray-800";
}

function ApplicationList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState("grid");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  // Keep the insight component and its integration ready for a future release.
  const showAiInsights = false;

  const requestedStage = searchParams.get("stage");
  const stageFilter = STAGES.includes(requestedStage) ? requestedStage : "All";

  useEffect(() => {
    async function loadApplications() {
      if (!user) return;
      try {
        setApplications(await getApplications(user.uid));
      } catch (error) {
        console.error("Failed to load applications:", error);
        setToast({ message: "Applications could not be loaded.", type: "error" });
      } finally {
        setLoading(false);
      }
    }

    loadApplications();
  }, [user]);

  const filteredApplications = useMemo(() => (
    applications
      .filter((application) => {
        const search = searchTerm.trim().toLowerCase();
        const matchesSearch = !search || application.company?.toLowerCase().includes(search)
          || application.role?.toLowerCase().includes(search);
        return matchesSearch && (stageFilter === "All" || application.stage === stageFilter);
      })
      .sort((first, second) => {
        if (!first.deadline) return 1;
        if (!second.deadline) return -1;
        return new Date(first.deadline) - new Date(second.deadline);
      })
  ), [applications, searchTerm, stageFilter]);

  function changeStage(stage) {
    setSearchParams(stage === "All" ? {} : { stage });
  }

  async function handleDelete(applicationId) {
    try {
      await deleteApplication(user.uid, applicationId);
      setApplications((current) => current.filter((application) => application.id !== applicationId));
      setToast({ message: "Application deleted.", type: "success" });
    } catch (error) {
      console.error("Failed to delete application:", error);
      setToast({ message: "Application could not be deleted.", type: "error" });
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <Layout>
      <div className="page-heading flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Application workspace</p>
          <h1 className="page-title">Detailed list of applications</h1>
          <p className="page-subtitle">Search, filter, and manage every application in one place.</p>
        </div>
        <button onClick={() => navigate("/applications/new")} className="primary-button">
          + Add application
        </button>
      </div>

      <section className="surface p-4 mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          type="search"
          placeholder="Search by company or role..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full"
        />
        <select value={stageFilter} onChange={(event) => changeStage(event.target.value)} aria-label="Filter applications by stage">
          <option value="All">All stages</option>
          {STAGES.map((stage) => <option key={stage}>{stage}</option>)}
        </select>
        <div className="flex gap-2" role="group" aria-label="Application view">
          <button type="button" onClick={() => setView("grid")} aria-pressed={view === "grid"} className={view === "grid" ? "primary-button" : "secondary-button"}>Grid</button>
          <button type="button" onClick={() => setView("list")} aria-pressed={view === "list"} className={view === "list" ? "primary-button" : "secondary-button"}>List</button>
        </div>
      </section>

      {loading ? (
        <div className="surface p-8 text-center text-gray-500">Loading your applications...</div>
      ) : applications.length === 0 ? (
        <div className="surface p-8 text-center">
          <h2 className="text-xl font-bold">No applications yet</h2>
          <p className="text-gray-500 mt-2">Start tracking your job applications by adding your first one.</p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="surface p-8 text-center">
          <p className="text-gray-500">No applications match this search and stage filter.</p>
          <button onClick={() => { setSearchTerm(""); changeStage("All"); }} className="secondary-button mt-4">Clear filters</button>
        </div>
      ) : (
        <div className={view === "grid" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
          {filteredApplications.map((application) => (
            <article key={application.id} className={`surface p-5 ${view === "list" ? "md:flex md:items-center md:justify-between" : ""}`}>
              <div>
                <h2 className="text-xl font-bold">{application.company}</h2>
                <p className="text-gray-600 mt-1">{application.role}</p>
                <span className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium ${stageStyle(application.stage)}`}>{application.stage}</span>
                <p className="text-sm text-gray-500 mt-3">Deadline: {application.deadline || "No deadline"}</p>
                {application.notes && <p className="mt-3 text-sm text-gray-600 whitespace-pre-line">{application.notes}</p>}
                {showAiInsights && <AIInsight application={application} />}
              </div>
              <div className="flex gap-2 mt-4 md:mt-0">
                <button onClick={() => navigate(`/applications/edit/${application.id}`)} className="primary-button">Edit</button>
                <button onClick={() => setDeleteTarget(application.id)} className="danger-button">Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {deleteTarget && <ConfirmModal message="Are you sure you want to delete this application?" onConfirm={() => handleDelete(deleteTarget)} onCancel={() => setDeleteTarget(null)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </Layout>
  );
}

export default ApplicationList;
