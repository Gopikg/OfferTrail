import { useEffect, useState } from "react";

import Layout from "../components/Layout";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import {
  isPlacementAdmin,
} from "../services/publicInsights";
import {
  createPlacementReport,
  emptyMetrics,
  getPlacementReports,
  publishPlacementReport,
  savePlacementReport,
} from "../services/placementReports";
import { getAllCircles } from "../services/jobNotices";
import {
  approveCoordinatorRequest,
  addCoordinatorToCircle,
  addStudentToCircle,
  createCircle,
  getCoordinatorProfiles,
  getStudentProfiles,
  getPendingCoordinatorRequests,
  rejectCoordinatorRequest,
  removeStudentFromCircle,
  removeCoordinatorFromCircle,
} from "../services/roleRequests";

const fields = [
  ["companiesVisited", "Companies visiting"],
  ["totalOffers", "Total offers"],
  ["placementRate", "Placement rate (%)"],
  ["averagePackageLpa", "Average package (LPA)"],
  ["highestPackageLpa", "Highest package (LPA)"],
];

function PlacementAdmin() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(emptyMetrics());
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [requests, setRequests] = useState([]);
  const [circles, setCircles] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [reviewingId, setReviewingId] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedCircleId, setSelectedCircleId] = useState("");
  const [newCircle, setNewCircle] = useState({ name: "", description: "" });
  const [creatingCircle, setCreatingCircle] = useState(false);
  const [updatingMembership, setUpdatingMembership] = useState(false);
  const [coordinators, setCoordinators] = useState([]);
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState("");
  const [coordinatorCircleId, setCoordinatorCircleId] = useState("");
  const [updatingCoordinator, setUpdatingCoordinator] = useState(false);
  const [activeOperation, setActiveOperation] = useState(null);

  useEffect(() => {
    async function loadAdminWorkspace() {
      if (!user) return;

      try {
        const admin = await isPlacementAdmin(user.uid);
        setAuthorized(admin);

        if (admin) {
          const [savedReports, pendingRequests, availableCircles, registeredStudents, approvedCoordinators] = await Promise.all([
            getPlacementReports(),
            getPendingCoordinatorRequests(),
            getAllCircles(),
            getStudentProfiles(),
            getCoordinatorProfiles(),
          ]);

          setReports(savedReports);
          if (savedReports[0]) selectReport(savedReports[0]);
          setRequests(pendingRequests);
          setCircles(availableCircles);
          setStudents(registeredStudents);
          setCoordinators(approvedCoordinators);
          setSelectedStudentId(registeredStudents[0]?.id || "");
          setSelectedCircleId(availableCircles[0]?.id || "");
          setSelectedCoordinatorId(approvedCoordinators[0]?.id || "");
          setCoordinatorCircleId(availableCircles[0]?.id || "");
          setAssignments(Object.fromEntries(
            pendingRequests.map((request) => [request.id, availableCircles[0]?.id || ""])
          ));
        }
      } catch (err) {
        console.error("Failed to load placement administration:", err);
        setToast({
          message: "Unable to load placement administration.",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    }

    loadAdminWorkspace();
  }, [user]);

  function selectReport(report) {
    setSelectedReport(report);
    setOverview({ ...emptyMetrics(), ...(report.metrics || {}), activityByMonth: report.metrics?.activityByMonth || [] });
  }

  function updateField(field, value) {
    setOverview((current) => ({
      ...current,
      [field]: value === "" ? "" : Number(value),
    }));
  }

  function updateActivity(index, field, value) {
    setOverview((current) => ({
      ...current,
      activityByMonth: (current.activityByMonth || []).map((entry, entryIndex) => (
        entryIndex === index
          ? { ...entry, [field]: field === "period" ? value : value === "" ? "" : Number(value) }
          : entry
      )),
    }));
  }

  function addActivityMonth() {
    setOverview((current) => ({
      ...current,
      activityByMonth: [
        ...(current.activityByMonth || []),
        { period: new Date().toISOString().slice(0, 7), companies: "", offers: "" },
      ],
    }));
  }

  function removeActivityMonth(index) {
    setOverview((current) => ({
      ...current,
      activityByMonth: (current.activityByMonth || []).filter((_, entryIndex) => entryIndex !== index),
    }));
  }

  async function updateCoordinatorAssignment(action, circleId) {
    if (!selectedCoordinatorId || !circleId) return;

    try {
      setUpdatingCoordinator(true);
      if (action === "add") {
        await addCoordinatorToCircle(selectedCoordinatorId, circleId);
      } else {
        await removeCoordinatorFromCircle(selectedCoordinatorId, circleId);
      }

      setCoordinators((current) => current.map((coordinator) => {
        if (coordinator.id !== selectedCoordinatorId) return coordinator;

        const currentCircleIds = coordinator.circleIds || [];
        return {
          ...coordinator,
          circleIds: action === "add"
            ? [...new Set([...currentCircleIds, circleId])]
            : currentCircleIds.filter((id) => id !== circleId),
        };
      }));
      setToast({
        message: action === "add" ? "Circle assigned to coordinator." : "Circle removed from coordinator.",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to update coordinator assignment:", err);
      setToast({ message: "Unable to update coordinator assignment.", type: "error" });
    } finally {
      setUpdatingCoordinator(false);
    }
  }

  async function handleCreateCircle(event) {
    event.preventDefault();

    try {
      setCreatingCircle(true);
      const created = await createCircle({ ...newCircle, adminUid: user.uid });
      const circle = { id: created.id, ...newCircle };

      setCircles((current) => [...current, circle].sort((first, second) => (
        first.name.localeCompare(second.name)
      )));
      setSelectedCircleId(created.id);
      setNewCircle({ name: "", description: "" });
      setToast({ message: "Student circle created.", type: "success" });
    } catch (err) {
      console.error("Failed to create circle:", err);
      setToast({ message: "Unable to create the student circle.", type: "error" });
    } finally {
      setCreatingCircle(false);
    }
  }

  async function updateMembership(action, circleId) {
    if (!selectedStudentId || !circleId) return;

    try {
      setUpdatingMembership(true);
      if (action === "add") {
        await addStudentToCircle(selectedStudentId, circleId);
      } else {
        await removeStudentFromCircle(selectedStudentId, circleId);
      }

      setStudents((current) => current.map((student) => {
        if (student.id !== selectedStudentId) return student;

        const currentCircleIds = student.circleIds || [];
        return {
          ...student,
          circleIds: action === "add"
            ? [...new Set([...currentCircleIds, circleId])]
            : currentCircleIds.filter((id) => id !== circleId),
        };
      }));
      setToast({
        message: action === "add" ? "Student added to the circle." : "Student removed from the circle.",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to update circle membership:", err);
      setToast({ message: "Unable to update student membership.", type: "error" });
    } finally {
      setUpdatingMembership(false);
    }
  }

  const selectedStudent = students.find((student) => student.id === selectedStudentId);
  const selectedStudentCircles = circles.filter((circle) => (
    selectedStudent?.circleIds?.includes(circle.id)
  ));
  const selectedCoordinator = coordinators.find((coordinator) => coordinator.id === selectedCoordinatorId);
  const selectedCoordinatorCircles = circles.filter((circle) => (
    selectedCoordinator?.circleIds?.includes(circle.id)
  ));

  async function reviewRequest(request, decision) {
    const circleId = assignments[request.id];

    if (decision === "approve" && !circleId) {
      setToast({ message: "Create a circle before approving a coordinator.", type: "error" });
      return;
    }

    try {
      setReviewingId(request.id);

      if (decision === "approve") {
        await approveCoordinatorRequest({
          requestId: request.id,
          adminUid: user.uid,
          circleId,
          email: request.email,
        });

        setCoordinators((current) => [
          ...current,
          { id: request.id, email: request.email, role: "offer-coordinator", circleIds: [circleId] },
        ].sort((first, second) => (first.email || first.id).localeCompare(second.email || second.id)));
      } else {
        await rejectCoordinatorRequest(request.id, user.uid);
      }

      setRequests((current) => current.filter((item) => item.id !== request.id));
      setToast({
        message: decision === "approve"
          ? "Coordinator access approved and circle assigned."
          : "Coordinator request rejected.",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to review coordinator request:", err);
      setToast({ message: "Unable to review the coordinator request.", type: "error" });
    } finally {
      setReviewingId(null);
    }
  }

  async function handleCreateReport() {
    const year = new Date().getFullYear();
    const report = {
      academicYear: `${year}-${year + 1}`,
      asOfDate: new Date().toISOString().slice(0, 10),
      metrics: emptyMetrics(),
    };
    try {
      setSaving(true);
      const created = await createPlacementReport(user.uid, report);
      const next = { id: created.id, ...report, status: "draft" };
      setReports((current) => [next, ...current]);
      selectReport(next);
      setToast({ message: "Draft reporting period created.", type: "success" });
    } catch (err) {
      setToast({ message: err.message || "Unable to create reporting period.", type: "error" });
    } finally { setSaving(false); }
  }

  async function handleSubmit(event, publish = false) {
    event.preventDefault();

    if (!selectedReport) {
      setToast({ message: "Create and select a reporting period first.", type: "error" });
      return;
    }

    try {
      setSaving(true);
      const report = { ...selectedReport, metrics: overview };
      if (publish) await publishPlacementReport(user.uid, report);
      else await savePlacementReport(user.uid, report);
      const updated = { ...report, status: publish ? "published" : selectedReport.status };
      setReports((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelectedReport(updated);

      setToast({
        message: publish ? "Report published to the public dashboard." : "Draft saved. It is not public yet.",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to publish placement overview:", err);
      setToast({
        message: "Unable to publish the overview.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="placement-admin-shell">
        <div className="page-heading">
          <p className="eyebrow">Placement cell</p>
          <h1 className="page-title">Placement operations</h1>
          <p className="page-subtitle">
            Keep your placement cell running from one focused workspace.
          </p>
        </div>

        {loading ? (
          <div className="surface p-6 text-gray-500">Checking access…</div>
        ) : !authorized ? (
          <div className="surface p-6">
            <h2 className="text-xl font-bold">Placement-cell access required</h2>
            <p className="text-gray-500 mt-2">
              Your account has not been assigned permission to publish institutional figures.
            </p>
          </div>
        ) : (
          <>
          <div className="admin-operations-list">
          <section className="admin-operation-card">
            <button type="button" className="admin-operation-toggle" onClick={() => setActiveOperation((current) => current === "reporting" ? null : "reporting")} aria-expanded={activeOperation === "reporting"}>
              <span>Publish placement results</span><span aria-hidden="true">{activeOperation === "reporting" ? "−" : "+"}</span>
            </button>
          {activeOperation === "reporting" && <div className="admin-operation-content">
          <div className="surface form-card">
            <div className="flex flex-wrap gap-3 mb-5">
              <button type="button" className="secondary-button" disabled={saving} onClick={handleCreateReport}>
                Create reporting period
              </button>
              {reports.length > 0 && (
                <label className="block flex-1">
                  <span className="block text-sm font-semibold mb-2">Reporting period</span>
                  <select
                    value={selectedReport?.id || ""}
                    onChange={(event) => selectReport(reports.find((report) => report.id === event.target.value))}
                  >
                    {reports.map((report) => (
                      <option key={report.id} value={report.id}>
                        {report.academicYear} — {report.status}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {!selectedReport ? (
              <p className="text-gray-500">Create a reporting period before entering placement figures.</p>
            ) : <form onSubmit={(event) => handleSubmit(event)}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <label className="block">
                  <span className="block text-sm font-semibold mb-2">Academic year</span>
                  <input value={selectedReport.academicYear || ""} placeholder="2026-2027" required
                    onChange={(event) => setSelectedReport((current) => ({ ...current, academicYear: event.target.value }))} />
                </label>
                <label className="block">
                  <span className="block text-sm font-semibold mb-2">Figures as of</span>
                  <input type="date" value={selectedReport.asOfDate || ""} required
                    onChange={(event) => setSelectedReport((current) => ({ ...current, asOfDate: event.target.value }))} />
                </label>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Status: <strong>{selectedReport.status}</strong>. Only a published report is visible publicly.
              </p>
              <div className="admin-report-metrics">
                {fields.map(([field, label]) => (
                  <label key={field} className="block">
                    <span className="block text-sm font-semibold mb-2">{label}</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={overview[field] ?? ""}
                      onChange={(event) => updateField(field, event.target.value)}
                    />
                  </label>
                ))}
              </div>

              <div className="activity-editor">
                <div>
                  <span className="block text-sm font-semibold">Recruitment activity over time</span>
                  <p className="text-sm text-gray-500 mt-1">
                    Add monthly figures to publish the public recruitment trend chart.
                  </p>
                </div>

                {(overview.activityByMonth || []).map((entry, index) => (
                  <div key={`${entry.period}-${index}`} className="activity-editor-row">
                    <label>
                      <span>Month</span>
                      <input
                        type="month"
                        value={entry.period || ""}
                        onChange={(event) => updateActivity(index, "period", event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Companies</span>
                      <input
                        type="number"
                        min="0"
                        value={entry.companies ?? ""}
                        onChange={(event) => updateActivity(index, "companies", event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Offers</span>
                      <input
                        type="number"
                        min="0"
                        value={entry.offers ?? ""}
                        onChange={(event) => updateActivity(index, "offers", event.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="danger-button activity-remove-button"
                      onClick={() => removeActivityMonth(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button type="button" className="secondary-button" onClick={addActivityMonth}>
                  Add month
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={saving} className="secondary-button">
                  {saving ? "Saving…" : "Save draft"}
                </button>
                <button type="button" disabled={saving} className="primary-button" onClick={(event) => handleSubmit(event, true)}>
                  {saving ? "Publishing…" : "Publish report"}
                </button>
              </div>
            </form>
            }
          </div>
          </div>}
          </section>

          <section className="admin-operation-card">
            <button type="button" className="admin-operation-toggle" onClick={() => setActiveOperation((current) => current === "requests" ? null : "requests")} aria-expanded={activeOperation === "requests"}>
              <span>Coordinator requests</span><span aria-hidden="true">{activeOperation === "requests" ? "−" : "+"}</span>
            </button>

            {activeOperation === "requests" && <div className="admin-operation-content">
            {requests.length === 0 ? (
              <div className="surface p-5 text-gray-500">No pending coordinator requests.</div>
            ) : !circles.length ? (
              <div className="surface p-5 text-red-600">
                Create a circle in Firestore before approving coordinator requests.
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <article key={request.id} className="surface p-5">
                    <p className="font-bold">{request.email}</p>
                    <label className="block mt-4">
                      <span className="block text-sm font-semibold mb-2">Assign circle</span>
                      <select
                        value={assignments[request.id] || ""}
                        onChange={(event) => setAssignments((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))}
                      >
                        {circles.map((circle) => (
                          <option key={circle.id} value={circle.id}>{circle.name}</option>
                        ))}
                      </select>
                    </label>
                    <div className="flex flex-wrap gap-3 mt-4">
                      <button
                        type="button"
                        className="primary-button"
                        disabled={reviewingId === request.id}
                        onClick={() => reviewRequest(request, "approve")}
                      >
                        {reviewingId === request.id ? "Saving…" : "Approve coordinator"}
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        disabled={reviewingId === request.id}
                        onClick={() => reviewRequest(request, "reject")}
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            </div>}
          </section>

          <section className="admin-operation-card">
            <button type="button" className="admin-operation-toggle" onClick={() => setActiveOperation((current) => current === "coordinators" ? null : "coordinators")} aria-expanded={activeOperation === "coordinators"}>
              <span>Coordinator circles</span><span aria-hidden="true">{activeOperation === "coordinators" ? "−" : "+"}</span>
            </button>

            {activeOperation === "coordinators" && <div className="admin-operation-content">
            <div className="surface form-card">
              {coordinators.length === 0 ? (
                <p className="text-gray-500">No approved coordinators yet.</p>
              ) : !circles.length ? (
                <p className="text-gray-500">Create a circle before assigning coordinator coverage.</p>
              ) : (
                <>
                  <label className="block">
                    <span className="block text-sm font-semibold mb-2">Coordinator</span>
                    <select value={selectedCoordinatorId} onChange={(event) => setSelectedCoordinatorId(event.target.value)}>
                      {coordinators.map((coordinator) => (
                        <option key={coordinator.id} value={coordinator.id}>{coordinator.email || coordinator.id}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block mt-4">
                    <span className="block text-sm font-semibold mb-2">Add circle access</span>
                    <select value={coordinatorCircleId} onChange={(event) => setCoordinatorCircleId(event.target.value)}>
                      {circles.map((circle) => <option key={circle.id} value={circle.id}>{circle.name}</option>)}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="primary-button mt-4"
                    disabled={updatingCoordinator || selectedCoordinator?.circleIds?.includes(coordinatorCircleId)}
                    onClick={() => updateCoordinatorAssignment("add", coordinatorCircleId)}
                  >
                    {selectedCoordinator?.circleIds?.includes(coordinatorCircleId) ? "Already assigned" : "Add circle access"}
                  </button>

                  <div className="mt-5">
                    <p className="text-sm font-semibold">Current publishing circles</p>
                    {selectedCoordinatorCircles.length === 0 ? (
                      <p className="text-gray-500 mt-2">This coordinator cannot publish to any circle yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selectedCoordinatorCircles.map((circle) => (
                          <button
                            key={circle.id}
                            type="button"
                            className="membership-chip"
                            disabled={updatingCoordinator}
                            onClick={() => updateCoordinatorAssignment("remove", circle.id)}
                            title={`Remove ${circle.name} access`}
                          >
                            {circle.name} ×
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            </div>}
          </section>

          <section className="admin-operation-card">
            <button type="button" className="admin-operation-toggle" onClick={() => setActiveOperation((current) => current === "circles" ? null : "circles")} aria-expanded={activeOperation === "circles"}>
              <span>Create a circle</span><span aria-hidden="true">{activeOperation === "circles" ? "−" : "+"}</span>
            </button>

            {activeOperation === "circles" && <div className="admin-operation-content">
            <div className="surface form-card">
              <form onSubmit={handleCreateCircle}>
                <label>
                  <span>Circle name</span>
                  <input
                    value={newCircle.name}
                    onChange={(event) => setNewCircle((current) => ({ ...current, name: event.target.value }))}
                    placeholder="MCA 2026"
                    required
                  />
                </label>
                <label>
                  <span>Description</span>
                  <textarea
                    value={newCircle.description}
                    onChange={(event) => setNewCircle((current) => ({ ...current, description: event.target.value }))}
                    placeholder="MCA students graduating in 2026"
                  />
                </label>
                <button type="submit" disabled={creatingCircle} className="primary-button">
                  {creatingCircle ? "Creating…" : "Create circle"}
                </button>
              </form>
            </div>
            </div>}
          </section>

          <section className="admin-operation-card">
            <button type="button" className="admin-operation-toggle" onClick={() => setActiveOperation((current) => current === "membership" ? null : "membership")} aria-expanded={activeOperation === "membership"}>
              <span>Assign student membership</span><span aria-hidden="true">{activeOperation === "membership" ? "−" : "+"}</span>
            </button>

            {activeOperation === "membership" && <div className="admin-operation-content">
            <div className="surface form-card">
              {students.length === 0 ? (
                <p className="text-gray-500">No registered student profiles yet.</p>
              ) : !circles.length ? (
                <p className="text-gray-500">Create a circle before assigning students.</p>
              ) : (
                <>
                  <label className="block">
                    <span className="block text-sm font-semibold mb-2">Student</span>
                    <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>{student.email || student.id}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block mt-4">
                    <span className="block text-sm font-semibold mb-2">Add to circle</span>
                    <select value={selectedCircleId} onChange={(event) => setSelectedCircleId(event.target.value)}>
                      {circles.map((circle) => <option key={circle.id} value={circle.id}>{circle.name}</option>)}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="primary-button mt-4"
                    disabled={updatingMembership || selectedStudent?.circleIds?.includes(selectedCircleId)}
                    onClick={() => updateMembership("add", selectedCircleId)}
                  >
                    {selectedStudent?.circleIds?.includes(selectedCircleId) ? "Already assigned" : "Add to circle"}
                  </button>

                  <div className="mt-5">
                    <p className="text-sm font-semibold">Current circles</p>
                    {selectedStudentCircles.length === 0 ? (
                      <p className="text-gray-500 mt-2">This student has not been assigned to a circle.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selectedStudentCircles.map((circle) => (
                          <button
                            key={circle.id}
                            type="button"
                            className="membership-chip"
                            disabled={updatingMembership}
                            onClick={() => updateMembership("remove", circle.id)}
                            title={`Remove from ${circle.name}`}
                          >
                            {circle.name} ×
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            </div>}
          </section>
          </div>
          </>
        )}

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

export default PlacementAdmin;
