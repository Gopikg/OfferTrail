import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Layout from "../components/Layout";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";

function Gmail() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [toast, setToast] = useState(null);

  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    async function loadEmails() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();

        const response = await fetch(
          "http://localhost:8000/gmail/messages",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);

          throw new Error(
            errorData?.detail ||
            "Failed to fetch Gmail messages."
          );
        }

        const data = await response.json();

        setEmails(data.messages || []);

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

    loadEmails();
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

      const token = await user.getIdToken();

      const response = await fetch(
        "http://localhost:8000/gmail/connect",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail ||
          "Failed to start Gmail connection."
        );
      }

      const data = await response.json();

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

  function handleImport(email) {
    navigate("/applications/new", {
      state: email,
    });
  }

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">

        <div>
          <h1 className="text-3xl font-bold">
            Gmail Applications
          </h1>

          <p className="text-gray-500 mt-1">
            Import recruitment emails into OfferTrail.
          </p>
        </div>

        <button
          onClick={connectGmail}
          disabled={connecting}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-5 py-2 rounded-lg"
        >
          {connecting
            ? "Connecting..."
            : "Connect Gmail"}
        </button>

      </div>

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

                    </div>
                  )}

                  <button
                    onClick={() => handleImport(email)}
                    className="mt-4 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded"
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