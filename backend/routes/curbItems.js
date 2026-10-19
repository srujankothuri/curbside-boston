import { Router } from "express";
import {
  CATEGORIES,
  CONDITIONS,
  NEIGHBORHOODS,
} from "../../public/js/shared/lists.js";
import { requireAnonId } from "../middleware/anonId.js";
import {
  PAGE_SIZE,
  listItems,
  getItemById,
  createItem,
  updateItem,
  markTaken,
  markAvailable,
  deleteItem,
} from "../db/curbItems.js";

const router = Router();

const POSTED_BY = ["owner", "spotter"];
const POSTED_WITHIN_HOURS = { "24h": 24, "3d": 72, "7d": 168 };
const MAX_LENGTH = { title: 60, street: 80, description: 300 };

// Never send ownerId to the browser. Send a true/false "isOwner" instead.
function toPublicItem(item, anonId) {
  const { ownerId, ...rest } = item;
  return { ...rest, isOwner: Boolean(anonId) && ownerId === anonId };
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateItem(body) {
  const fields = {
    title: cleanText(body.title),
    category: cleanText(body.category),
    condition: cleanText(body.condition),
    neighborhood: cleanText(body.neighborhood),
    street: cleanText(body.street),
    description: cleanText(body.description),
    postedBy: cleanText(body.postedBy),
  };
  const errors = {};

  if (!POSTED_BY.includes(fields.postedBy)) {
    errors.postedBy = "Choose who's posting.";
  }
  if (!fields.title) {
    errors.title = "Enter a title.";
  } else if (fields.title.length > MAX_LENGTH.title) {
    errors.title = `Keep the title to ${MAX_LENGTH.title} characters or fewer.`;
  }
  if (!CATEGORIES.includes(fields.category)) {
    errors.category = "Choose a category.";
  }
  if (!CONDITIONS.includes(fields.condition)) {
    errors.condition = "Choose a condition.";
  }
  if (!NEIGHBORHOODS.includes(fields.neighborhood)) {
    errors.neighborhood = "Choose a neighborhood.";
  }
  if (!fields.street) {
    errors.street = "Enter a street or cross street.";
  } else if (fields.street.length > MAX_LENGTH.street) {
    errors.street = `Keep the location to ${MAX_LENGTH.street} characters or fewer.`;
  }
  if (fields.description.length > MAX_LENGTH.description) {
    errors.description = `Keep the description to ${MAX_LENGTH.description} characters or fewer.`;
  }

  return { fields, errors };
}

// Loads the item and checks that the requester posted it.
// Sends the error response itself and returns null if not allowed.
async function loadOwnItem(req, res) {
  const item = await getItemById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "This item no longer exists." });
    return null;
  }
  if (item.ownerId !== req.anonId) {
    res.status(403).json({ error: "You can only change your own posts." });
    return null;
  }
  return item;
}

// Read: list items with filters and pagination
router.get("/", async (req, res) => {
  const { neighborhood, category, posted, taken, page } = req.query;

  const result = await listItems({
    neighborhood: NEIGHBORHOODS.includes(neighborhood) ? neighborhood : null,
    category: CATEGORIES.includes(category) ? category : null,
    postedWithinHours: POSTED_WITHIN_HOURS[posted] || null,
    includeTaken: taken === "1",
    page: Number.parseInt(page, 10) || 1,
  });

  res.json({
    items: result.items.map((item) => toPublicItem(item, req.anonId)),
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    pageSize: PAGE_SIZE,
  });
});

// Read: one item (used by the edit form)
router.get("/:id", async (req, res) => {
  const item = await getItemById(req.params.id);
  if (!item) {
    return res.status(404).json({ error: "This item no longer exists." });
  }
  res.json(toPublicItem(item, req.anonId));
});

// Create
router.post("/", requireAnonId, async (req, res) => {
  const { fields, errors } = validateItem(req.body || {});
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }
  const item = await createItem(fields, req.anonId);
  res.status(201).json(toPublicItem(item, req.anonId));
});

// Update: edit your own post
router.put("/:id", requireAnonId, async (req, res) => {
  const existing = await loadOwnItem(req, res);
  if (!existing) return;

  const { fields, errors } = validateItem(req.body || {});
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }
  const item = await updateItem(req.params.id, fields);
  res.json(toPublicItem(item, req.anonId));
});

// Update: anyone can mark an item as taken
router.patch("/:id/taken", async (req, res) => {
  const item = await markTaken(req.params.id);
  if (item) {
    return res.json(toPublicItem(item, req.anonId));
  }
  const exists = await getItemById(req.params.id);
  if (!exists) {
    return res.status(404).json({ error: "This item no longer exists." });
  }
  res.status(409).json({ error: "Someone already marked this as taken." });
});

// Update: the poster can switch a taken item back to available
router.patch("/:id/available", requireAnonId, async (req, res) => {
  const existing = await loadOwnItem(req, res);
  if (!existing) return;

  const item = await markAvailable(req.params.id);
  if (!item) {
    return res.status(409).json({ error: "This item is already available." });
  }
  res.json(toPublicItem(item, req.anonId));
});

// Delete your own post
router.delete("/:id", requireAnonId, async (req, res) => {
  const existing = await loadOwnItem(req, res);
  if (!existing) return;

  await deleteItem(req.params.id);
  res.status(204).end();
});

export default router;
