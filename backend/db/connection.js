import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "curbside";

let clientPromise = null;

export async function getDb() {
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Check your .env file.");
  }

  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }

  const client = await clientPromise;
  return client.db(dbName);
}

export async function closeDb() {
  if (clientPromise) {
    const client = await clientPromise;
    await client.close();
    clientPromise = null;
  }
}
