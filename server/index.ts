import express from "express";
import { execSync } from "child_process";
import { getPendingWords, approveWord, rejectWord, getApprovedWordsMap, deleteApprovedWord, getUsers, getMessages, insertMessage, getAllUserIds, getSetting, setSetting } from "./db.js";
import { startBot, getBot, getBotInfo, stopBot } from "./bot.js";
import { authMiddleware, loginHandler, logoutHandler, statusHandler } from "./auth.js";

const app = express();
const PORT = process.env.PORT || 3002;
const BOT_LINK_KEY = "bot_link";
const BOT_TOKEN_KEY = "telegram_bot_token";
const BOT_LINK_FALLBACK = "https://t.me/YourBotUsername";

app.use(express.json());

function maskToken(token: string): string {
  if (token.length <= 12) return "***";
  return `${token.slice(0, 6)}...${token.slice(-6)}`;
}

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

app.get("/api/settings/public", (_req, res) => {
  const botLink = getSetting(BOT_LINK_KEY) || BOT_LINK_FALLBACK;
  res.json({ botLink });
});

// ─── Protected endpoints (require auth) ─────────────────
app.use("/api/words", authMiddleware);
app.use("/api/docker", authMiddleware);
app.use("/api/messages", authMiddleware);
app.use("/api/settings", authMiddleware);

app.get("/api/settings", (_req, res) => {
  const savedToken = getSetting(BOT_TOKEN_KEY) || "";
  const envToken = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const effectiveToken = (savedToken || envToken).trim();
  const info = getBotInfo();

  res.json({
    botLink: getSetting(BOT_LINK_KEY) || BOT_LINK_FALLBACK,
    hasBotToken: !!effectiveToken,
    botTokenMasked: effectiveToken ? maskToken(effectiveToken) : "",
    tokenSource: savedToken ? "database" : envToken ? "env" : null,
    botRunning: info.running,
    botUsername: info.username,
  });
});

app.post("/api/settings/bot-link", (req, res) => {
  const botLink = String(req.body?.botLink || "").trim();
  if (!botLink) return res.status(400).json({ error: "botLink is required" });
  if (botLink.length > 500) return res.status(400).json({ error: "botLink is too long" });

  setSetting(BOT_LINK_KEY, botLink);
  res.json({ success: true, botLink });
});

app.post("/api/settings/bot-token", async (req, res) => {
  const token = String(req.body?.token || "").trim();

  if (!token) {
    setSetting(BOT_TOKEN_KEY, null);
    stopBot();
    return res.json({ success: true, botRunning: false, disabled: true });
  }

  const started = await startBot(token);
  if (!started.ok) {
    return res.status(400).json({ error: started.error || "Failed to start bot with this token" });
  }

  setSetting(BOT_TOKEN_KEY, token);
  return res.json({
    success: true,
    botRunning: true,
    botUsername: started.username || null,
    botTokenMasked: maskToken(token),
  });
});

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

// ─── Messaging endpoints ─────────────────────────────────

app.get("/api/messages/users", (_req, res) => {
  try {
    res.json(getUsers());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/api/messages/:userId", (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    res.json(getMessages(req.params.userId, limit, offset));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post("/api/messages/:userId/send", async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Message text is required" });

  const botInstance = getBot();
  if (!botInstance) return res.status(503).json({ error: "Bot is not running" });

  try {
    await botInstance.api.sendMessage(Number(req.params.userId), text.trim());
    insertMessage(req.params.userId, "outgoing", text.trim());
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to send message" });
  }
});

app.post("/api/messages/broadcast", async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Message text is required" });

  const botInstance = getBot();
  if (!botInstance) return res.status(503).json({ error: "Bot is not running" });

  const userIds = getAllUserIds();
  let sent = 0, failed = 0;

  for (const userId of userIds) {
    try {
      await botInstance.api.sendMessage(Number(userId), text.trim());
      insertMessage(userId, "outgoing", text.trim());
      sent++;
    } catch (err: any) {
      console.error(`Broadcast to ${userId} failed:`, err.message || err);
      failed++;
    }
  }

  res.json({ success: true, sent, failed, total: userIds.length });
});

// ─── Start server ───────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Docker status API running on http://localhost:${PORT}`);
});

// ─── Start Telegram bot (if token provided) ─────────────
const BOT_TOKEN = (getSetting(BOT_TOKEN_KEY) || process.env.TELEGRAM_BOT_TOKEN || "").trim();
if (BOT_TOKEN) {
  void startBot(BOT_TOKEN).then((result) => {
    if (!result.ok) {
      console.error("❌ Failed to start Telegram bot:", result.error);
    }
  });
} else {
  console.log("⚠️  TELEGRAM_BOT_TOKEN not set — bot disabled");
}
