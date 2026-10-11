import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

import { getApplications } from "../services/firestore";
import { getStudentJobNotices } from "../services/jobNotices";

function lastSeenKey(uid) {
  return `offertrail-job-notices-seen:${uid}`;
}

function timestampToMillis(timestamp) {
  return timestamp?.toMillis ? timestamp.toMillis() : 0;
}

function JobNoticeNotification({ uid }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadUnreadCount() {
      try {
        const [notices, applications] = await Promise.all([
          getStudentJobNotices(uid),
          getApplications(uid),
        ]);
        const lastSeen = Number(localStorage.getItem(lastSeenKey(uid)) || 0);
        const addedNoticeIds = new Set(
          applications.map((application) => application.jobNoticeId).filter(Boolean)
        );
        const count = notices.filter((notice) => (
          !addedNoticeIds.has(notice.id)
          && timestampToMillis(notice.createdAt) > lastSeen
        )).length;

        if (!cancelled) setUnreadCount(count);
      } catch (error) {
        console.error("Failed to load job-notice notifications:", error);
      }
    }

    loadUnreadCount();
    return () => { cancelled = true; };
  }, [uid]);

  function markNoticesSeen() {
    localStorage.setItem(lastSeenKey(uid), String(Date.now()));
    setUnreadCount(0);
  }

  return (
    <NavLink
      to="/notifications"
      className="nav-link notification-link"
      aria-label={unreadCount ? `Job notices: ${unreadCount} new` : "Job notices"}
      onClick={markNoticesSeen}
    >
      <span aria-hidden="true">🔔</span>
      <span className="sr-only">Notifications</span>
      {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </NavLink>
  );
}

export default JobNoticeNotification;
