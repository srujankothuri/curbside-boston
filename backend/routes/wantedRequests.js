import { Router } from "express";
import { CATEGORIES, NEIGHBORHOODS } from "../../public/js/shared/lists.js";
import { requireAnonId } from "../middleware/anonId.js";
import {
  PAGE_SIZE,
  listRequests,
  getRequestById,
  createRequest,
  updateRequest,
  markFound,
  deleteRequest,
} from "../db/wantedRequests.js";

const router = Router();

const MAX_LENGTH = { title: 60, details: 300, contact: 100 };

// Never send ownerId to the browser. Send a true/false "isOwner" instead.
function toPublicRequest(request, anonId) {
  const { ownerId, ...rest } = request;
  return { ...rest, isOwner: Boolean(anonId) && ownerId === anonId };
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateRequest(body) {
  const neighborhoods = Array.isArray(body.neighborhoods)
    ? [...new Set(body.neighborhoods.map(cleanText))]
    : [];
  const fields = {
    title: cleanText(body.title),
    category: cleanText(body.category),
    neighborhoods,
    details: cleanText(body.details),
    contact: cleanText(body.contact),
  };
  const errors = {};

  if (!fields.title) {
    errors.title = "Enter what you need.";
  } else if (fields.title.length > MAX_LENGTH.title) {
    errors.title = `Keep this to ${MAX_LENGTH.title} characters or fewer.`;
  }
  if (!CATEGORIES.includes(fields.category)) {
    errors.category = "Choose a category.";
  }
  if (
    neighborhoods.length === 0 ||
    !neighborhoods.every((name) => NEIGHBORHOODS.includes(name))
  ) {
    errors.neighborhoods = "Choose at least one neighborhood.";
  }
  if (fields.details.length > MAX_LENGTH.details) {
    errors.details = `Keep the details to ${MAX_LENGTH.details} characters or fewer.`;
  }
  if (!fields.contact) {
    errors.contact = "Enter an email or phone number.";
  } else if (fields.contact.length > MAX_LENGTH.contact) {
    errors.contact = `Keep this to ${MAX_LENGTH.contact} characters or fewer.`;
  }

  return { fields, errors };
}

// Loads the request and checks that the requester posted it.
// Sends the error response itself and returns null if not allowed.
async function loadOwnRequest(req, res) {
  const request = await getRequestById(req.params.id);
  if (!request) {
    res.status(404).json({ error: "This request no longer exists." });
    return null;
  }
  if (request.ownerId !== req.anonId) {
    res.status(403).json({ error: "You can only change your own requests." });
    return null;
  }
  return request;
}

// Read: list requests with filters and pagination
router.get("/", async (req, res) => {
  const { category, neighborhood, found, page } = req.query;

  const result = await listRequests({
    category: CATEGORIES.includes(category) ? category : null,
    neighborhood: NEIGHBORHOODS.includes(neighborhood) ? neighborhood : null,
    includeFound: found === "1",
    page: Number.parseInt(page, 10) || 1,
  });

  res.json({
    requests: result.requests.map((request) =>
      toPublicRequest(request, req.anonId)
    ),
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    pageSize: PAGE_SIZE,
  });
});

// Read: one request (used by the edit form)
router.get("/:id", async (req, res) => {
  const request = await getRequestById(req.params.id);
  if (!request) {
    return res.status(404).json({ error: "This request no longer exists." });
  }
  res.json(toPublicRequest(request, req.anonId));
});

// Create
router.post("/", requireAnonId, async (req, res) => {
  const { fields, errors } = validateRequest(req.body || {});
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }
  const request = await createRequest(fields, req.anonId);
  res.status(201).json(toPublicRequest(request, req.anonId));
});

// Update: edit your own request
router.put("/:id", requireAnonId, async (req, res) => {
  const existing = await loadOwnRequest(req, res);
  if (!existing) return;

  const { fields, errors } = validateRequest(req.body || {});
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }
  const request = await updateRequest(req.params.id, fields);
  res.json(toPublicRequest(request, req.anonId));
});

// Update: mark your own request as found
router.patch("/:id/found", requireAnonId, async (req, res) => {
  const existing = await loadOwnRequest(req, res);
  if (!existing) return;

  const request = await markFound(req.params.id);
  if (!request) {
    return res
      .status(409)
      .json({ error: "This request is already marked as found." });
  }
  res.json(toPublicRequest(request, req.anonId));
});

// Delete your own request
router.delete("/:id", requireAnonId, async (req, res) => {
  const existing = await loadOwnRequest(req, res);
  if (!existing) return;

  await deleteRequest(req.params.id);
  res.status(204).end();
});

export default router;
