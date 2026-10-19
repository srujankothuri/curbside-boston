const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readAnonId(req, res, next) {
  const id = req.get("X-Anon-Id");
  req.anonId = id && UUID_PATTERN.test(id) ? id : null;
  next();
}

export function requireAnonId(req, res, next) {
  if (!req.anonId) {
    return res.status(400).json({ error: "Missing or invalid anonymous ID." });
  }
  next();
}
