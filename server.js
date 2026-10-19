import express from "express";
import { getDb } from "./backend/db/connection.js";
import { readAnonId } from "./backend/middleware/anonId.js";

const app = express();

app.use(express.json());
app.use(express.static("public"));
app.use("/api", readAnonId);

app.get("/api/health", async (req, res) => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({ status: "error", database: "not connected" });
  }
});

const PORT = process.env.PORT || 3000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

export default app;
