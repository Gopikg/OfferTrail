import { useEffect, useState } from "react";

import Layout from "../components/Layout";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import {
  getPublicPlacementOverview,
  isPlacementAdmin,
  savePublicPlacementOverview,
} from "../services/publicInsights";

const fields = [
  ["companiesVisited", "Companies visiting"],
  ["totalOffers", "Total offers"],
  ["placementRate", "Placement rate (%)"],
  ["averagePackageLpa", "Average package (LPA)"],
  ["highestPackageLpa", "Highest package (LPA)"],
];

function PlacementAdmin() {
  const { user } = useAuth();
  const [overview, setOverview] = useState({});
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function loadAdminWorkspace() {
      if (!user) return;

      try {
        const admin = await isPlacementAdmin(user.uid);
        setAuthorized(admin);

        if (admin) {
          setOverview((await getPublicPlacementOverview()) || {});
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

  function updateField(field, value) {
    setOverview((current) => ({
      ...current,
      [field]: value === "" ? "" : Number(value),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);

      await savePublicPlacementOverview(user.uid, overview);

      setToast({
        message: "Public placement overview published.",
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
      <div className="form-shell">
        <div className="page-heading">
          <p className="eyebrow">Placement cell</p>
          <h1 className="page-title">Publish placement overview</h1>
          <p className="page-subtitle">
            These figures are visible on OfferTrail’s public home page.
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
          <div className="surface form-card">
            <form onSubmit={handleSubmit}>
              {fields.map(([field, label]) => (
                <label key={field} className="block">
                  <span className="block text-sm font-semibold mb-2">{label}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={overview[field] ?? ""}
                    onChange={(event) => updateField(field, event.target.value)}
                    required
                  />
                </label>
              ))}

              <button type="submit" disabled={saving} className="primary-button">
                {saving ? "Publishing…" : "Publish overview"}
              </button>
            </form>
          </div>
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
