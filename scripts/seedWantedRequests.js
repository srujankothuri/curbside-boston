// Seeds the wantedRequests collection with realistic sample requests.
// Run with: npm run seed:wanted
// Removes previously seeded requests first, but keeps real posts.
import { randomUUID } from "node:crypto";
import { getDb, closeDb } from "../backend/db/connection.js";
import { NEIGHBORHOODS } from "../public/js/shared/lists.js";

const COUNT = 1100;
const DAYS_BACK = 21;

const TITLES = {
  Furniture: [
    "Bed frame, full or queen",
    "Bookshelf",
    "Desk for a small room",
    "Dining table and chairs",
    "Couch or loveseat",
    "Dresser",
    "Desk chair",
    "Nightstand",
    "Coffee table",
  ],
  "Kitchen and dining": [
    "Pots and pans",
    "Plates and bowls",
    "Kitchen knives",
    "Mugs and glasses",
    "Baking dishes",
  ],
  "Electronics and appliances": [
    "Microwave",
    "Desk lamp",
    "Mini fridge",
    "Electric kettle",
    "Fan for summer",
    "Toaster",
  ],
  "Home decor": [
    "Floor lamp",
    "Rug for a bedroom",
    "Mirror",
    "Curtains",
    "Coat rack",
  ],
  "Books and media": [
    "Intro programming textbooks",
    "Board games",
    "Novels for a book club",
    "Cookbooks",
  ],
  "Sports and outdoors": [
    "Bike lock",
    "Used bike",
    "Yoga mat",
    "Snow shovel",
    "Winter boots",
  ],
  Other: [
    "Moving boxes",
    "Laundry basket",
    "Storage bins",
    "Hangers",
    "Shower curtain",
  ],
};

const DETAILS = [
  "No car, so close to the T is best.",
  "Starting from zero in a new apartment.",
  "Can pick up any evening this week.",
  "Anything sturdy works, any size.",
  "Happy to help carry it down the stairs.",
  "Moving in on the first of the month.",
  "For a shared apartment with three roommates.",
  "Small dents or scratches are fine.",
];

const FIRST_NAMES = [
  "rohan",
  "ananya",
  "meera",
  "sam",
  "li",
  "maya",
  "arjun",
  "priya",
  "daniel",
  "sofia",
  "kevin",
  "aisha",
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Picks 1 to 3 different neighborhoods
function randomNeighborhoods() {
  const count = 1 + Math.floor(Math.random() * 3);
  const chosen = new Set();
  while (chosen.size < count) chosen.add(pick(NEIGHBORHOODS));
  return [...chosen];
}

// Fake contacts only: example.com emails and 555-01xx phone numbers
function randomContact() {
  if (Math.random() < 0.75) {
    return `${pick(FIRST_NAMES)}${Math.floor(Math.random() * 90) + 10}@example.com`;
  }
  const suffix = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return `617-555-01${suffix}`;
}

function randomCreatedAt() {
  const ageMs = Math.random() ** 2 * DAYS_BACK * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ageMs);
}

function makeRequest() {
  const category = pick(Object.keys(TITLES));
  const createdAt = randomCreatedAt();
  const isFound = Math.random() < 0.15;
  const foundAt = isFound
    ? new Date(
        createdAt.getTime() + Math.random() * (Date.now() - createdAt.getTime())
      )
    : null;

  return {
    title: pick(TITLES[category]),
    category,
    neighborhoods: randomNeighborhoods(),
    details: Math.random() < 0.7 ? pick(DETAILS) : "",
    contact: randomContact(),
    status: isFound ? "found" : "open",
    createdAt,
    updatedAt: foundAt || createdAt,
    foundAt,
    ownerId: randomUUID(),
    seeded: true,
  };
}

async function seed() {
  const db = await getDb();
  const requests = db.collection("wantedRequests");

  const removed = await requests.deleteMany({ seeded: true });
  console.log(`Removed ${removed.deletedCount} previously seeded requests.`);

  const docs = Array.from({ length: COUNT }, makeRequest);
  const result = await requests.insertMany(docs);
  console.log(`Inserted ${result.insertedCount} wanted requests.`);

  await requests.createIndex({ status: 1, createdAt: -1 });
  console.log("Index ready.");
}

try {
  await seed();
} catch (error) {
  console.error("Seeding failed:", error);
  process.exitCode = 1;
} finally {
  await closeDb();
}
