const API_URL = "http://localhost:8000";

export async function getGmailMessages() {
  const response = await fetch(`${API_URL}/gmail/messages`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new Error(
      error.detail || "Failed to fetch Gmail messages."
    );
  }

  return await response.json();
}