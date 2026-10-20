import express from "express";
import { getDb } from "./backend/db/connection.js";
import { readAnonId } from "./backend/middleware/anonId.js";
import curbItemsRouter from "./backend/routes/curbItems.js";
import wantedRequestsRouter from "./backend/routes/wantedRequests.js";

const app = express();

app.use(express.json());
app.use(express.static("public"));
// On Vercel, "/" reaches Express instead of being served as a static file,
// so send visitors to the Home page directly.
app.get("/", (req, res) => {
  res.redirect("/index.html");
});
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

app.use("/api/items", curbItemsRouter);
app.use("/api/requests", wantedRequestsRouter);

// Unknown API routes get a JSON 404 instead of an HTML page
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found." });
});

// Any error thrown in a route ends up here
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error(error);
  const status = error.status >= 400 && error.status < 500 ? error.status : 500;
  res.status(status).json({
    error:
      status === 500
        ? "Something went wrong on our side. Try again."
        : "That request couldn't be processed.",
  });
});

const PORT = process.env.PORT || 3000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

export default app;
