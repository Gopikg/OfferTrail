import { useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { addApplication } from "../services/firestore";

function AddApplication() {

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [stage, setStage] = useState("Applied");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  
  const { user } = useAuth();
  async function handleSubmit(e) {
  e.preventDefault();
 if (!user) {
    alert("Please log in first.");
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

    alert("Application saved!");

    setCompany("");
    setRole("");
    setStage("Applied");
    setDeadline("");
    setNotes("");

  } catch (err) {
    console.error(err);
    alert("Failed to save application.");
  }
}

return (
  <Layout>
    <h1 className="text-3xl font-bold mb-6">Add Application</h1>

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
  </Layout>
);
}

export default AddApplication;