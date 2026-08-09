import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Layout from "../components/Layout";
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
        }
      } catch (err) {
        console.error("Failed to load application:", err);
      }
    }

    loadApplication();
  }, [user, id]);
async function handleSubmit(e) {
  e.preventDefault();

  if (!user) {
    alert("Please log in first.");
    return;
  }

  try {
    await updateApplication(user.uid, id, {
      company,
      role,
      stage,
      deadline,
      notes,
    });

    alert("Application updated!");
  } catch (err) {
    console.error("Failed to update application:", err);
    alert("Failed to update application.");
  }
}
  return (
<Layout>
  <h1 className="text-3xl font-bold mb-6">
    Edit Application
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
      Update Application
    </button>

  </form>
</Layout>
  );
}

export default EditApplication;