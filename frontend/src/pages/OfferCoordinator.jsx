import { useEffect, useState } from "react";

import Layout from "../components/Layout";
import Toast from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../context/AuthContext";
import {
  getCircles,
  getCoordinatorNotices,
  getCoordinatorProfile,
  createJobNotice,
  deleteJobNotice,
  updateJobNotice,
} from "../services/jobNotices";

const emptyNotice = {
  company: "",
  role: "",
  location: "",
  packageLpa: "",
  deadline: "",
  description: "",
  targetCircleId: "",
  status: "published",
};

function OfferCoordinator() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [circles, setCircles] = useState([]);
  const [notices, setNotices] = useState([]);
  const [notice, setNotice] = useState(emptyNotice);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    async function loadWorkspace() {
      if (!user) return;

      try {
        const coordinator = await getCoordinatorProfile(user.uid);
        setProfile(coordinator);

        if (!coordinator) return;

        const [availableCircles, coordinatorNotices] = await Promise.all([
          getCircles(coordinator.circleIds),
          getCoordinatorNotices(user.uid),
        ]);

        setCircles(availableCircles);
        setNotices(coordinatorNotices);
        setNotice((current) => ({
          ...current,
          targetCircleId: availableCircles[0]?.id || "",
        }));
      } catch (err) {
        console.error("Failed to load coordinator workspace:", err);
        setToast({ message: "Unable to load coordinator workspace.", type: "error" });
      } finally {
        setLoading(false);
      }
    }

    loadWorkspace();
  }, [user]);

  function updateNotice(field, value) {
    setNotice((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      const noticeData = {
        ...notice,
        packageLpa: notice.packageLpa === "" ? null : Number(notice.packageLpa),
      };

      if (editingId) {
        await updateJobNotice(editingId, noticeData);
        setNotices((current) => current.map((item) => (
          item.id === editingId ? { ...item, ...noticeData } : item
        )));
        setToast({ message: "Job notice updated.", type: "success" });
      } else {
        const document = await createJobNotice(user.uid, noticeData);
        setNotices((current) => [
          { id: document.id, ...noticeData, createdAt: new Date() },
          ...current,
        ]);
        setToast({
          message: notice.status === "draft"
            ? "Job notice saved as a draft."
            : "Job notice published to the selected circle.",
          type: "success",
        });
      }

      setNotice({ ...emptyNotice, targetCircleId: circles[0]?.id || "" });
      setEditingId(null);
    } catch (err) {
      console.error("Failed to publish job notice:", err);
      setToast({ message: "Unable to publish the job notice.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  function startEditing(item) {
    setEditingId(item.id);
    setNotice({
      company: item.company || "",
      role: item.role || "",
      location: item.location || "",
      packageLpa: item.packageLpa ?? "",
      deadline: item.deadline || "",
      description: item.description || "",
      targetCircleId: item.targetCircleId || circles[0]?.id || "",
      status: item.status || "published",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditing() {
    setEditingId(null);
    setNotice({ ...emptyNotice, targetCircleId: circles[0]?.id || "" });
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      await deleteJobNotice(deleteTarget.id);
      setNotices((current) => current.filter((item) => item.id !== deleteTarget.id));
      setToast({ message: "Job notice deleted.", type: "success" });
    } catch (err) {
      console.error("Failed to delete job notice:", err);
      setToast({ message: "Unable to delete the job notice.", type: "error" });
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <Layout>
      <div className="form-shell coordinator-page">
        <div className="page-heading">
          <p className="eyebrow">Offer coordinator</p>
          <h1 className="page-title">Manage job opportunities</h1>
          <p className="page-subtitle">
            Notices are visible only to students in the selected circle.
          </p>
        </div>

        {loading ? (
          <div className="surface p-6 text-gray-500">Checking coordinator access…</div>
        ) : !profile ? (
          <div className="surface p-6">
            <h2 className="text-xl font-bold">Coordinator access required</h2>
            <p className="text-gray-500 mt-2">
              Your account has not been assigned an offer-coordinator role.
            </p>
          </div>
        ) : !circles.length ? (
          <div className="surface p-6">
            <h2 className="text-xl font-bold">No circles assigned</h2>
            <p className="text-gray-500 mt-2">
              Ask the placement cell to assign at least one student circle to your account.
            </p>
          </div>
        ) : (
          <>
            <div className="surface form-card">
              <form onSubmit={handleSubmit}>
                <label>
                  <span>Company</span>
                  <input value={notice.company} onChange={(event) => updateNotice("company", event.target.value)} required />
                </label>
                <label>
                  <span>Role</span>
                  <input value={notice.role} onChange={(event) => updateNotice("role", event.target.value)} required />
                </label>
                <label>
                  <span>Target circle</span>
                  <select value={notice.targetCircleId} onChange={(event) => updateNotice("targetCircleId", event.target.value)} required>
                    {circles.map((circle) => <option key={circle.id} value={circle.id}>{circle.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Visibility</span>
                  <select value={notice.status} onChange={(event) => updateNotice("status", event.target.value)}>
                    <option value="published">Published — visible to students</option>
                    <option value="draft">Draft — visible only to you</option>
                  </select>
                </label>
                <label>
                  <span>Location</span>
                  <input value={notice.location} onChange={(event) => updateNotice("location", event.target.value)} placeholder="Bengaluru / Remote" />
                </label>
                <label>
                  <span>Package (LPA)</span>
                  <input type="number" min="0" step="any" value={notice.packageLpa} onChange={(event) => updateNotice("packageLpa", event.target.value)} />
                </label>
                <label>
                  <span>Application deadline</span>
                  <input type="date" value={notice.deadline} onChange={(event) => updateNotice("deadline", event.target.value)} required />
                </label>
                <label>
                  <span>Description</span>
                  <textarea value={notice.description} onChange={(event) => updateNotice("description", event.target.value)} placeholder="Eligibility, application link, and other details" required />
                </label>
                <button type="submit" disabled={saving} className="primary-button">
                  {saving ? "Saving…" : editingId ? "Save changes" : notice.status === "draft" ? "Save draft" : "Publish notice"}
                </button>
                {editingId && (
                  <button type="button" onClick={cancelEditing} className="secondary-button">
                    Cancel editing
                  </button>
                )}
              </form>
            </div>

            <section className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Your notices</h2>
              {notices.length === 0 ? (
                <div className="surface p-5 text-gray-500">No notices published yet.</div>
              ) : (
                <div className="space-y-3">
                  {notices.map((item) => (
                    <article key={item.id} className="surface p-5">
                      <div className="flex items-start justify-between gap-4">
                        <p className="font-bold text-lg">{item.company} · {item.role}</p>
                        <span className={item.status === "draft" ? "notice-status notice-status-draft" : "notice-status"}>
                          {item.status === "draft" ? "Draft" : "Published"}
                        </span>
                      </div>
                      <p className="text-gray-500 mt-1">Deadline: {item.deadline || "Not specified"}</p>
                      <div className="flex gap-3 mt-4">
                        <button type="button" className="secondary-button" onClick={() => startEditing(item)}>
                          Edit
                        </button>
                        <button type="button" className="danger-button" onClick={() => setDeleteTarget(item)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        {deleteTarget && (
          <ConfirmModal
            message={`Delete the ${deleteTarget.company} · ${deleteTarget.role} notice? This cannot be undone.`}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </div>
    </Layout>
  );
}

export default OfferCoordinator;
