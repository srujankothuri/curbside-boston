import { anonHeaders } from "../shared/anonId.js";

// Every request sends the anonymous ID, so the server can tell
// which items belong to this browser.
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

function itemPath(id) {
  return `/api/items/${encodeURIComponent(id)}`;
}

export function fetchItems(searchParams) {
  return request(`/api/items?${searchParams}`);
}

export function fetchItem(id) {
  return request(itemPath(id));
}

export function createItem(fields) {
  return request("/api/items", {
    method: "POST",
    body: JSON.stringify(fields),
  });
}

export function updateItem(id, fields) {
  return request(itemPath(id), { method: "PUT", body: JSON.stringify(fields) });
}

export function markTaken(id) {
  return request(`${itemPath(id)}/taken`, { method: "PATCH" });
}

export function markAvailable(id) {
  return request(`${itemPath(id)}/available`, { method: "PATCH" });
}

export function deleteItem(id) {
  return request(itemPath(id), { method: "DELETE" });
}
