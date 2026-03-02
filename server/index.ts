import express from "express";
import { execSync } from "child_process";
import { getApprovedWordsMap, deleteApprovedWord, addWordDirect } from "./db.js";
import { authMiddleware, loginHandler, logoutHandler, statusHandler } from "./auth.js";

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// ─── Auth endpoints (public) ────────────────────────────
app.post("/api/auth/login", loginHandler);
app.post("/api/auth/logout", logoutHandler);
app.get("/api/auth/status", statusHandler);

// ─── Public: approved words (needed by tower without auth) ─
app.get("/api/words/approved", (_req, res) => {
  try {
    const words = getApprovedWordsMap();
    res.json(words);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch approved words" });
  }
});

// ─── Protected endpoints (require auth) ─────────────────
app.use("/api/words", authMiddleware);
app.use("/api/docker", authMiddleware);

// ─── Docker status ──────────────────────────────────────
app.get("/api/docker/status", (_req, res) => {
  try {
    const output = execSync(
      'docker ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}|{{.Ports}}"',
      { timeout: 5000 }
    ).toString().trim();

    const containers = output
      ? output.split("\n").map(line => {
          const [id, name, image, status, state, ports] = line.split("|");
          return { id, name, image, status, state, ports };
        })
      : [];

    res.json({ available: true, containers });
  } catch (err) {
    res.json({
      available: false,
      containers: [],
      error: "Docker not accessible",
    });
  }
});

// ─── Add words directly (offline mode) ──────────────────
app.post("/api/words/add", (req, res) => {
  const { words } = req.body;
  if (!words || typeof words !== "string" || !words.trim()) {
    return res.status(400).json({ error: "Words string is required" });
  }

  const parsed = words
    .split(/[,\s\n]+/)
    .map((w: string) => w.trim().toLowerCase())
    .filter((w: string) => w.length > 0);

  if (parsed.length === 0) {
    return res.status(400).json({ error: "No valid words found" });
  }

  const results = parsed.map((w: string) => addWordDirect(w));
  res.json({ success: true, added: results });
});

// ─── Delete approved word ───────────────────────────────
app.delete("/api/words/approved/:word", (req, res) => {
  const word = decodeURIComponent(req.params.word);
  if (!word) return res.status(400).json({ error: "Missing word" });

  const ok = deleteApprovedWord(word);
  if (ok) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Word not found" });
  }
});

// ─── Start server ───────────────────────────────────────
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
