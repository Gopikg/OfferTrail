import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Layout from "../components/Layout";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import {
  getApplications,
  updateApplication,
} from "../services/firestore";

function EditApplication() {
  const { id } = useParams();
  const { user } = useAuth();

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [stage, setStage] = useState("Applied");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [previousStage, setPreviousStage] = useState("");
  const [stageHistory, setStageHistory] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function loadApplication() {
      if (!user) return;

      try {
        const applications = await getApplications(user.uid);

        const application = applications.find(
          (item) => item.id === id
        );

        if (application) {
          setCompany(application.company);
          setRole(application.role);
          setStage(application.stage);
          setDeadline(application.deadline);
          setNotes(application.notes || "");
          setPreviousStage(application.stage);
          setStageHistory(application.stageHistory || []);
        }
      } catch (err) {
        console.error("Failed to load application:", err);
      }
    }

    loadApplication();
  }, [user, id]);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!user) {
      setToast({
        message: "Please log in first.",
        type: "error",
      });
      return;
    }

    try {
      await updateApplication(
        user.uid,
        id,
        {
          company,
          role,
          stage,
          deadline,
          notes,
        },
        previousStage
      );

      if (stage !== previousStage) {
        setStageHistory((currentHistory) => [
          ...currentHistory,
          {
            stage,
            changedAt: new Date().toISOString(),
          },
        ]);
      }

      setPreviousStage(stage);

      setToast({
        message: "Application updated!",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to update application:", err);

      setToast({
        message: "Failed to update application.",
        type: "error",
      });
    }
  }

  return (
    <Layout>
      <div className="form-shell">
        <div className="page-heading">
          <p className="eyebrow">Application workspace</p>
          <h1 className="page-title">Edit application</h1>
          <p className="page-subtitle">Keep your role details and recruiting progress current.</p>
        </div>

      <div className="surface form-card">
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <input
          type="text"
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="border p-2 rounded w-full"
        />

        <input
          type="text"
          placeholder="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border p-2 rounded w-full"
        />

        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option>Applied</option>
          <option>OA</option>
          <option>Interview</option>
          <option>HR</option>
          <option>Offer</option>
          <option>Rejected</option>
        </select>

        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="border p-2 rounded w-full"
        />

        <textarea
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="border p-2 rounded w-full"
        />

        <button
          type="submit"
          className="primary-button"
        >
          Update Application
        </button>
      </form>
      </div>

      {/* Application History */}

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">
          Application History
        </h2>

        {stageHistory.length === 0 ? (
          <p className="text-gray-500">
            No stage history available.
          </p>
        ) : (
          <div className="space-y-3">
            {stageHistory.map((entry, index) => (
              <div
                key={index}
                className="border rounded-lg p-3"
              >
                <p className="font-medium">
                  {entry.stage}
                </p>

                <p className="text-sm text-gray-500">
                  {new Date(entry.changedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      </div>
    </Layout>
  );
}

export default EditApplication;
