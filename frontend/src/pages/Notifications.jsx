import { useEffect, useState } from "react";

import JobNoticeFeed from "../components/JobNoticeFeed";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { getApplications } from "../services/firestore";

function Notifications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    if (!user) return;

    getApplications(user.uid)
      .then(setApplications)
      .catch((error) => console.error("Failed to load applications:", error));
  }, [user]);

  return (
    <Layout>
      <div className="page-heading">
        <p className="eyebrow">Notifications</p>
        <h1 className="page-title">Job notices</h1>
        <p className="page-subtitle">Opportunities shared with your student circle.</p>
      </div>
      {user && <JobNoticeFeed uid={user.uid} applications={applications} />}
    </Layout>
  );
}

export default Notifications;
