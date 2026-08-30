import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { addApplication } from "../services/firestore";
import Toast from "../components/Toast";

function AddApplication() {
  const location = useLocation();
  const importedEmail = location.state;
  const extracted = importedEmail?.extracted;

  const [company, setCompany] = useState(() => extracted?.company || "");
  const [role, setRole] = useState(() => extracted?.role || "");
  const [stage, setStage] = useState(() => extracted?.stage || "Applied");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState(() => {
    if (!importedEmail) return "";

    return `Imported from Gmail\n\nSubject: ${
      importedEmail.subject || "No subject"
    }\nFrom: ${importedEmail.from || "Unknown sender"}`;
  });
  const [toast, setToast] = useState(null);

  const { user } = useAuth();

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
      await addApplication(user.uid, {
        company,
        role,
        stage,
        deadline,
        notes,
        ...(importedEmail?.id
          ? { gmailMessageIds: [importedEmail.id] }
          : {}),
      });

      setToast({
        message: "Application saved!",
        type: "success",
      });

      setCompany("");
      setRole("");
      setStage("Applied");
      setDeadline("");
      setNotes("");

    } catch (err) {
      console.error(err);

      setToast({
        message: "Failed to save application.",
        type: "error",
      });
    }
  }

  return (
    <Layout>
      <div className="form-shell">
        <div className="page-heading">
          <p className="eyebrow">Application workspace</p>
          <h1 className="page-title">Add application</h1>
          <p className="page-subtitle">Create a record manually or complete the details detected from an email.</p>
        </div>

      {importedEmail && (
        <div className="mb-6 border border-blue-200 bg-blue-50 rounded-lg p-4">
          <p className="font-medium text-blue-800">
            Imported from Gmail
          </p>

          <p className="text-sm text-blue-700 mt-1">
            {importedEmail.subject || "No subject"}
          </p>

          <p className="text-sm text-blue-700">
            From: {importedEmail.from || "Unknown sender"}
          </p>
        </div>
      )}

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
          Save Application
        </button>
      </form>
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

export default AddApplication;
