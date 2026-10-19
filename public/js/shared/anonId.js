const STORAGE_KEY = "curbside-anon-id";

export function getAnonId() {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function anonHeaders() {
  return { "X-Anon-Id": getAnonId() };
}
