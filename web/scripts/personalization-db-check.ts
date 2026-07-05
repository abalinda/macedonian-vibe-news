// web/scripts/personalization-db-check.ts
// Integration check for the personalization DB layer against the real Turso
// DB, fully scoped to a throwaway user id (cleaned up at the end).
// Run from web/:  npx tsx scripts/personalization-db-check.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load web/.env.local manually (dotenv is not a dependency).
const envFile = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
for (const line of envFile.split("\n")) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const USER = "__db-check-user__";
let failures = 0;
function checkTrue(name: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failures++;
}

async function main() {
  // Dynamic imports so env vars are set before lib/turso.ts reads them.
  const { turso } = await import("../lib/turso");
  const db = await import("../lib/personalization-db");
  const { SEED_PICKED, SEED_UNPICKED } = await import("../lib/personalization");

  const cleanup = async () => {
    await turso.batch(
      [
        { sql: "DELETE FROM user_category_prefs WHERE user_id = ?", args: [USER] },
        { sql: "DELETE FROM user_clicks WHERE user_id = ?", args: [USER] },
        { sql: "DELETE FROM user_saved_posts WHERE user_id = ?", args: [USER] },
      ],
      "write",
    );
  };

  try {
    await db.ensurePersonalizationTables();
    await cleanup(); // start clean in case of a previous crashed run

    checkTrue("no jars for fresh user", (await db.getJars(USER)).length === 0);

    await db.reseedJars(USER, ["Tech", "Sports"]);
    let jars = await db.getJars(USER);
    checkTrue("reseed creates 6 jars", jars.length === 6);
    checkTrue("picked Tech = 5", jars.find(j => j.category === "Tech")?.weight === SEED_PICKED);
    checkTrue("picked flag set", jars.find(j => j.category === "Tech")?.picked === true);
    checkTrue("unpicked Culture = 1", jars.find(j => j.category === "Culture")?.weight === SEED_UNPICKED);

    // Use a real post id so the click log has a plausible row.
    const anyPost = await turso.execute({ sql: "SELECT id, category FROM posts ORDER BY id DESC LIMIT 1", args: [] });
    const postId = Number(anyPost.rows[0]?.id ?? 1);

    await db.recordClick(USER, postId, "Culture");
    jars = await db.getJars(USER);
    const culture = jars.find(j => j.category === "Culture");
    checkTrue("click bumps Culture jar to ~2", Math.abs((culture?.weight ?? 0) - 2) < 0.01);

    const clicks1 = await turso.execute({ sql: "SELECT COUNT(*) AS n FROM user_clicks WHERE user_id = ?", args: [USER] });
    checkTrue("click logged", Number(clicks1.rows[0]?.n) === 1);

    await db.recordClick(USER, postId, "Culture"); // same post, within 24h
    const clicks2 = await turso.execute({ sql: "SELECT COUNT(*) AS n FROM user_clicks WHERE user_id = ?", args: [USER] });
    jars = await db.getJars(USER);
    checkTrue("24h dedupe: no second log", Number(clicks2.rows[0]?.n) === 1);
    checkTrue("24h dedupe: no second bump", Math.abs((jars.find(j => j.category === "Culture")?.weight ?? 0) - 2) < 0.01);

    await db.recordClick(USER, postId, "iran"); // legacy/unknown category
    checkTrue("unknown category is a safe no-op", (await db.getJars(USER)).length === 6);

    await db.bumpJar(USER, "Sports");
    jars = await db.getJars(USER);
    checkTrue("bumpJar adds a point to Sports (~6)", Math.abs((jars.find(j => j.category === "Sports")?.weight ?? 0) - 6) < 0.01);

    // Re-pick resets learning.
    await db.reseedJars(USER, ["Culture"]);
    jars = await db.getJars(USER);
    checkTrue("re-pick resets Culture to 5", jars.find(j => j.category === "Culture")?.weight === SEED_PICKED);
    checkTrue("re-pick resets Sports to 1", jars.find(j => j.category === "Sports")?.weight === SEED_UNPICKED);
  } finally {
    await cleanup();
  }

  console.log(failures === 0 ? "\nALL DB CHECKS PASSED" : `\n${failures} DB CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
