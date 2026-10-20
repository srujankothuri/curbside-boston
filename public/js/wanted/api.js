import { anonHeaders } from "../shared/anonId.js";

// Every request sends the anonymous ID, so the server can tell
// which requests belong to this browser.
async function request(path, options = {}) {
  const headers = { ...anonHeaders() };
  if (options.body) headers["Content-Type"] = "application/json";

  const response = await fetch(path, { ...options, headers });
  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.error || "Something went wrong. Check your connection and try again."
    );
    error.status = response.status;
    error.fieldErrors = data.errors || null;
    throw error;
  }
  return data;
}

function requestPath(id) {
  return `/api/requests/${encodeURIComponent(id)}`;
}

export function fetchRequests(searchParams) {
  return request(`/api/requests?${searchParams}`);
}

export function fetchRequest(id) {
  return request(requestPath(id));
}

export function createRequest(fields) {
  return request("/api/requests", {
    method: "POST",
    body: JSON.stringify(fields),
  });
}

export function updateRequest(id, fields) {
  return request(requestPath(id), {
    method: "PUT",
    body: JSON.stringify(fields),
  });
}

export function markFound(id) {
  return request(`${requestPath(id)}/found`, { method: "PATCH" });
}

export function deleteRequest(id) {
  return request(requestPath(id), { method: "DELETE" });
}
