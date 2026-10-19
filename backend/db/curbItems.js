import { ObjectId } from "mongodb";
import { getDb } from "./connection.js";

export const PAGE_SIZE = 12;

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

async function itemsCollection() {
  const db = await getDb();
  return db.collection("curbItems");
}

function toObjectId(id) {
  return OBJECT_ID_PATTERN.test(id) ? new ObjectId(id) : null;
}

export async function listItems({
  neighborhood,
  category,
  postedWithinHours,
  includeTaken,
  page,
}) {
  const filter = {};
  if (neighborhood) filter.neighborhood = neighborhood;
  if (category) filter.category = category;
  if (!includeTaken) filter.status = "available";
  if (postedWithinHours) {
    const since = new Date(Date.now() - postedWithinHours * 60 * 60 * 1000);
    filter.createdAt = { $gte: since };
  }

  const items = await itemsCollection();
  const total = await items.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const docs = await items
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((currentPage - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .toArray();

  return { items: docs, total, page: currentPage, totalPages };
}

export async function getItemById(id) {
  const _id = toObjectId(id);
  if (!_id) return null;
  const items = await itemsCollection();
  return items.findOne({ _id });
}

export async function createItem(fields, ownerId) {
  const now = new Date();
  const doc = {
    ...fields,
    status: "available",
    createdAt: now,
    updatedAt: now,
    takenAt: null,
    ownerId,
  };
  const items = await itemsCollection();
  const result = await items.insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

export async function updateItem(id, fields) {
  const items = await itemsCollection();
  return items.findOneAndUpdate(
    { _id: toObjectId(id) },
    { $set: { ...fields, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
}

export async function markTaken(id) {
  const now = new Date();
  const items = await itemsCollection();
  return items.findOneAndUpdate(
    { _id: toObjectId(id), status: "available" },
    { $set: { status: "taken", takenAt: now, updatedAt: now } },
    { returnDocument: "after" }
  );
}

export async function markAvailable(id) {
  const items = await itemsCollection();
  return items.findOneAndUpdate(
    { _id: toObjectId(id), status: "taken" },
    { $set: { status: "available", takenAt: null, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
}

export async function deleteItem(id) {
  const items = await itemsCollection();
  const result = await items.deleteOne({ _id: toObjectId(id) });
  return result.deletedCount === 1;
}
