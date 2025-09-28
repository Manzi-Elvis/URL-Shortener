import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { join } from "path";
import { fileURLToPath } from "url";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { nanoid } from "nanoid";
import validUrl from "valid-url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const SHORT_ID_LENGTH = parseInt(process.env.SHORT_ID_LENGTH || "7", 10);

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));
app.use(express.static(join(__dirname, "public")));

const dbFile = join(__dirname, "db.json");
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, JSON.stringify({ urls: [] }, null, 2));
}
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

await db.read();
db.data = db.data || { urls: [] };

function findUrl(code) {
  return db.data.urls.find((r) => r.code === code);
}

app.post("/api/shorten", async (req, res) => {
  const { url, customCode, expireAt } = req.body || {};
  if (!url || !validUrl.isWebUri(url)) {
    return res.status(400).json({ error: "Invalid URL. Include protocol (http/https)." });
  }

  let code = customCode ? String(customCode).trim() : null;
  if (code) {
    if (!/^[A-Za-z0-9-_]{3,30}$/.test(code)) {
      return res.status(400).json({ error: "customCode must be 3-30 chars [A-Za-z0-9-_]" });
    }
    if (findUrl(code)) {
      return res.status(409).json({ error: "customCode already in use" });
    }
  } else {
    do {
      code = nanoid(SHORT_ID_LENGTH);
    } while (findUrl(code));
  }

  const now = new Date().toISOString();
  const expires = expireAt ? new Date(expireAt).toISOString() : null;

  const record = {
    id: nanoid(),
    code,
    originalUrl: url,
    createdAt: now,
    expireAt: expires,
    clicks: 0,
    clicksByDay: {},
    referrers: {},
    userAgents: {},
    clicksLog: [] 
  };

  db.data.urls.push(record);
  await db.write();
  return res.status(201).json({
    shortUrl: `${BASE_URL}/${code}`,
    code,
    originalUrl: url,
    createdAt: now,
    expireAt: expires
  });
});
app.get("/:code", async (req, res) => {
  await db.read();
  const { code } = req.params;
  const record = findUrl(code);
  if (!record) return res.status(404).send("Not found");
  const now = new Date();
  if (record.expireAt && new Date(record.expireAt) < now) {
    return res.status(410).send("This short link has expired.");
  }
  const ref = req.get("Referer") || req.get("Referrer") || "direct";
  const ua = req.get("User-Agent") || "unknown";
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  record.clicks = (record.clicks || 0) + 1;
  const day = now.toISOString().slice(0, 10);
  record.clicksByDay[day] = (record.clicksByDay[day] || 0) + 1;
  record.referrers[ref] = (record.referrers[ref] || 0) + 1;
  record.userAgents[ua] = (record.userAgents[ua] || 0) + 1;
  record.clicksLog.unshift({ ts: now.toISOString(), ref, ua, ip }); // newest first
  if (record.clicksLog.length > 200) record.clicksLog.length = 200;
  await db.write();
  return res.redirect(302, record.originalUrl);
});
app.get("/api/stats/:code", async (req, res) => {
  await db.read();
  const record = findUrl(req.params.code);
  if (!record) return res.status(404).json({ error: "not found" });
  const summary = {
    code: record.code,
    originalUrl: record.originalUrl,
    createdAt: record.createdAt,
    expireAt: record.expireAt,
    clicks: record.clicks || 0,
    clicksByDay: record.clicksByDay || {},
    referrers: record.referrers || {},
    userAgents: Object.entries(record.userAgents || {}).slice(0, 20).map(([ua, count]) => ({ ua, count })),
    lastClicks: (record.clicksLog || []).slice(0, 50)
  };

  res.json(summary);
});
app.get("/api/list", async (req, res) => {
  await db.read();
  const rows = (db.data.urls || []).map(r => ({
    code: r.code,
    shortUrl: `${BASE_URL}/${r.code}`,
    originalUrl: r.originalUrl,
    clicks: r.clicks || 0,
    createdAt: r.createdAt
  }));
  res.json(rows);
});
app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get("/", (req, res) => res.sendFile(join(__dirname, "public", "index.html")));
app.listen(PORT, () => {
  console.log(`URL shortener listening on ${PORT} — base ${BASE_URL}`);
});
