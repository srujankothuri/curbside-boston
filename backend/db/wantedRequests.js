import { ObjectId } from "mongodb";
import { getDb } from "./connection.js";

export const PAGE_SIZE = 12;

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

async function requestsCollection() {
  const db = await getDb();
  return db.collection("wantedRequests");
}

function toObjectId(id) {
  return OBJECT_ID_PATTERN.test(id) ? new ObjectId(id) : null;
}

export async function listRequests({
  category,
  neighborhood,
  includeFound,
  page,
}) {
  const filter = {};
  if (category) filter.category = category;
  // neighborhoods is an array, so this matches requests that include it
  if (neighborhood) filter.neighborhoods = neighborhood;
  if (!includeFound) filter.status = "open";

  const requests = await requestsCollection();
  const total = await requests.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const docs = await requests
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((currentPage - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .toArray();

  return { requests: docs, total, page: currentPage, totalPages };
}

export async function getRequestById(id) {
  const _id = toObjectId(id);
  if (!_id) return null;
  const requests = await requestsCollection();
  return requests.findOne({ _id });
}

export async function createRequest(fields, ownerId) {
  const now = new Date();
  const doc = {
    ...fields,
    status: "open",
    createdAt: now,
    updatedAt: now,
    foundAt: null,
    ownerId,
  };
  const requests = await requestsCollection();
  const result = await requests.insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

export async function updateRequest(id, fields) {
  const requests = await requestsCollection();
  return requests.findOneAndUpdate(
    { _id: toObjectId(id) },
    { $set: { ...fields, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
}

export async function markFound(id) {
  const now = new Date();
  const requests = await requestsCollection();
  return requests.findOneAndUpdate(
    { _id: toObjectId(id), status: "open" },
    { $set: { status: "found", foundAt: now, updatedAt: now } },
    { returnDocument: "after" }
  );
}

export async function deleteRequest(id) {
  const requests = await requestsCollection();
  const result = await requests.deleteOne({ _id: toObjectId(id) });
  return result.deletedCount === 1;
}
