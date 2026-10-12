import { API_URL } from "./api";

async function authenticatedRequest(user, path, options = {}) {
  if (!user) {
    throw new Error("Please sign in first.");
  }

  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new Error(
      error.detail || "Failed to fetch Gmail messages."
    );
  }

  return response.json();
}

export function getGmailMessages(user, pageToken = null) {
  const query = pageToken
    ? `?page_token=${encodeURIComponent(pageToken)}`
    : "";

  return authenticatedRequest(user, `/gmail/messages${query}`);
}

export function startGmailConnection(user) {
  return authenticatedRequest(user, "/gmail/connect", { method: "POST" });
}
