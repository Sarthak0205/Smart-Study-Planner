export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

async function parseJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

function buildRequest({ method, body, token }) {
  return {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include"
  };
}

function buildApiError(json, status) {
  const details = json.error?.details;
  const detailText = Array.isArray(details)
    ? details.map(detail => `${detail.path}: ${detail.message}`).join("; ")
    : "";
  const error = new Error(detailText || json.error?.message || "Request failed");
  error.code = json.error?.code;
  error.status = status;
  error.details = details;
  return error;
}

async function refreshAccessToken() {
  const response = await fetch(`${API_BASE}/auth/refresh`, buildRequest({ method: "POST" }));
  const json = await parseJson(response);

  if (!response.ok) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("studyflow:session-expired"));
    }
    throw buildApiError(json, response.status);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("studyflow:session-refreshed", { detail: json.data }));
  }
  return json.data?.accessToken;
}

export async function api(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...buildRequest({ method, body, token })
  });
  const json = await parseJson(response);

  if (response.status === 401 && json.error?.code === "EXPIRED_TOKEN" && path !== "/auth/refresh") {
    const refreshedToken = await refreshAccessToken();
    const retryResponse = await fetch(`${API_BASE}${path}`, {
      ...buildRequest({ method, body, token: refreshedToken })
    });
    const retryJson = await parseJson(retryResponse);

    if (!retryResponse.ok) {
      throw buildApiError(retryJson, retryResponse.status);
    }

    return retryJson.data;
  }

  if (!response.ok) {
    throw buildApiError(json, response.status);
  }
  return json.data;
}
