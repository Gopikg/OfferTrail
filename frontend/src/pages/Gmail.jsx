import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Layout from "../components/Layout";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import {
  getGmailMessages,
  startGmailConnection,
} from "../services/gmail";
import {
  addApplication,
  getApplications,
  updateApplication,
} from "../services/firestore";

function Gmail() {
  const [emails, setEmails] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [savingEmailId, setSavingEmailId] = useState(null);
  const [toast, setToast] = useState(null);
  const [scanWarning, setScanWarning] = useState("");
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const gmailResult = searchParams.get("gmail");
  const callbackToasts = {
    connected: { message: "Gmail connected successfully.", type: "success" },
    "expired-session": { message: "Gmail connection timed out. Please try again.", type: "error" },
    "invalid-session": { message: "Gmail connection could not be verified. Please try again.", type: "error" },
    "connection-failed": { message: "Gmail could not be connected. Please try again.", type: "error" },
  };
  const callbackToast = gmailResult
    ? callbackToasts[gmailResult] || callbackToasts["connection-failed"]
    : null;

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const [gmailResponse, existingApplications] =
          await Promise.all([
            getGmailMessages(user),
            getApplications(user.uid),
          ]);

        setEmails(gmailResponse.messages || []);
        setApplications(existingApplications || []);
        setNextPageToken(gmailResponse.nextPageToken || null);
        if (gmailResponse.failedMessageCount) {
          setScanWarning(
            `${gmailResponse.failedMessageCount} email${
              gmailResponse.failedMessageCount === 1 ? "" : "s"
            } could not be checked. Refresh to try again.`
          );
        } else if (gmailResponse.hasMoreMessages) {
          setScanWarning(
            `Only the most recent ${gmailResponse.scanLimit} emails from the last three days were checked.`
          );
        } else {
          setScanWarning("");
        }

      } catch (err) {
        console.error(err);

        setToast({
          message: err.message,
          type: "error",
        });

      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  async function connectGmail() {
    if (!user) {
      setToast({
        message: "Please log in first.",
        type: "error",
      });

      return;
    }

    try {
      setConnecting(true);

      const data = await startGmailConnection(user);

      window.location.href = data.authorization_url;

    } catch (err) {
      console.error(err);

      setToast({
        message: err.message,
        type: "error",
      });

      setConnecting(false);
    }
  }

  async function loadMoreEmails() {
    if (!user || !nextPageToken) return;

    try {
      setLoadingMore(true);
      const response = await getGmailMessages(user, nextPageToken);

      setEmails((current) => {
        const existingIds = new Set(current.map((email) => email.id));
        return [
          ...current,
          ...(response.messages || []).filter((email) => !existingIds.has(email.id)),
        ];
      });
      setNextPageToken(response.nextPageToken || null);
      if (response.failedMessageCount) {
        setScanWarning(
          `${response.failedMessageCount} email${
            response.failedMessageCount === 1 ? "" : "s"
          } could not be checked. Refresh to try again.`
        );
      } else {
        setScanWarning("");
      }
    } catch (err) {
      console.error(err);
      setToast({ message: err.message, type: "error" });
    } finally {
      setLoadingMore(false);
    }
  }

  function findMatchingApplication(email) {
    if (!email.extracted) {
      return null;
    }

    const emailCompany =
      email.extracted.company?.trim().toLowerCase();

    const emailRole =
      email.extracted.role?.trim().toLowerCase();

    if (!emailCompany) {
      return null;
    }

    const companyApplications = applications.filter((application) => {
      const applicationCompany =
        application.company?.trim().toLowerCase();

      return applicationCompany === emailCompany;
    });

    const exactMatch = emailRole && companyApplications.find((application) => {

      const applicationRole =
        application.role?.trim().toLowerCase();

      return applicationRole === emailRole;
    });

    if (exactMatch) return exactMatch;

    // Later-stage emails often omit the role. If the user has only one active
    // application at that company, safely offer it as the update target.
    const activeApplications = companyApplications.filter(
      (application) =>
        application.stage !== "Offer" &&
        application.stage !== "Rejected"
    );

    return activeApplications.length === 1
      ? activeApplications[0]
      : null;
  }

  function isProcessedEmail(email) {
    return applications.some((application) => {
      const messageIds = [
        ...(application.gmailMessageIds || []),
        application.gmailMessageId,
      ].filter(Boolean);

      return messageIds.includes(email.id);
    });
  }

  function applicationFromEmail(email) {
    const extracted = email.extracted;

    return {
      company: extracted.company.trim(),
      role: extracted.role.trim(),
      stage: extracted.stage,
      deadline: "",
      notes: `Imported from Gmail\n\nSubject: ${email.subject || "No subject"}\nFrom: ${email.from || "Unknown sender"}`,
      gmailMessageIds: [email.id],
    };
  }

  async function handleUpdate(email, application) {
    const newStage = email.extracted?.stage;

    if (!newStage) {
      return;
    }

    if (newStage === application.stage) {
      setToast({
        message: "Application is already at this stage.",
        type: "error",
      });

      return;
    }

    try {
      setSavingEmailId(email.id);

      await updateApplication(
        user.uid,
        application.id,
        {
          ...application,
          stage: newStage,
          gmailMessageIds: [
            ...(application.gmailMessageIds || []),
            email.id,
          ],
        },
        application.stage
      );

      setApplications((current) =>
        current.map((item) =>
          item.id === application.id
            ? {
                ...item,
                stage: newStage,
                gmailMessageIds: [
                  ...(item.gmailMessageIds || []),
                  email.id,
                ],
                stageHistory: [
                  ...(item.stageHistory || []),
                  {
                    stage: newStage,
                    changedAt:
                      new Date().toISOString(),
                  },
                ],
              }
            : item
        )
      );

      setEmails((current) =>
        current.filter((item) => item.id !== email.id)
      );

      setToast({
        message: `Application updated to ${newStage}.`,
        type: "success",
      });

    } catch (err) {
      console.error(err);

      setToast({
        message: "Failed to update application.",
        type: "error",
      });

    } finally {
      setSavingEmailId(null);
    }
  }

  async function handleImport(email) {
    const extracted = email.extracted;

    if (!extracted?.company || !extracted?.role || !extracted?.stage) {
      navigate("/applications/new", { state: email });
      return;
    }

    try {
      setSavingEmailId(email.id);

      const application = applicationFromEmail(email);

      const document = await addApplication(user.uid, application);

      setApplications((current) => [
        ...current,
        { id: document.id, ...application },
      ]);

      setEmails((current) =>
        current.filter((item) => item.id !== email.id)
      );

      setToast({
        message: "Application added to your dashboard.",
        type: "success",
      });
    } catch (err) {
      console.error(err);
      setToast({
        message: "Failed to add application.",
        type: "error",
      });
    } finally {
      setSavingEmailId(null);
    }
  }

  const reviewEmails = emails.filter((email) => !isProcessedEmail(email));
  const updateCount = reviewEmails.filter((email) => {
    const application = findMatchingApplication(email);
    return application && application.stage !== email.extracted?.stage;
  }).length;
  const reviewCount = reviewEmails.filter(
    (email) => !findMatchingApplication(email) &&
      (!email.extracted?.company || !email.extracted?.role)
  ).length;
  const readyNewEmails = reviewEmails.filter(
    (email) => !findMatchingApplication(email) &&
      email.extracted?.company && email.extracted?.role &&
      email.extracted?.stage && email.extracted?.confidence === "high"
  );

  async function handleAddAllNew() {
    try {
      setSavingEmailId("bulk");

      const seenApplications = new Set();
      const createdApplications = [];
      const processedIds = [];

      for (const email of readyNewEmails) {
        const key = `${email.extracted.company.trim().toLowerCase()}::${
          email.extracted.role.trim().toLowerCase()
        }`;

        // A review window can contain several messages about the same new role.
        // Add it once and leave later messages for an intentional follow-up.
        if (seenApplications.has(key)) continue;

        const application = applicationFromEmail(email);
        const document = await addApplication(user.uid, application);

        seenApplications.add(key);
        createdApplications.push({ id: document.id, ...application });
        processedIds.push(email.id);
      }

      setApplications((current) => [...current, ...createdApplications]);
      setEmails((current) =>
        current.filter((email) => !processedIds.includes(email.id))
      );
      setToast({
        message: `${createdApplications.length} application${
          createdApplications.length === 1 ? "" : "s"
        } added to your dashboard.`,
        type: "success",
      });
    } catch (err) {
      console.error(err);
      setToast({
        message: "Some applications could not be added. Please try again.",
        type: "error",
      });
    } finally {
      setSavingEmailId(null);
    }
  }

  return (
    <Layout>
      <div className="gmail-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 page-heading">

        <div>
          <p className="eyebrow">Mail review</p>
          <h1 className="page-title">
            Review application mail
          </h1>

          <p className="page-subtitle">
            Relevant application emails from the last three days.
          </p>
        </div>

        <button
          onClick={connectGmail}
          disabled={connecting}
          className="primary-button"
        >
          {connecting
            ? "Connecting..."
            : "Connect Gmail"}
        </button>

      </div>

      {loading ? (
        <p>Loading emails...</p>

      ) : reviewEmails.length === 0 ? (
        <>
          <p className="text-gray-500">
            No relevant application emails from the last three days.
          </p>
          {scanWarning && <p className="text-sm text-amber-700 mt-2">{scanWarning}</p>}
          {nextPageToken && (
            <button
              onClick={loadMoreEmails}
              disabled={loadingMore}
              className="primary-button disabled:bg-gray-400 mt-4"
            >
              {loadingMore ? "Checking more emails..." : "Load more emails"}
            </button>
          )}
        </>

      ) : (
        <div className="space-y-4">

          {scanWarning && <p className="text-sm text-amber-700">{scanWarning}</p>}

          <section className="review-summary">
            <div>
              <span>{readyNewEmails.length}</span>
              <p>ready to add</p>
            </div>
            <div>
              <span>{updateCount}</span>
              <p>stage updates</p>
            </div>
            <div>
              <span>{reviewCount}</span>
              <p>need review</p>
            </div>
            {readyNewEmails.length > 0 && (
              <button
                onClick={handleAddAllNew}
                disabled={savingEmailId === "bulk"}
                className="primary-button"
              >
                {savingEmailId === "bulk"
                  ? "Adding applications..."
                  : `Add ${readyNewEmails.length} ready application${
                    readyNewEmails.length === 1 ? "" : "s"
                  }`}
              </button>
            )}
          </section>

          {reviewEmails.map((email) => {
            const matchingApplication = findMatchingApplication(email);

            return (
              <div
                key={email.id}
                className="email-card"
              >

                <h2 className="font-bold">
                  {email.subject}
                </h2>

                <p className="text-sm text-gray-500">
                  From: {email.from}
                </p>

                <div className="mt-3">

                  <span className="text-green-600 font-medium">
                    Job-related email
                  </span>

                    {email.extracted && (
                      <div className="mt-2 text-sm space-y-1">

                        <p>
                          <strong>Company:</strong>{" "}
                          {email.extracted.company ||
                            "Not detected"}
                        </p>

                        <p>
                          <strong>Role:</strong>{" "}
                          {email.extracted.role ||
                            "Not detected"}
                        </p>

                        <p>
                          <strong>Stage:</strong>{" "}
                          {email.extracted.stage ||
                            "Not detected"}
                        </p>

                        <p>
                          <strong>Detection confidence:</strong>{" "}
                          {email.extracted.confidence || "low"}
                          {typeof email.extracted.confidence_score === "number" &&
                            ` (${email.extracted.confidence_score}/100)`}
                        </p>

                        {email.extracted.reasons?.length > 0 && (
                          <p>
                            <strong>Why:</strong>{" "}
                            {email.extracted.reasons.join(", ")}
                          </p>
                        )}

                      </div>
                    )}

                    {matchingApplication ? (
                      <div className="mt-4">

                        <p className="text-sm text-blue-600 mb-2">
                          Existing application found.
                        </p>

                        {matchingApplication.stage ===
                        email.extracted.stage ? (
                          <span className="text-gray-500 text-sm">
                            Application is already at this stage.
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              handleUpdate(
                                email,
                                matchingApplication
                              )
                            }
                            disabled={
                              savingEmailId === email.id || savingEmailId === "bulk"
                            }
                            className="primary-button disabled:bg-gray-400"
                          >
                            {savingEmailId === email.id
                              ? "Updating..."
                              : `Update to ${email.extracted.stage}`}
                          </button>
                        )}

                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          handleImport(email)
                        }
                        disabled={savingEmailId === email.id || savingEmailId === "bulk"}
                        className="mt-4 primary-button disabled:bg-gray-400"
                      >
                        {savingEmailId === email.id
                          ? "Adding..."
                          : email.extracted?.company &&
                              email.extracted?.role &&
                              email.extracted?.confidence === "high"
                            ? "Add to Dashboard"
                            : "Review and Add"}
                      </button>
                    )}

                </div>

              </div>
            );
            })}

          {nextPageToken && (
            <button
              onClick={loadMoreEmails}
              disabled={loadingMore}
              className="primary-button disabled:bg-gray-400"
            >
              {loadingMore ? "Checking more emails..." : "Load more emails"}
            </button>
          )}
        </div>
      )}

      {(toast || callbackToast) && (
        <Toast
          message={(toast || callbackToast).message}
          type={(toast || callbackToast).type}
          onClose={() => {
            setToast(null);
            if (callbackToast) navigate("/gmail", { replace: true });
          }}
        />
      )}
      </div>
    </Layout>
  );
}

export default Gmail;
