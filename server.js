require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let mongoClient;
let collection;

async function connectMongo() {
  if (!process.env.MONGODB_URI) {
    console.log("MONGODB_URI not set — weather history will use browser storage only.");
    return;
  }
  try {
    mongoClient = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    await mongoClient.connect();
    const db = mongoClient.db(process.env.MONGODB_DB || "weatherDB");
    collection = db.collection(process.env.MONGODB_COLLECTION || "weatherRecords");
    await collection.createIndex({ searchedAt: -1 });
    console.log("MongoDB connected.");
  } catch (err) {
    console.error("MongoDB connection unavailable; app will still run:", err.message);
    collection = null;
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", database: collection ? "connected" : "not-connected", timestamp: new Date().toISOString() });
});

app.post("/api/history", async (req, res) => {
  const { city, country, temperature, condition } = req.body || {};
  if (!city) return res.status(400).json({ error: "City is required." });
  const record = { city: String(city).slice(0, 100), country: String(country || "").slice(0, 100),
    temperature: Number.isFinite(Number(temperature)) ? Number(temperature) : null,
    condition: String(condition || "").slice(0, 100), searchedAt: new Date() };
  try {
    if (collection) await collection.insertOne(record);
    res.json({ ok: true, savedToMongo: Boolean(collection), record });
  } catch (err) {
    res.status(500).json({ error: "Could not save search history." });
  }
});

app.get("/api/history", async (_req, res) => {
  try {
    if (!collection) return res.json({ items: [], source: "unavailable" });
    const items = await collection.find({}, { projection: { _id: 0 } }).sort({ searchedAt: -1 }).limit(8).toArray();
    res.json({ items, source: "mongodb" });
  } catch {
    res.status(500).json({ error: "Could not load history." });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

connectMongo().finally(() => {
  app.listen(PORT, () => console.log(`WeatherStation running on port ${PORT}`));
});

process.on("SIGTERM", async () => {
  if (mongoClient) await mongoClient.close();
  process.exit(0);
});
