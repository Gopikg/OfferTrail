import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import { getGmailMessages } from "../services/gmail";

import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import AIInsight from "../components/AIInsight";
import {
  getApplications,
  deleteApplication,
} from "../services/firestore";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [gmailMessages, setGmailMessages] = useState([]);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  useEffect(() => {
  if (!toast) return;

  const timer = setTimeout(() => {
    setToast(null);
  }, 3000);

  return () => clearTimeout(timer);
}, [toast]);

const [deleteTarget, setDeleteTarget] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("All");

const filteredApplications = applications
  .filter((application) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      application.company.toLowerCase().includes(search) ||
      application.role.toLowerCase().includes(search);

    const matchesStage =
      stageFilter === "All" ||
      application.stage === stageFilter;

    return matchesSearch && matchesStage;
  })
  .sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;

    return new Date(a.deadline) - new Date(b.deadline);
  });

  const totalApplications = applications.length;

  const appliedCount = applications.filter(
    (application) => application.stage === "Applied"
  ).length;

  const oaCount = applications.filter(
    (application) => application.stage === "OA"
  ).length;

  const interviewCount = applications.filter(
    (application) => application.stage === "Interview"
  ).length;

  const hrCount = applications.filter(
    (application) => application.stage === "HR"
  ).length;

  const offerCount = applications.filter(
    (application) => application.stage === "Offer"
  ).length;

  const rejectedCount = applications.filter(
    (application) => application.stage === "Rejected"
  ).length;

  const activeApplications =
  totalApplications - rejectedCount - offerCount;

  const chartData = [
  { stage: "Applied", count: appliedCount },
  { stage: "OA", count: oaCount },
  { stage: "Interview", count: interviewCount },
  { stage: "HR", count: hrCount },
  { stage: "Offer", count: offerCount },
  { stage: "Rejected", count: rejectedCount },
];
const upcomingApplications = applications
  .filter((application) => {
    if (!application.deadline) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(application.deadline);
    deadline.setHours(0, 0, 0, 0);

    return deadline >= today;
  })
  .sort(
    (a, b) =>
      new Date(a.deadline) - new Date(b.deadline)
  );

  useEffect(() => {
    async function loadApplications() {
      if (!user) return;

      try {
        const data = await getApplications(user.uid);
        setApplications(data);
      } catch (err) {
        console.error("Failed to load applications:", err);
      } finally {
        setLoading(false);
      }
    }

    loadApplications();
  }, [user]);



async function handleDelete(applicationId) {
  try {
    await deleteApplication(user.uid, applicationId);

    setApplications((currentApplications) =>
      currentApplications.filter(
        (application) => application.id !== applicationId
      )
    );

    setDeleteTarget(null);

    setToast({
      message: "Application deleted!",
      type: "success",
    });
  } catch (err) {
    console.error("Failed to delete application:", err);

    setDeleteTarget(null);

    setToast({
      message: "Failed to delete application.",
      type: "error",
    });
  }
}

function getStageStyle(stage) {
  switch (stage) {
    case "Applied":
      return "bg-blue-100 text-blue-800";

    case "OA":
      return "bg-purple-100 text-purple-800";

    case "Interview":
      return "bg-yellow-100 text-yellow-800";

    case "HR":
      return "bg-orange-100 text-orange-800";

    case "Offer":
      return "bg-green-100 text-green-800";

    case "Rejected":
      return "bg-red-100 text-red-800";

    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getDeadlineStatus(deadline) {
  if (!deadline) {
    return "No deadline";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const difference =
    deadlineDate.getTime() - today.getTime();

  const daysRemaining =
    Math.ceil(difference / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return "Overdue";
  }

  if (daysRemaining === 0) {
    return "Due today";
  }

  return `${daysRemaining} day${
    daysRemaining === 1 ? "" : "s"
  } remaining`;
}

async function handleGmailSync() {
  setGmailLoading(true);

  try {
    const data = await getGmailMessages();

    setGmailMessages(data.messages || []);
    setGmailConnected(true);

    setToast({
      message: `Gmail synced: ${data.count} messages found.`,
      type: "success",
    });
  } catch (err) {
    console.error("Failed to sync Gmail:", err);

    setGmailConnected(false);

    setToast({
      message: err.message || "Failed to sync Gmail.",
      type: "error",
    });
  } finally {
    setGmailLoading(false);
  }
}
const jobEmails = gmailMessages.filter(
  (message) => message.isJobEmail
);

return (
  <Layout>

    {/* Dashboard Header */}

<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

  <div>
    <h1 className="text-3xl font-bold">
      Dashboard
    </h1>

    {user && (
      <p className="text-gray-500 mt-1">
        Welcome back, {user.email}
      </p>
    )}
  </div>

  <div className="flex flex-col sm:flex-row gap-3">

    <button
      onClick={() => navigate("/applications/new")}
      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"
    >
      + Add Application
    </button>

    <button
      onClick={() => navigate("/gmail")}
      className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg"
    >
      Import from Gmail
    </button>

  </div>

</div>
    {/* Statistics */}

    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
 <div className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition">
    <p className="text-gray-500">
      Total Applications
    </p>

    <p className="text-3xl font-bold mt-2">
      {totalApplications}
    </p>
  </div>

 <div className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition">
    <p className="text-gray-500">
      Active Applications
    </p>

    <p className="text-3xl font-bold mt-2">
      {activeApplications}
    </p>
  </div>

  <div className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition">
    <p className="text-gray-500">
      Offers
    </p>

    <p className="text-3xl font-bold mt-2">
      {offerCount}
    </p>
  </div>

  <div className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition">
    <p className="text-gray-500">
      Rejected
    </p>

    <p className="text-3xl font-bold mt-2">
      {rejectedCount}
    </p>
  </div>

</div>

    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">


      <div className="border p-4 rounded">
        <h3 className="text-gray-500">Applied</h3>
        <p className="text-3xl font-bold">{appliedCount}</p>
      </div>

      <div className="border p-4 rounded">
        <h3 className="text-gray-500">Online Assessments</h3>
        <p className="text-3xl font-bold">{oaCount}</p>
      </div>

      <div className="border p-4 rounded">
        <h3 className="text-gray-500">Interviews</h3>
        <p className="text-3xl font-bold">{interviewCount}</p>
      </div>

      <div className="border p-4 rounded">
        <h3 className="text-gray-500">HR</h3>
        <p className="text-3xl font-bold">{hrCount}</p>
      </div>

      <div className="border p-4 rounded">
        <h3 className="text-gray-500">Offers</h3>
        <p className="text-3xl font-bold">{offerCount}</p>
      </div>

      <div className="border p-4 rounded">
        <h3 className="text-gray-500">Rejected</h3>
        <p className="text-3xl font-bold">{rejectedCount}</p>
      </div>

    </div>

    {/* Chart */}

    <div className="mt-10 border p-6 rounded">
      <h2 className="text-2xl font-bold mb-6">
        Applications by Stage
      </h2>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="stage" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
    {/* Gmail Integration */}

<div className="mt-10 border rounded-xl p-6 bg-white shadow-sm">

  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

    <div>
      <h2 className="text-2xl font-bold">
        Gmail Integration
      </h2>

      <p className="text-gray-500 mt-1">
        Sync your Gmail inbox to find recruitment-related emails.
      </p>

      {gmailConnected && (
        <p className="text-sm text-green-600 font-medium mt-2">
          Gmail connected
        </p>
      )}
    </div>

    <button
      onClick={handleGmailSync}
      disabled={gmailLoading}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-5 py-2 rounded-lg"
    >
      {gmailLoading ? "Syncing..." : "Sync Gmail"}
    </button>
{jobEmails.length > 0 && (
  <div className="mt-6">

    <h3 className="text-lg font-bold mb-3">
      Potential Job Emails
    </h3>

    <div className="space-y-3">

      {jobEmails.map((message) => (
        <div
          key={message.id}
          className="border rounded-lg p-4"
        >

          <p className="font-medium">
            {message.subject || "No subject"}
          </p>

          <p className="text-sm text-gray-500 mt-1">
            From: {message.from || "Unknown sender"}
          </p>

          <span className="inline-block mt-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            Potential job email
          </span>
           <br />
        <button
  onClick={() =>
    navigate("/applications/new", {
      state: {
        emailSubject: message.subject,
        emailSender: message.from,
      },
    })
  }
  className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
>
  Import to Application
</button>
        </div>
      ))}

    </div>

  </div>
)}
  </div>

  {gmailMessages.length > 0 && (
    <div className="mt-6 space-y-3">

      <h3 className="font-bold">
        Recent Emails
      </h3>

      {gmailMessages.map((message) => (
        <div
          key={message.id}
          className="border rounded-lg p-4"
        >
          <p className="font-medium">
            {message.subject || "No subject"}
          </p>

          <p className="text-sm text-gray-500 mt-1">
            From: {message.from || "Unknown sender"}
          </p>
        </div>
      ))}

    </div>
  )}

</div>

    {/* Upcoming Deadlines */}

    <div className="mt-10">
      <h2 className="text-2xl font-bold mb-4">
        Upcoming Deadlines
      </h2>

      {upcomingApplications.length === 0 ? (
        <p className="text-gray-500">
          No upcoming deadlines.
        </p>
      ) : (
        <div className="space-y-3">

          {upcomingApplications.slice(0, 5).map((application) => (
            <div
              key={application.id}
              className="border p-4 rounded-lg"
            >
              <h3 className="font-bold">
                {application.company}
              </h3>

              <p className="text-gray-600">
                {application.role}
              </p>

<p className="text-sm text-gray-500 mt-2">
  Deadline: {application.deadline || "No deadline"}
</p>

{application.deadline && (
  <p
    className={`text-sm font-medium mt-1 ${
      getDeadlineStatus(application.deadline) === "Overdue"
        ? "text-red-600"
        : getDeadlineStatus(application.deadline) === "Due today"
        ? "text-orange-600"
        : "text-green-600"
    }`}
  >
    {getDeadlineStatus(application.deadline)}
  </p>
)}


              <button
                onClick={() =>
                  navigate(`/applications/edit/${application.id}`)
                }
                className="mt-2 text-blue-600"
              >
                View / Edit
              </button>
            </div>
          ))}

        </div>
      )}
    </div>

    {/* Applications */}

    <h2 className="text-2xl font-bold mt-8 mb-4">
      Your Applications
    </h2>

    {/* Search and Filter */}

    <div className="flex flex-col md:flex-row gap-4 mb-6">

      <input
        type="text"
        placeholder="Search by company or role..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="border p-2 rounded w-full"
      />

      <select
        value={stageFilter}
        onChange={(e) => setStageFilter(e.target.value)}
        className="border p-2 rounded"
      >
        <option value="All">All Stages</option>
        <option value="Applied">Applied</option>
        <option value="OA">OA</option>
        <option value="Interview">Interview</option>
        <option value="HR">HR</option>
        <option value="Offer">Offer</option>
        <option value="Rejected">Rejected</option>
      </select>

    </div>

    {/* Application List */}

    {loading ? (
  <div className="border rounded-lg p-8 text-center">
    <p className="text-gray-500">
      Loading your applications...
    </p>
  </div>
) : applications.length === 0 ? (
  <div className="border rounded-lg p-8 text-center">
    <h3 className="text-xl font-bold mb-2">
      No applications yet
    </h3>

    <p className="text-gray-500 mb-4">
      Start tracking your job applications by adding your first one.
    </p>

    <button
      onClick={() => navigate("/applications/new")}
      className="bg-blue-600 text-white px-5 py-2 rounded"
    >
      + Add Your First Application
    </button>
  </div>
) : filteredApplications.length === 0 ? (
  <div className="border rounded-lg p-6 text-center">

    <p className="text-gray-500 mb-4">
      No applications match your search.
    </p>

    <button
      onClick={() => {
        setSearchTerm("");
        setStageFilter("All");
      }}
      className="bg-gray-700 text-white px-4 py-2 rounded"
    >
      Clear Filters
    </button>

  </div>
) : (
      <div className="space-y-4">

        {filteredApplications.map((application) => (
          <div
            key={application.id}
            className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition"
          >

            <h3 className="text-xl font-bold">
              {application.company}
            </h3>

           <p className="text-gray-600 mt-1">
              {application.role}
            </p>

           <span
  className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${getStageStyle(
    application.stage
  )}`}
>
  {application.stage}
</span>

            <p className="text-sm text-gray-500 mt-2">
              Deadline: {application.deadline || "No deadline"}
            </p>

            {application.notes && (
              <p className="mt-2 text-sm text-gray-600">
                Notes: {application.notes}
              </p>
            )}

             <AIInsight application={application} />

            <button
              onClick={() =>
                navigate(`/applications/edit/${application.id}`)
              }
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Edit
            </button>

            <button
              onClick={() => setDeleteTarget(application.id)}
              className="mt-3 ml-2 bg-red-600 text-white px-4 py-2 rounded"
            >
              Delete
            </button>

          </div>
        ))}

      </div>
    )}
    {deleteTarget && (
  <ConfirmModal
    message="Are you sure you want to delete this application?"
    onConfirm={() => handleDelete(deleteTarget)}
    onCancel={() => setDeleteTarget(null)}
  />
)}
    
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

export default Dashboard;