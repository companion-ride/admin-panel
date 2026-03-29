// Auth service: https://companion.kopir.uk/api/auth
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Backend: admin-эндпоинты находятся под тем же базовым URL (/api/auth/admin/*)
const BACKEND_URL = API_BASE_URL;

// Rides service: https://companion.kopir.uk/api/rides
const RIDES_URL = API_BASE_URL.replace(/\/api\/auth\/?$/, "/api/rides");

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json();
}

// Config service: https://companion.kopir.uk/api/config
const CONFIG_URL = process.env.CONFIG_API_URL || API_BASE_URL.replace(/\/api\/auth\/?$/, "/api/config");

export { API_BASE_URL, BACKEND_URL, RIDES_URL, CONFIG_URL };
