const configuredApiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const API_URL = configuredApiUrl.replace(/\/$/, "");
