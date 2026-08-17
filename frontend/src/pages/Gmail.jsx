import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import Toast from "../components/Toast";

function Gmail() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadEmails() {
      try {
        const response = await fetch(
          "http://localhost:8000/gmail/messages"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch Gmail messages.");
        }

        const data = await response.json();

        setEmails(data.messages || []);
      } catch (err) {
        console.error(err);

        setToast({
          message: "Failed to load Gmail messages.",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    }

    loadEmails();
  }, []);

  function handleImport(email) {
    navigate("/applications/new", {
      state: email,
    });
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">
        Gmail Applications
      </h1>

      {loading ? (
        <p>Loading emails...</p>
      ) : emails.length === 0 ? (
        <p className="text-gray-500">
          No emails found.
        </p>
      ) : (
        <div className="space-y-4">
          {emails.map((email) => (
            <div
              key={email.id}
              className="border rounded-lg p-4"
            >
              <h2 className="font-bold">
                {email.subject}
              </h2>

              <p className="text-sm text-gray-500">
                From: {email.from}
              </p>

              {email.isJobEmail ? (
                <div className="mt-3">
                  <span className="text-green-600 font-medium">
                    Job-related email
                  </span>

                  {email.extracted && (
                    <div className="mt-2 text-sm">
                      <p>
                        <strong>Company:</strong>{" "}
                        {email.extracted.company || "Not detected"}
                      </p>

                      <p>
                        <strong>Role:</strong>{" "}
                        {email.extracted.role || "Not detected"}
                      </p>

                      <p>
                        <strong>Stage:</strong>{" "}
                        {email.extracted.stage || "Not detected"}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => handleImport(email)}
                    className="mt-4 bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    Import Application
                  </button>
                </div>
              ) : (
                <span className="text-gray-500 text-sm">
                  Not a job-related email
                </span>
              )}
            </div>
          ))}
        </div>
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

export default Gmail;