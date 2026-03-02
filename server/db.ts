import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "wordtower.db");

let _db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.exec(`
      CREATE TABLE IF NOT EXISTS words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 1,
        source TEXT NOT NULL DEFAULT 'telegram',
        telegram_user_id TEXT,
        telegram_username TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        moderated_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_words_status ON words(status);
      CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
    `);
  }
  return _db;
}

export function insertWord(
  word: string,
  telegramUserId?: string,
  telegramUsername?: string
) {
  const db = getDB();
  // If same word is already pending, just increment its count
  const existing = db
    .prepare("SELECT id, count FROM words WHERE word = ? AND status = 'pending'")
    .get(word) as { id: number; count: number } | undefined;

  if (existing) {
    db.prepare("UPDATE words SET count = count + 1 WHERE id = ?").run(existing.id);
    return { id: existing.id, word, count: existing.count + 1, isNew: false };
  }

  const result = db
    .prepare(
      "INSERT INTO words (word, source, telegram_user_id, telegram_username) VALUES (?, 'telegram', ?, ?)"
    )
    .run(word, telegramUserId || null, telegramUsername || null);

  return { id: result.lastInsertRowid, word, count: 1, isNew: true };
}

export function getPendingWords() {
  const db = getDB();
  return db
    .prepare(
      "SELECT id, word, count, telegram_username, telegram_user_id, created_at FROM words WHERE status = 'pending' ORDER BY created_at DESC"
    )
    .all();
}

export function approveWord(id: number): boolean {
  const db = getDB();
  const result = db
    .prepare(
      "UPDATE words SET status = 'approved', moderated_at = datetime('now') WHERE id = ? AND status = 'pending'"
    )
    .run(id);
  return result.changes > 0;
}

export function rejectWord(id: number): boolean {
  const db = getDB();
  const result = db
    .prepare(
      "UPDATE words SET status = 'rejected', moderated_at = datetime('now') WHERE id = ? AND status = 'pending'"
    )
    .run(id);
  return result.changes > 0;
}

export function deleteApprovedWord(word: string): boolean {
  const db = getDB();
  const result = db
    .prepare("DELETE FROM words WHERE word = ? AND status = 'approved'")
    .run(word);
  return result.changes > 0;
}

export function getApprovedWordsMap(): Record<string, number> {
  const db = getDB();
  const rows = db
    .prepare(
      "SELECT word, SUM(count) as total FROM words WHERE status = 'approved' GROUP BY word"
    )
    .all() as { word: string; total: number }[];

  const map: Record<string, number> = {};
  for (const row of rows) {
    map[row.word] = row.total;
  }
  return map;
}
