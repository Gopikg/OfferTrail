import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { addApplication } from "../services/firestore";
import Toast from "../components/Toast";

function AddApplication() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [stage, setStage] = useState("Applied");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
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
      <h1 className="text-3xl font-bold mb-6">
        Add Application
      </h1>

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
          className="bg-blue-700 text-white px-6 py-2 rounded"
        >
          Save Application
        </button>
      </form>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Layout>
  );
}

export default AddApplication;