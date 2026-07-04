// web/lib/personalization-db.ts
// I/O layer for personalization: table guards + jar reads/writes + click log.
// All SQL for the three per-user tables lives here. The math lives in
// ./personalization (pure). Imports are relative so tsx check scripts work.

import { turso } from "./turso";
import { isCategory } from "./categories";
import {
  applyClick,
  seedJars,
  CLICK_DEDUPE_HOURS,
  CLICK_POINTS,
  CLICK_RETENTION_DAYS,
  DEFAULT_WEIGHT,
  type Jar,
} from "./personalization";

// Idempotent runtime schema guard (repo convention — there is no migrations
// tooling; see ensureAdminChoiceColumn in api/featured-slots/route.ts).
let ensured = false;
export async function ensurePersonalizationTables(): Promise<void> {
  if (ensured) return;
  await turso.batch(
    [
      `CREATE TABLE IF NOT EXISTS user_category_prefs (
        user_id    TEXT NOT NULL,
        category   TEXT NOT NULL,
        picked     INTEGER NOT NULL DEFAULT 0,
        weight     REAL NOT NULL DEFAULT 1.0,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, category)
      )`,
      `CREATE TABLE IF NOT EXISTS user_clicks (
        user_id    TEXT NOT NULL,
        post_id    INTEGER NOT NULL,
        category   TEXT NOT NULL,
        clicked_at TEXT NOT NULL,
        PRIMARY KEY (user_id, post_id, clicked_at)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_user_clicks_user_time
        ON user_clicks (user_id, clicked_at)`,
      `CREATE TABLE IF NOT EXISTS user_saved_posts (
        user_id  TEXT NOT NULL,
        post_id  INTEGER NOT NULL,
        saved_at TEXT NOT NULL,
        PRIMARY KEY (user_id, post_id)
      )`,
    ],
    "write",
  );
  ensured = true;
}

export async function getJars(userId: string): Promise<Jar[]> {
  await ensurePersonalizationTables();
  const result = await turso.execute({
    sql: "SELECT category, picked, weight, updated_at FROM user_category_prefs WHERE user_id = ?",
    args: [userId],
  });
  return result.rows.map((row) => ({
    category: String(row.category),
    picked: Number(row.picked) === 1,
    weight: Number(row.weight),
    updatedAt: String(row.updated_at),
  }));
}

// Wizard save: reseeds ALL six jars fresh (this is also the "reset learning"
// mechanism — spec §2.1).
export async function reseedJars(userId: string, picked: string[]): Promise<void> {
  await ensurePersonalizationTables();
  const nowIso = new Date().toISOString();
  await turso.batch(
    seedJars(picked).map((jar) => ({
      sql: `INSERT INTO user_category_prefs (user_id, category, picked, weight, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id, category) DO UPDATE SET
              picked = excluded.picked,
              weight = excluded.weight,
              updated_at = excluded.updated_at`,
      args: [userId, jar.category, jar.picked ? 1 : 0, jar.weight, nowIso],
    })),
    "write",
  );
}

// Adds CLICK_POINTS to one jar (decaying it first). No dedupe, no click log —
// used by bookmarking, where saving is its own signal. Preserves `picked`.
export async function bumpJar(userId: string, category: string): Promise<void> {
  if (!isCategory(category)) return; // legacy categories: safe no-op
  await ensurePersonalizationTables();
  const nowIso = new Date().toISOString();
  const existing = await turso.execute({
    sql: "SELECT weight, updated_at FROM user_category_prefs WHERE user_id = ? AND category = ?",
    args: [userId, category],
  });
  const row = existing.rows[0];
  const newWeight = row
    ? applyClick(Number(row.weight), String(row.updated_at), nowIso)
    : DEFAULT_WEIGHT + CLICK_POINTS;
  await turso.execute({
    sql: `INSERT INTO user_category_prefs (user_id, category, picked, weight, updated_at)
          VALUES (?, ?, 0, ?, ?)
          ON CONFLICT(user_id, category) DO UPDATE SET
            weight = excluded.weight,
            updated_at = excluded.updated_at`,
    args: [userId, category, newWeight, nowIso],
  });
}

// Full click pipeline: 24h same-post dedupe → jar bump → click log → lazy
// retention prune. Callers wrap this in try/catch — it must never break the
// user-facing action it rides on (/go redirect, blog render).
export async function recordClick(userId: string, postId: number, category: string): Promise<void> {
  if (!isCategory(category) || !Number.isFinite(postId)) return;
  await ensurePersonalizationTables();

  // clicked_at is stored as ISO-8601 with 'T'/'Z' (new Date().toISOString()),
  // so thresholds must be formatted the same way — plain datetime('now',...)
  // yields "YYYY-MM-DD HH:MM:SS", which compares wrongly against 'T'.
  const duplicate = await turso.execute({
    sql: `SELECT 1 FROM user_clicks
          WHERE user_id = ? AND post_id = ?
            AND clicked_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-${CLICK_DEDUPE_HOURS} hours')
          LIMIT 1`,
    args: [userId, postId],
  });
  if (duplicate.rows.length > 0) return;

  await bumpJar(userId, category);
  await turso.batch(
    [
      {
        sql: "INSERT INTO user_clicks (user_id, post_id, category, clicked_at) VALUES (?, ?, ?, ?)",
        args: [userId, postId, category, new Date().toISOString()],
      },
      {
        sql: `DELETE FROM user_clicks
              WHERE user_id = ? AND clicked_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-${CLICK_RETENTION_DAYS} days')`,
        args: [userId],
      },
    ],
    "write",
  );
}
