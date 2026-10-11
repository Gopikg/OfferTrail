import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getStudentJobNotices } from "../services/jobNotices";

function formatDeadline(deadline) {
  if (!deadline) return "No deadline provided";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${deadline}T00:00:00`));
}

function isExpired(deadline) {
  if (!deadline) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return new Date(`${deadline}T00:00:00`) < today;
}

function daysUntilDeadline(deadline) {
  if (!deadline) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${deadline}T00:00:00`);

  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function deadlineLabel(deadline) {
  const days = daysUntilDeadline(deadline);

  if (days === null) return "No deadline";
  if (days < 0) return "Expired";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 3) return `${days} days left`;

  return `${days} days left`;
}

function deadlineTone(deadline) {
  const days = daysUntilDeadline(deadline);

  if (days === null) return "";
  if (days < 0) return "notice-deadline-expired";
  if (days <= 1) return "notice-deadline-urgent";
  if (days <= 3) return "notice-deadline-soon";

  return "";
}

function JobNoticeFeed({ uid, applications }) {
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deadlineFilter, setDeadlineFilter] = useState("open");

  useEffect(() => {
    async function loadNotices() {
      try {
        setNotices(await getStudentJobNotices(uid));
      } catch (err) {
        console.error("Failed to load job notices:", err);
        setError("Job notices are temporarily unavailable.");
      } finally {
        setLoading(false);
      }
    }

    loadNotices();
  }, [uid]);

  function alreadyAdded(noticeId) {
    return applications.some((application) => application.jobNoticeId === noticeId);
  }

  const availableNotices = notices.filter((notice) => !alreadyAdded(notice.id));
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredNotices = availableNotices.filter((notice) => {
    const matchesSearch = !normalizedSearch || [
      notice.company,
      notice.role,
      notice.location,
      notice.description,
    ].some((value) => value?.toLowerCase().includes(normalizedSearch));
    const deadlineDays = daysUntilDeadline(notice.deadline);

    const matchesDeadline = deadlineFilter === "all"
      || (deadlineFilter === "open" && (deadlineDays === null || deadlineDays >= 0))
      || (deadlineFilter === "closing-soon" && deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 3)
      || (deadlineFilter === "expired" && deadlineDays !== null && deadlineDays < 0);

    return matchesSearch && matchesDeadline;
  });

  return (
    <section id="job-notices" className="job-notice-feed mt-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
        <div>
          <p className="eyebrow">Targeted opportunities</p>
          <h2 className="text-2xl font-bold">Job notices</h2>
        </div>
        <p className="text-sm text-gray-500">Opportunities shared with your student circle.</p>
      </div>

      {loading ? (
        <div className="surface p-5 text-gray-500">Loading job notices…</div>
      ) : error ? (
        <div className="surface p-5 text-red-600">{error}</div>
      ) : availableNotices.length === 0 ? (
        <div className="surface p-5 text-gray-500">No new job notices have been shared with your circle yet.</div>
      ) : (
        <>
          <div className="notice-controls surface p-4 mb-4">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search company, role, location, or details"
              aria-label="Search job notices"
            />
            <select
              value={deadlineFilter}
              onChange={(event) => setDeadlineFilter(event.target.value)}
              aria-label="Filter notices by deadline"
            >
              <option value="open">Open opportunities</option>
              <option value="closing-soon">Closing within 3 days</option>
              <option value="all">All opportunities</option>
              <option value="expired">Expired opportunities</option>
            </select>
            <span className="notice-result-count">
              {filteredNotices.length} {filteredNotices.length === 1 ? "notice" : "notices"}
            </span>
          </div>

          {filteredNotices.length === 0 ? (
            <div className="surface p-5 text-gray-500">
              No notices match this search or deadline filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredNotices.map((notice) => {
            const expired = isExpired(notice.deadline);
            const urgencyClass = deadlineTone(notice.deadline);

            return (
              <article key={notice.id} className="surface job-notice-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold">{notice.company}</h3>
                    <p className="text-gray-600 mt-1">{notice.role}</p>
                  </div>
                  <span className={expired ? "notice-status notice-status-expired" : "notice-status"}>
                    {expired ? "Expired" : "Open"}
                  </span>
                </div>
                <div className="job-notice-meta mt-4">
                  {notice.location && <span>{notice.location}</span>}
                  {notice.packageLpa != null && <span>₹{notice.packageLpa} LPA</span>}
                  <span>Deadline: {formatDeadline(notice.deadline)}</span>
                </div>
                <p className={`notice-deadline ${urgencyClass}`}>
                  {deadlineLabel(notice.deadline)}
                </p>
                <p className="text-gray-600 mt-4 whitespace-pre-line">{notice.description}</p>
                <button
                  type="button"
                  className="primary-button mt-5"
                  disabled={expired}
                  onClick={() => navigate("/applications/new", { state: { notice } })}
                >
                  {expired ? "Notice expired" : "Add to applications"}
                </button>
              </article>
            );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default JobNoticeFeed;
