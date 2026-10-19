// Seeds the curbItems collection with realistic sample items.
// Run with: npm run seed:curb
// Removes previously seeded items first, but keeps real posts.
import { randomUUID } from "node:crypto";
import { getDb, closeDb } from "../backend/db/connection.js";

const COUNT = 1200;
const DAYS_BACK = 14;

const TITLES = {
  Furniture: [
    "Wooden bookshelf, 5 shelves",
    "IKEA desk with drawer",
    "Three dining chairs",
    "Gray fabric couch",
    "Small coffee table",
    "Full size bed frame",
    "Dresser with four drawers",
    "Office chair, adjustable",
    "Nightstand",
    "TV stand",
    "Shoe rack",
    "Folding table",
    "Kitchen table, seats four",
    "Futon with mattress",
  ],
  "Kitchen and dining": [
    "Box of plates and bowls",
    "Set of pots and pans",
    "Glass storage jars",
    "Dish drying rack",
    "Mixing bowls",
    "Wine glasses, set of six",
    "Cutlery and utensils",
    "Baking trays",
  ],
  "Electronics and appliances": [
    "Microwave, works fine",
    "Desk lamp",
    "Mini fridge",
    "Toaster",
    "Electric kettle",
    "Box fan",
    "Space heater",
    "24 inch monitor",
    "Vacuum cleaner",
    "Window air conditioner",
  ],
  "Home decor": [
    "Floor lamp",
    "Framed posters",
    "Area rug, 5 by 7",
    "Full length mirror",
    "Curtains with rod",
    "Potted plant",
    "Wall clock",
    "Throw pillows",
  ],
  "Books and media": [
    "Box of paperback novels",
    "Intro textbooks",
    "DVD collection",
    "Board games",
    "Cookbooks",
    "Vinyl records",
  ],
  "Sports and outdoors": [
    "Bike, needs a tune-up",
    "Yoga mat",
    "Pair of dumbbells",
    "Camping chairs",
    "Snow shovel",
    "Tennis racket",
  ],
  Other: [
    "Flattened moving boxes",
    "Laundry basket",
    "Plastic storage bins",
    "Bag of hangers",
    "Suitcase",
    "Plastic drawer unit",
  ],
};

const STREETS = {
  Allston: [
    "Brighton Ave near Harvard Ave",
    "Commonwealth Ave near Packards Corner",
    "Gardner St near Linden St",
  ],
  "Back Bay": [
    "Marlborough St near Dartmouth St",
    "Beacon St near Clarendon St",
  ],
  "Bay Village": ["Melrose St near Church St"],
  "Beacon Hill": ["Pinckney St near Anderson St", "Revere St near Grove St"],
  Brighton: [
    "Chestnut Hill Ave near Market St",
    "Washington St near Oak Square",
  ],
  Charlestown: ["Bunker Hill St near Elm St", "Main St near City Square"],
  Chinatown: ["Hudson St near Kneeland St"],
  Dorchester: [
    "Dorchester Ave near Savin Hill Ave",
    "Adams St near Neponset Ave",
  ],
  Downtown: ["Tremont St near Boylston St"],
  "East Boston": [
    "Meridian St near Maverick Square",
    "Bennington St near Day Square",
  ],
  Fenway: ["Peterborough St near Jersey St", "Queensberry St near Park Dr"],
  "Hyde Park": ["River St near Hyde Park Ave"],
  "Jamaica Plain": ["Centre St near Green St", "South St near Custer St"],
  Longwood: ["Longwood Ave near Brookline Ave"],
  Mattapan: ["Blue Hill Ave near Morton St"],
  "Mission Hill": [
    "Tremont St near Huntington Ave",
    "Parker Hill Ave near Hillside St",
    "Calumet St near St Alphonsus St",
  ],
  "North End": ["Salem St near Prince St"],
  Roslindale: ["Belgrade Ave near Roslindale Square"],
  Roxbury: ["Warren St near Nubian Square"],
  "South Boston": ["East Broadway near L St", "West 4th St near E St"],
  "South End": [
    "Columbus Ave near Massachusetts Ave",
    "Shawmut Ave near Union Park",
  ],
  "West End": ["Blossom St near Cambridge St"],
  "West Roxbury": ["Centre St near LaGrange St"],
  Brookline: [
    "Harvard St near Coolidge Corner",
    "Beacon St near Washington Square",
  ],
  Cambridge: [
    "Pearl St near Massachusetts Ave",
    "Prospect St near Harvard St",
    "Inman St near Cambridge St",
  ],
};

// Student-heavy neighborhoods appear more often, like real move-out season
const BUSY_NEIGHBORHOODS = [
  "Allston",
  "Brighton",
  "Mission Hill",
  "Fenway",
  "Cambridge",
  "Jamaica Plain",
  "Brookline",
  "South End",
];

const CONDITIONS = ["Like new", "Good", "Good", "Fair", "Fair", "Needs repair"];

const DESCRIPTIONS = [
  "Heavy, needs two people.",
  "Still in good shape.",
  "Small scratch on top, otherwise fine.",
  "Next to the recycling bins.",
  "Out until Sunday night.",
  "Missing one screw, easy fix.",
  "Clean, from a smoke-free home.",
  "Wobbles a little.",
  "Left by the front steps.",
  "Free to whoever wants it.",
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomNeighborhood() {
  const all = Object.keys(STREETS);
  return Math.random() < 0.6 ? pick(BUSY_NEIGHBORHOODS) : pick(all);
}

// Skews toward recent dates, so the first pages look fresh
function randomCreatedAt() {
  const ageMs = Math.random() ** 2 * DAYS_BACK * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ageMs);
}

function makeItem() {
  const category = pick(Object.keys(TITLES));
  const neighborhood = randomNeighborhood();
  const createdAt = randomCreatedAt();
  const isTaken = Math.random() < 0.2;
  const takenAt = isTaken
    ? new Date(
        createdAt.getTime() + Math.random() * (Date.now() - createdAt.getTime())
      )
    : null;

  return {
    title: pick(TITLES[category]),
    category,
    condition: pick(CONDITIONS),
    neighborhood,
    street: pick(STREETS[neighborhood]),
    description: Math.random() < 0.6 ? pick(DESCRIPTIONS) : "",
    postedBy: Math.random() < 0.7 ? "owner" : "spotter",
    status: isTaken ? "taken" : "available",
    createdAt,
    updatedAt: takenAt || createdAt,
    takenAt,
    ownerId: randomUUID(),
    seeded: true,
  };
}

async function seed() {
  const db = await getDb();
  const items = db.collection("curbItems");

  const removed = await items.deleteMany({ seeded: true });
  console.log(`Removed ${removed.deletedCount} previously seeded items.`);

  const docs = Array.from({ length: COUNT }, makeItem);
  const result = await items.insertMany(docs);
  console.log(`Inserted ${result.insertedCount} curb items.`);

  await items.createIndex({ status: 1, createdAt: -1 });
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
