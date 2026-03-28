import { Bot } from "grammy";
import { filterWord } from "./filter.js";
import { insertWord, upsertUser, insertMessage } from "./db.js";

let bot: Bot | null = null;
let botUsername: string | null = null;
let tokenMask: string | null = null;

export function getBot(): Bot | null {
  return bot;
}

function maskToken(token: string): string {
  if (token.length <= 12) return "***";
  return `${token.slice(0, 6)}...${token.slice(-6)}`;
}

function mountHandlers(instance: Bot) {
  instance.use((ctx, next) => {
    if (ctx.from) {
      upsertUser(
        String(ctx.from.id),
        ctx.from.username,
        ctx.from.first_name,
        ctx.from.last_name
      );
    }
    return next();
  });

  instance.command("start", (ctx) => {
    ctx.reply(
      "👋 Привет! Напиши мне любое слово, и оно появится на башне после модерации.\n\n" +
        "Правила:\n" +
        "• Одно слово за раз\n" +
        "• Только кириллица\n" +
        "• Без мата 😉\n" +
        "• До 5 слов в минуту"
    );
  });

  instance.on("message:text", (ctx) => {
    const userId = String(ctx.from.id);
    const username = ctx.from.username || ctx.from.first_name || "anon";
    const text = ctx.message.text;

    insertMessage(userId, "incoming", text);

    const result = filterWord(text, userId);
    if (!result.ok) {
      return ctx.reply(result.reason);
    }

    const inserted = insertWord(result.word, userId, username);
    if (inserted.isNew) {
      return ctx.reply(
        `✅ Спасибо! Слово «${result.word}» отправлено на модерацию.`
      );
    }
    return ctx.reply(
      `👍 Слово «${result.word}» уже на модерации (голосов: ${inserted.count}).`
    );
  });
}

function runPolling(instance: Bot) {
  const tryStart = async (retries = 0) => {
    try {
      await instance.start({ drop_pending_updates: true });
    } catch (err: any) {
      if (bot !== instance) return;

      if (err?.error_code === 409) {
        const delay = Math.min(5000 * (retries + 1), 30000);
        console.warn(`⚠️ Bot conflict (409), retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
        if (bot === instance) await tryStart(retries + 1);
        return;
      }

      console.error("❌ Bot polling stopped:", err?.message || err);
      if (bot === instance) {
        bot = null;
        botUsername = null;
        tokenMask = null;
      }
    }
  };

  void tryStart();
}

export function getBotInfo() {
  return {
    running: !!bot,
    username: botUsername,
    tokenMask,
  };
}

export async function startBot(token: string) {
  const normalized = token.trim();
  if (!normalized) {
    stopBot();
    return { ok: true as const, running: false };
  }

  const candidate = new Bot(normalized);
  let me: { username?: string };

  try {
    me = await candidate.api.getMe();
  } catch (err: any) {
    return { ok: false as const, error: err?.description || err?.message || "Invalid bot token" };
  }

  mountHandlers(candidate);
  stopBot();
  bot = candidate;
  botUsername = me.username ? `@${me.username}` : null;
  tokenMask = maskToken(normalized);
  runPolling(candidate);

  console.log(`🤖 Telegram bot started${botUsername ? ` (${botUsername})` : ""}`);
  return { ok: true as const, running: true, username: botUsername };
}

export function stopBot() {
  if (bot) {
    bot.stop();
    bot = null;
  }
  botUsername = null;
  tokenMask = null;
}
