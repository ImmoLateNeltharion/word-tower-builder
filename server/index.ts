import express from "express";
import { execSync } from "child_process";
import { getPendingWords, approveWord, rejectWord, getApprovedWordsMap, deleteApprovedWord } from "./db.js";
import { startBot } from "./bot.js";
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

// ─── Moderation endpoints ───────────────────────────────
app.get("/api/words/pending", (_req, res) => {
  try {
    const words = getPendingWords();
    res.json(words);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pending words" });
  }
});

app.post("/api/words/:id/approve", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const ok = approveWord(id);
  if (ok) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Word not found or already moderated" });
  }
});

app.post("/api/words/:id/reject", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const ok = rejectWord(id);
  if (ok) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Word not found or already moderated" });
  }
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
  console.log(`Docker status API running on http://localhost:${PORT}`);
});

// ─── Start Telegram bot (if token provided) ─────────────
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (BOT_TOKEN) {
  startBot(BOT_TOKEN);
} else {
  console.log("⚠️  TELEGRAM_BOT_TOKEN not set — bot disabled");
}
