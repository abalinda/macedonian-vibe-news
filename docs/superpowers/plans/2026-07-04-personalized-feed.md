# Personalized Feed («Твои Вести») + Profile («Профил») Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-in-only personalized feed at `/tvoi-vesti` (category picks + click-learning "points-jar" ranking) and a private profile page at `/profil` (Clerk account, vibe profile, reading history, saved articles).

**Architecture:** Two new Turso tables (`user_category_prefs`, `user_clicks`) plus `user_saved_posts`, created by idempotent runtime guards. The whole ranking algorithm is pure TypeScript in `web/lib/personalization.ts` (no I/O); a thin DB layer in `web/lib/personalization-db.ts` does reads/writes; Next.js server actions expose it to the UI. Clicks are learned in the existing `/go/[id]` redirect route and via a client ping on blog pages.

**Tech Stack:** Next.js 16 App Router (React 19), Clerk (`@clerk/nextjs` v6), Turso via `@libsql/client/http`, Tailwind v4 (semantic tokens, no config), PostHog (`posthog-js`). No test framework exists — verification uses `npx tsx` check scripts + `eslint`/`tsc`.

**Spec:** `docs/superpowers/specs/2026-07-04-personalized-feed-design.md`. Read it first. One deliberate deviation from spec §4.2: blog reads are recorded by a **client component calling a server action on mount**, not on server render — `web/app/blog/[id]/page.tsx` uses ISR (`revalidate = 120`), so a server-side `auth()` call would either break ISR or never run per-user on cached renders. The spec itself flags this as the fallback.

## Global Constraints

- All work happens in `web/` on a feature branch: `git checkout -b feature/za-tebe` (from `v2`). Run all npm/npx commands **from `web/`**.
- **One-time setup before Task 2:** `tsx` is not installed and `npx` cannot auto-confirm in a non-interactive shell. Run `npm install -D tsx` from `web/` and include the `package.json`/`package-lock.json` change in the Task 2 commit.
- **Shell is zsh:** always QUOTE paths containing brackets (`"web/app/go/[id]/route.ts"`, `"app/blog/[id]/record-read.tsx"`) in every git/eslint/ls command, or zsh aborts with `no matches found`.
- Algorithm constants (exact values, defined once in `web/lib/personalization.ts`): `SEED_PICKED = 5.0`, `SEED_UNPICKED = 1.0`, `CLICK_POINTS = 1.0`, `DECAY_HALF_LIFE_DAYS = 14`, `RECENCY_HALF_LIFE_HOURS = 36`, `BOOST_CAP = 3.0`, `GOOD_VIBES_BONUS = 1.2`, `FEED_FETCH_LIMIT = 150`, `CLICK_DEDUPE_HOURS = 24`, `CLICK_RETENTION_DAYS = 90`, `DEFAULT_WEIGHT = 1.0`.
- Categories (exact DB values): `Tech`, `Culture`, `Lifestyle`, `Business`, `Sports`, `Blog`. Macedonian labels: Технологија, Култура, Животен стил, Бизнис, Спорт, Блог.
- Macedonian copy (verbatim): page «Твои Вести»; wizard headline «Избери ги твоите вибрации», sub «Одбери барем една категорија — остатокот го учиме од тебе.», CTA «Зачувај», re-pick warning «Зачувувањето ги ресетира научените вибрации.»; profile bars «Твојот вајб»; button «Смени ги вибрациите»; profile page «Профил» with sections «Сметка», «Твојот вајб», «Прочитано», «Зачувано».
- **`web/DESIGN_SYSTEM.md` is mandatory** for all UI: semantic tokens (`bg-paper`, `text-ink`, `bg-surface`, `border-line`, `border-line-soft`, `bg-accent`, `text-muted`), hard borders + offset zero-blur shadows (`shadow-[6px_6px_0_var(--shadow)]`), Playfair via `font-serif`, mono UPPERCASE micro-labels. New patterns (vibe bars, selectable category card, save button) must be documented in `DESIGN_SYSTEM.md` **in the same commit** that introduces them (Task 6).
- Personalized pages (`/tvoi-vesti`, `/profil`) must use `export const dynamic = "force-dynamic";` and **no `revalidate`**. Never add `auth()`/`currentUser()` to existing ISR pages (`/`, `/najnovo`, `/blog/[id]`).
- Personalization must never break core behavior: every learn/rank call is wrapped in try/catch; `/go` always redirects; `/tvoi-vesti` falls back to newest-first on ranking errors.
- Imports **within `web/lib/`** must be relative (`./turso`, `./categories`) — the `npx tsx` check scripts don't resolve the `@/` alias reliably. App code (`app/**`) uses `@/lib/...` as usual.
- Use `auth()` (just `userId`) from `@clerk/nextjs/server`, not `currentUser()` — no user-object fetch is needed anywhere in this feature.
- The build ignores TS/ESLint errors (`next.config.ts`), so every task runs `npx tsc --noEmit` and `npx eslint <changed files>` explicitly before committing.
- Follow the repo's `/* eslint-disable @typescript-eslint/no-explicit-any */` + `post: any` convention in feed UI components; new lib files must be fully typed (no `any`).
- Commit messages: conventional commits, ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Category constants (`web/lib/categories.ts`)

**Files:**
- Create: `web/lib/categories.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `CATEGORIES: readonly ["Tech","Culture","Lifestyle","Business","Sports","Blog"]`, `type Category`, `CATEGORY_LABELS: Record<Category, string>`, `isCategory(value: unknown): value is Category`. Every later task imports from here.

- [ ] **Step 1: Create the file**

```ts
// web/lib/categories.ts
// Single source of truth for post categories. The same English values are
// stored in Turso `posts.category`; the labels are the Macedonian UI names.
// (Older copies of these maps exist in page components — new code imports
// from here; old code migrates opportunistically.)

export const CATEGORIES = [
  "Tech",
  "Culture",
  "Lifestyle",
  "Business",
  "Sports",
  "Blog",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  Tech: "Технологија",
  Culture: "Култура",
  Lifestyle: "Животен стил",
  Business: "Бизнис",
  Sports: "Спорт",
  Blog: "Блог",
};

export function isCategory(value: unknown): value is Category {
  return (
    typeof value === "string" &&
    (CATEGORIES as readonly string[]).includes(value)
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run (from `web/`): `npx tsc --noEmit`
Expected: exits 0 (pre-existing errors, if any, must not mention `lib/categories.ts`).

- [ ] **Step 3: Commit**

```bash
git add web/lib/categories.ts
git commit -m "feat(web): add shared category constants

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Pure ranking algorithm + check script (TDD)

**Files:**
- Create: `web/lib/personalization.ts`
- Test: `web/scripts/personalization-check.ts`

**Interfaces:**
- Consumes: `CATEGORIES`, `Category` from `./categories` (Task 1).
- Produces (used by Tasks 3–8):
  - constants listed in Global Constraints
  - `type Jar = { category: string; picked: boolean; weight: number; updatedAt: string }`
  - `decayWeight(weight: number, fromIso: string, toIso: string): number`
  - `applyClick(currentWeight: number, lastUpdatedIso: string, nowIso: string): number`
  - `seedJars(picked: string[]): { category: Category; picked: boolean; weight: number }[]`
  - `currentWeights(jars: Jar[], nowIso: string): Map<string, number>`
  - `boostFor(category: string | null | undefined, weights: Map<string, number>): number`
  - `scorePost(post: ScoredPostInput, weights: Map<string, number>, nowIso: string): number`
  - `rankPosts<T extends ScoredPostInput>(posts: T[], jars: Jar[], nowIso: string): T[]`
  - `profileShares(jars: Jar[], nowIso: string): { category: Category; label: string; share: number; picked: boolean }[]`
  - `type ScoredPostInput = { category?: string | null; published_at?: string | null; scraped_at?: string | null; good_vibes?: number | boolean | null }`

- [ ] **Step 0: Install the script runner**

Run (from `web/`): `npm install -D tsx`
Expected: exits 0; `package.json` devDependencies now include `tsx`.

- [ ] **Step 1: Write the failing check script**

The script is the test suite. It asserts the spec §2.3 worked example plus decay, cap, and fallback behavior.

```ts
// web/scripts/personalization-check.ts
// Sanity harness for the pure ranking algorithm (repo has no test runner).
// Run from web/:  npx tsx scripts/personalization-check.ts
// Exits non-zero on the first failed assertion.

import {
  SEED_PICKED,
  SEED_UNPICKED,
  DECAY_HALF_LIFE_DAYS,
  BOOST_CAP,
  GOOD_VIBES_BONUS,
  decayWeight,
  applyClick,
  seedJars,
  currentWeights,
  boostFor,
  scorePost,
  rankPosts,
  profileShares,
  type Jar,
} from "../lib/personalization";

let failures = 0;
function check(name: string, actual: number, expected: number, tol = 1e-3) {
  const ok = Math.abs(actual - expected) <= tol;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  actual=${actual} expected≈${expected}`);
  if (!ok) failures++;
}
function checkTrue(name: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failures++;
}

const NOW = "2026-07-04T12:00:00.000Z";
const hoursAgo = (h: number) =>
  new Date(Date.parse(NOW) - h * 3_600_000).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);

// --- seeding (spec §2.1) ---
const seeded = seedJars(["Tech", "Sports"]);
checkTrue("seedJars returns 6 jars", seeded.length === 6);
check("picked Tech seeds to 5", seeded.find(j => j.category === "Tech")!.weight, SEED_PICKED, 0);
check("unpicked Culture seeds to 1", seeded.find(j => j.category === "Culture")!.weight, SEED_UNPICKED, 0);

// --- decay half-life (spec §2.1): weight halves in exactly 14 days ---
check("14-day half-life", decayWeight(10, daysAgo(DECAY_HALF_LIFE_DAYS), NOW), 5);
check("no time elapsed → no decay", decayWeight(10, NOW, NOW), 10, 0);
check("clock skew (from > to) → no decay", decayWeight(10, NOW, daysAgo(1)), 10, 0);

// --- applyClick ---
check("click adds 1 point", applyClick(5, NOW, NOW), 6);

// --- spec §2.3 worked example: picks Tech+Sports, fresh jars ---
const jars: Jar[] = seeded.map(j => ({ ...j, updatedAt: NOW }));
const weights = currentWeights(jars, NOW);
check("Tech boost 5/(14/6)", boostFor("Tech", weights), 30 / 14, 1e-6);
check("Culture boost 1/(14/6)", boostFor("Culture", weights), 6 / 14, 1e-6);

const techPost = { category: "Tech", published_at: hoursAgo(20), good_vibes: 0 };
const culturePost = { category: "Culture", published_at: hoursAgo(2), good_vibes: 0 };
const cultureVibes = { ...culturePost, good_vibes: 1 };
const techScore = scorePost(techPost, weights, NOW);
const cultureScore = scorePost(culturePost, weights, NOW);
check("20h Tech story score", techScore, 1.458);
check("2h Culture story score", cultureScore, 0.412);
check("good_vibes multiplies by 1.2", scorePost(cultureVibes, weights, NOW), cultureScore * GOOD_VIBES_BONUS, 1e-6);
checkTrue("Tech story outranks fresher Culture story", techScore > cultureScore);

// --- boost cap (spec §2.2) ---
const obsessed: Jar[] = jars.map(j =>
  j.category === "Tech" ? { ...j, weight: 500 } : j,
);
checkTrue("boost is capped", boostFor("Tech", currentWeights(obsessed, NOW)) === BOOST_CAP);

// --- unknown / missing data never crashes, boost 1.0 (spec §6) ---
check("unknown category → boost 1.0", boostFor("iran", weights), 1.0, 0);
checkTrue("post with no dates still scores finitely",
  Number.isFinite(scorePost({ category: "Tech" }, weights, NOW)));

// --- no prefs → pure recency order (spec §2.3 last paragraph) ---
const noPrefRanked = rankPosts(
  [
    { id: "old", category: "Tech", published_at: hoursAgo(30) },
    { id: "new", category: "Culture", published_at: hoursAgo(1) },
  ] as any[],
  [],
  NOW,
);
checkTrue("no jars → newest first", (noPrefRanked[0] as any).id === "new");

// --- rankPosts personalizes (worked example end-to-end) ---
const ranked = rankPosts([culturePost, techPost] as any[], jars, NOW);
checkTrue("rankPosts puts Tech first for Tech-picker", (ranked[0] as any).category === "Tech");
checkTrue("rankPosts keeps Culture in the list (boost, don't hide)", ranked.length === 2);

// --- profile bars (spec §2.4): shares sum to 1, picked Tech dominates ---
const shares = profileShares(jars, NOW);
check("shares sum to 1", shares.reduce((s, x) => s + x.share, 0), 1, 1e-9);
check("Tech share = 5/14", shares.find(s => s.category === "Tech")!.share, 5 / 14, 1e-9);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 2: Run it to verify it fails**

Run (from `web/`): `npx tsx scripts/personalization-check.ts`
Expected: FAILS — `Cannot find module '../lib/personalization'`.

- [ ] **Step 3: Implement the algorithm**

```ts
// web/lib/personalization.ts
// The ENTIRE personalization algorithm ("six jars with a slow leak") lives in
// this file as pure functions — no I/O, no Date.now() (callers pass nowIso).
// Retuning the feed = editing the constants below. The spec's worked example
// (docs/superpowers/specs/2026-07-04-personalized-feed-design.md §2.3) is
// enforced by scripts/personalization-check.ts.

import { CATEGORIES, CATEGORY_LABELS, type Category } from "./categories";

// Wizard seeds: a picked category starts with 5 "clicks" of weight; unpicked
// jars floor at 1 so nothing is ever hidden (boost, don't hide).
export const SEED_PICKED = 5.0;
export const SEED_UNPICKED = 1.0;
// Each article click adds one point to its category's jar.
export const CLICK_POINTS = 1.0;
// Jars lose half their points every 14 days (lazy decay — no cron).
export const DECAY_HALF_LIFE_DAYS = 14;
// A story loses half its freshness every 36 hours.
export const RECENCY_HALF_LIFE_HOURS = 36;
// No single obsession may dominate: boost = jar/avg, capped here.
export const BOOST_CAP = 3.0;
// Claude-curated homepage-worthy stories surface regardless of taste.
export const GOOD_VIBES_BONUS = 1.2;
// How many recent posts the /tvoi-vesti page fetches before ranking.
export const FEED_FETCH_LIMIT = 150;
// Repeat clicks on the same post within this window don't count.
export const CLICK_DEDUPE_HOURS = 24;
// Click log retention (privacy + size hygiene), pruned lazily on writes.
export const CLICK_RETENTION_DAYS = 90;
// A category with no jar row reads as this weight.
export const DEFAULT_WEIGHT = 1.0;

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;
// A post whose dates are unparseable is treated as this old (finite, stale-ish).
const FALLBACK_AGE_HOURS = 72;

export type Jar = {
  category: string;
  picked: boolean;
  weight: number;
  updatedAt: string; // ISO timestamp — anchor for lazy decay
};

export type ScoredPostInput = {
  category?: string | null;
  published_at?: string | null;
  scraped_at?: string | null;
  good_vibes?: number | boolean | null;
};

export function decayWeight(weight: number, fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return weight;
  const days = (to - from) / MS_PER_DAY;
  return weight * Math.pow(0.5, days / DECAY_HALF_LIFE_DAYS);
}

export function applyClick(currentWeight: number, lastUpdatedIso: string, nowIso: string): number {
  return decayWeight(currentWeight, lastUpdatedIso, nowIso) + CLICK_POINTS;
}

export function seedJars(picked: string[]): { category: Category; picked: boolean; weight: number }[] {
  return CATEGORIES.map((category) => {
    const isPicked = picked.includes(category);
    return { category, picked: isPicked, weight: isPicked ? SEED_PICKED : SEED_UNPICKED };
  });
}

// Decayed weight per category, DEFAULT_WEIGHT for categories with no row.
export function currentWeights(jars: Jar[], nowIso: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const category of CATEGORIES) map.set(category, DEFAULT_WEIGHT);
  for (const jar of jars) {
    if (map.has(jar.category)) {
      map.set(jar.category, decayWeight(jar.weight, jar.updatedAt, nowIso));
    }
  }
  return map;
}

export function boostFor(category: string | null | undefined, weights: Map<string, number>): number {
  if (!category || !weights.has(category)) return 1.0;
  let sum = 0;
  for (const c of CATEGORIES) sum += weights.get(c) ?? DEFAULT_WEIGHT;
  const avg = sum / CATEGORIES.length;
  if (avg <= 0) return 1.0;
  return Math.min(BOOST_CAP, (weights.get(category) ?? DEFAULT_WEIGHT) / avg);
}

function ageHours(post: ScoredPostInput, nowIso: string): number {
  const now = Date.parse(nowIso);
  const ts = Date.parse(post.published_at ?? "") || Date.parse(post.scraped_at ?? "");
  if (!Number.isFinite(now) || !ts) return FALLBACK_AGE_HOURS;
  return Math.max(0, (now - ts) / MS_PER_HOUR);
}

export function scorePost(post: ScoredPostInput, weights: Map<string, number>, nowIso: string): number {
  const recency = Math.pow(0.5, ageHours(post, nowIso) / RECENCY_HALF_LIFE_HOURS);
  const vibes = post.good_vibes ? GOOD_VIBES_BONUS : 1.0;
  return recency * boostFor(post.category, weights) * vibes;
}

// Returns a new array, highest score first; ties break newer-first.
export function rankPosts<T extends ScoredPostInput>(posts: T[], jars: Jar[], nowIso: string): T[] {
  const weights = currentWeights(jars, nowIso);
  return posts
    .map((post) => ({ post, score: scorePost(post, weights, nowIso) }))
    .sort((a, b) => b.score - a.score || ageHours(a.post, nowIso) - ageHours(b.post, nowIso))
    .map((entry) => entry.post);
}

// «Твојот вајб» bars: each category's share of the total jar mass.
// Computed from the same weights that drive ranking, so bars and feed can
// never disagree.
export function profileShares(
  jars: Jar[],
  nowIso: string,
): { category: Category; label: string; share: number; picked: boolean }[] {
  const weights = currentWeights(jars, nowIso);
  const pickedSet = new Set(jars.filter((j) => j.picked).map((j) => j.category));
  let total = 0;
  for (const c of CATEGORIES) total += weights.get(c) ?? DEFAULT_WEIGHT;
  return CATEGORIES.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    share: total > 0 ? (weights.get(category) ?? DEFAULT_WEIGHT) / total : 1 / CATEGORIES.length,
    picked: pickedSet.has(category),
  }));
}
```

- [ ] **Step 4: Run the check script — must pass**

Run (from `web/`): `npx tsx scripts/personalization-check.ts`
Expected: every line `PASS`, final line `ALL CHECKS PASSED`, exit 0.

- [ ] **Step 5: Lint + typecheck**

Run (from `web/`): `npx tsc --noEmit && npx eslint lib/personalization.ts scripts/personalization-check.ts`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add web/lib/personalization.ts web/scripts/personalization-check.ts web/package.json web/package-lock.json
git commit -m "feat(web): pure points-jar personalization algorithm + check script

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: DB layer (`web/lib/personalization-db.ts`) + DB check script

**Files:**
- Create: `web/lib/personalization-db.ts`
- Test: `web/scripts/personalization-db-check.ts`

**Interfaces:**
- Consumes: `turso` from `./turso`; `applyClick`, `seedJars`, constants, `type Jar` from `./personalization`; `isCategory` from `./categories`.
- Produces (used by Tasks 4–8):
  - `ensurePersonalizationTables(): Promise<void>`
  - `getJars(userId: string): Promise<Jar[]>`
  - `reseedJars(userId: string, picked: string[]): Promise<void>`
  - `recordClick(userId: string, postId: number, category: string): Promise<void>` — dedupes 24h, logs, bumps jar, prunes
  - `bumpJar(userId: string, category: string): Promise<void>` — jar bump only (used by bookmarking)

**⚠️ Note for the implementer:** the DB check script writes to the real Turso database (there is only one), scoped entirely to the fake user id `__db-check-user__`, and deletes those rows at the end. That is intended and safe.

- [ ] **Step 1: Write the failing DB check script**

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run (from `web/`): `npx tsx scripts/personalization-db-check.ts`
Expected: FAILS — `Cannot find module '../lib/personalization-db'`.

- [ ] **Step 3: Implement the DB layer**

```ts
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
```

- [ ] **Step 4: Run the DB check — must pass**

Run (from `web/`): `npx tsx scripts/personalization-db-check.ts`
Expected: every line `PASS`, final `ALL DB CHECKS PASSED`, exit 0.
(If it fails with missing env vars, confirm `web/.env.local` has `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.)

- [ ] **Step 5: Lint + typecheck, then commit**

Run (from `web/`): `npx tsc --noEmit && npx eslint lib/personalization-db.ts scripts/personalization-db-check.ts`

```bash
git add web/lib/personalization-db.ts web/scripts/personalization-db-check.ts
git commit -m "feat(web): personalization DB layer (jars, clicks, saves) + integration check

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Server actions — preferences & blog read tracking

**Files:**
- Create: `web/app/actions/preferences.ts`
- Create: `web/app/actions/read-tracking.ts`

**Interfaces:**
- Consumes: `auth` from `@clerk/nextjs/server`; `getJars`, `reseedJars`, `recordClick` from `@/lib/personalization-db`; `isCategory` from `@/lib/categories`; `Jar` from `@/lib/personalization`.
- Produces (used by Tasks 5–8):
  - `getPreferences(): Promise<{ hasPrefs: boolean; jars: Jar[] } | null>` (null = signed out or error)
  - `savePreferences(picked: string[]): Promise<{ ok: boolean; error?: string }>`
  - `recordBlogRead(postId: number): Promise<void>`

- [ ] **Step 1: Create `preferences.ts`** (mirrors the style of `web/app/actions/search.ts`: typed, try/catch, safe fallbacks)

```ts
// web/app/actions/preferences.ts
'use server';

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { isCategory } from "@/lib/categories";
import { getJars, reseedJars } from "@/lib/personalization-db";
import type { Jar } from "@/lib/personalization";

export type PreferencesState = { hasPrefs: boolean; jars: Jar[] };

export async function getPreferences(): Promise<PreferencesState | null> {
  const { userId } = await auth();
  if (!userId) return null;
  try {
    const jars = await getJars(userId);
    return { hasPrefs: jars.length > 0, jars };
  } catch (error) {
    console.error("getPreferences failed:", error);
    return null;
  }
}

// Wizard save. Reseeds all six jars — this is also the learning reset.
export async function savePreferences(picked: string[]): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "unauthenticated" };

  const unique = Array.from(new Set(picked));
  if (unique.length === 0) return { ok: false, error: "empty" };
  if (!unique.every(isCategory)) return { ok: false, error: "invalid-category" };

  try {
    await reseedJars(userId, unique);
    revalidatePath("/tvoi-vesti");
    revalidatePath("/profil");
    return { ok: true };
  } catch (error) {
    console.error("savePreferences failed:", error);
    return { ok: false, error: "db" };
  }
}
```

- [ ] **Step 2: Create `read-tracking.ts`**

```ts
// web/app/actions/read-tracking.ts
'use server';

import { auth } from "@clerk/nextjs/server";
import { recordClick } from "@/lib/personalization-db";

// Called by a client component on blog pages (the blog reader is ISR-cached,
// so the server render can't see the user — spec §4.2 note). Opening a blog
// post counts as a "click" on the Blog category; recordClick's 24h dedupe
// absorbs refreshes and router prefetches.
export async function recordBlogRead(postId: number): Promise<void> {
  const { userId } = await auth();
  if (!userId || !Number.isFinite(postId)) return;
  try {
    await recordClick(userId, postId, "Blog");
  } catch (error) {
    console.error("recordBlogRead failed:", error);
  }
}
```

- [ ] **Step 3: Typecheck + lint, then commit**

Run (from `web/`): `npx tsc --noEmit && npx eslint app/actions/preferences.ts app/actions/read-tracking.ts`

```bash
git add web/app/actions/preferences.ts web/app/actions/read-tracking.ts
git commit -m "feat(web): preference + blog read-tracking server actions

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Click learning in `/go/[id]` + blog read ping

**Files:**
- Modify: `web/app/go/[id]/route.ts`
- Create: `web/app/blog/[id]/record-read.tsx`
- Modify: `web/app/blog/[id]/page.tsx` (mount the ping component; two-line change)

**Interfaces:**
- Consumes: `recordClick` (Task 3), `recordBlogRead` (Task 4).
- Produces: no exports consumed later; behavioral guarantee that clicking any external article while signed in bumps the jar, and opening a blog post does the same.

- [ ] **Step 1: Rewrite `web/app/go/[id]/route.ts`**

Full new content (changes: also select `category`; resolve `userId` via `auth()`; call `recordClick` inside its own try/catch so learning can never break the redirect):

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { turso } from "@/lib/turso";
import { recordClick } from "@/lib/personalization-db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const postId = Number(id);

  if (!Number.isFinite(postId)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const result = await turso.execute({
      sql: "SELECT link, category FROM posts WHERE id = ? LIMIT 1",
      args: [postId],
    });

    const post = result.rows[0];
    const targetUrl = (post?.link as string | null) ?? null;

    if (!targetUrl) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    await turso.execute({
      sql: "UPDATE posts SET clicks = COALESCE(clicks, 0) + 1 WHERE id = ?",
      args: [postId],
    });

    // Personalization learning: never allowed to block or break the redirect.
    try {
      const { userId } = await auth();
      if (userId) {
        await recordClick(userId, postId, String(post?.category ?? ""));
      }
    } catch (error) {
      console.error("recordClick on /go failed:", error);
    }

    return NextResponse.redirect(targetUrl, 307);
  } catch (error) {
    console.error("Redirect error on /go:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
```

- [ ] **Step 2: Create the blog read ping component**

```tsx
// web/app/blog/[id]/record-read.tsx
'use client';

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { recordBlogRead } from "@/app/actions/read-tracking";

// Invisible: pings the read-tracking action once per mount for signed-in
// users. Lives client-side because the blog page is ISR-cached (shared HTML),
// so only the browser knows who is reading.
export function RecordRead({ postId }: { postId: number }) {
  const { user } = useUser();
  const userId = user?.id;

  useEffect(() => {
    if (!userId || !Number.isFinite(postId)) return;
    recordBlogRead(postId).catch(() => {
      /* learning is best-effort; never surface errors to the reader */
    });
  }, [userId, postId]);

  return null;
}
```

- [ ] **Step 3: Mount it in the blog page**

In `web/app/blog/[id]/page.tsx`, add the import next to the other component imports (after line 10, `import { ReadingProgress } ...`):

```tsx
import { RecordRead } from "./record-read";
```

and render it right after `<ReadingProgress postId={postId} title={post?.title} />` inside `<main>`:

```tsx
      <RecordRead postId={postId} />
```

Do NOT touch `export const revalidate = 120;` — the page stays ISR.

- [ ] **Step 4: Verify with the dev server**

Run (from `web/`): `npm run dev`, then:
1. While **signed out**: open `http://localhost:3000`, click an external article → browser lands on the source site; confirm no errors in the dev console/server log.
2. While **signed in** (create/use a Clerk dev account in the browser): click an external article, then inspect the jars. Create a small probe script (do not commit it) `web/scripts/probe-jars.ts`:
   ```ts
   // web/scripts/probe-jars.ts — dev-only DB peek; delete or leave untracked.
   import { readFileSync } from "node:fs";
   import { resolve } from "node:path";
   for (const l of readFileSync(resolve(__dirname, "../.env.local"), "utf8").split("\n")) {
     const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
     if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
   }
   async function main() {
     const { turso } = await import("../lib/turso");
     const r = await turso.execute({
       sql: "SELECT user_id, category, weight, picked, updated_at FROM user_category_prefs ORDER BY updated_at DESC LIMIT 10",
       args: [],
     });
     console.log(r.rows);
   }
   main();
   ```
   Run (from `web/`): `npx tsx scripts/probe-jars.ts`
   Expected: a row for your Clerk user id with the clicked article's category at weight ≈ 2.0 (1.0 default + 1.0 click).
3. Open any blog post while signed in → same query shows a `Blog` row bumped.

- [ ] **Step 5: Typecheck + lint, then commit**

Run (from `web/`): `npx tsc --noEmit && npx eslint app/go "app/blog/[id]/record-read.tsx"` (quotes required — zsh)

```bash
git add "web/app/go/[id]/route.ts" "web/app/blog/[id]/record-read.tsx" "web/app/blog/[id]/page.tsx"
git commit -m "feat(web): learn category interest from /go clicks and blog reads

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: «Твои Вести» page — wizard, vibe profile, personalized feed, nav

**Files:**
- Create: `web/app/tvoi-vesti/page.tsx`
- Create: `web/app/tvoi-vesti/vibe-wizard.tsx`
- Create: `web/app/_components/vibe-profile.tsx` (shared with `/profil` in Task 8)
- Modify: `web/app/_components/article-link.tsx` (extend `ArticleFeed` union)
- Modify: `web/app/najnovo/latest-feed.tsx` (accept a `feed` prop so `/tvoi-vesti` reuses it)
- Modify: `web/app/_components/navigation.tsx` (menu + category chips)
- Modify: `web/DESIGN_SYSTEM.md` (document the two new patterns — **same commit**, repo rule)

**Interfaces:**
- Consumes: `getPreferences`, `savePreferences` (Task 4); `rankPosts`, `profileShares`, `FEED_FETCH_LIMIT` (Task 2); `CATEGORIES`, `CATEGORY_LABELS` (Task 1); `LatestFeed`, `ArticleLink` (existing).
- Produces: `VibeProfile({ shares, showChangeButton?: boolean })` React component reused by Task 8; `LatestFeed` gains optional prop `feed?: ArticleFeed` (default `"latest"` — `/najnovo` behavior unchanged); `ArticleFeed` union becomes `"home" | "latest" | "archive" | "search" | "tvoi-vesti" | "profile"`.

- [ ] **Step 1: Extend the `ArticleFeed` union**

In `web/app/_components/article-link.tsx` line 9, change:

```ts
export type ArticleFeed = "home" | "latest" | "archive" | "search";
```
to
```ts
export type ArticleFeed = "home" | "latest" | "archive" | "search" | "tvoi-vesti" | "profile";
```

- [ ] **Step 2: Let `LatestFeed` carry a configurable feed tag**

In `web/app/najnovo/latest-feed.tsx`:
1. Add to the imports: `import type { ArticleFeed } from "../_components/article-link";`
2. Change the `LatestCard` signature and its `<ArticleLink ... feed="latest" ...>` usage to take the tag from props:

```tsx
const LatestCard = ({ post, index, now, feed }: { post: any; index: number; now: number; feed: ArticleFeed }) => {
```
and inside it:
```tsx
      <ArticleLink post={post} className="group block h-full" feed={feed} position={index + 1}>
```
3. Change the `LatestFeed` signature and card rendering:

```tsx
export const LatestFeed = ({ posts, feed = "latest" }: { posts: any[]; feed?: ArticleFeed }) => {
```
```tsx
          <LatestCard key={post.id ?? `${post.title}-${index}`} post={post} index={index} now={now} feed={feed} />
```
Nothing else in the file changes; `/najnovo` renders identically (default prop).

- [ ] **Step 3: Create the shared vibe profile component**

No hooks — works as a server component on both pages.

```tsx
// web/app/_components/vibe-profile.tsx
import Link from "next/link";

export type VibeShare = { category: string; label: string; share: number; picked: boolean };

// «Твојот вајб»: the user's live category weights as bars. The percentages
// are computed by profileShares() from the SAME jars that rank the feed, so
// what this shows is exactly why the feed looks the way it does.
export function VibeProfile({
  shares,
  showChangeButton = true,
}: {
  shares: VibeShare[];
  showChangeButton?: boolean;
}) {
  const sorted = [...shares].sort((a, b) => b.share - a.share);
  return (
    <section className="border border-line bg-surface rounded-xl shadow-[6px_6px_0_var(--shadow)] p-5 md:p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="font-serif text-2xl font-black text-ink">Твојот вајб</h2>
        {showChangeButton && (
          <Link
            href="/tvoi-vesti?izberi=1"
            className="inline-flex items-center gap-2 border border-line bg-accent text-black px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] shadow-[4px_4px_0_var(--shadow)] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--shadow)]"
          >
            Смени ги вибрациите
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {sorted.map((item) => {
          const percent = Math.round(item.share * 100);
          return (
            <div key={item.category} className="flex items-center gap-3">
              <span className="w-28 md:w-36 shrink-0 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-neutral-600">
                {item.label}
                {item.picked ? <span aria-hidden> ★</span> : null}
              </span>
              <div className="flex-1 h-4 border border-line bg-surface-2 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-accent border-r border-line"
                  style={{ width: `${Math.max(percent, 2)}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-[11px] font-mono text-neutral-600">
                {percent}%
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] font-mono uppercase tracking-[0.2em] text-muted">
        ★ = твој избор · остатокот го учиме од твоите кликови
      </p>
    </section>
  );
}
```

- [ ] **Step 4: Create the wizard**

```tsx
// web/app/tvoi-vesti/vibe-wizard.tsx
'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import { savePreferences } from "@/app/actions/preferences";

// The one-time (re-triggerable) preference picker. Saving RESEEDS all jars —
// re-running the wizard is also the "reset the learning" mechanism.
export function VibeWizard({
  initialPicked,
  isRepick,
}: {
  initialPicked: string[];
  isRepick: boolean;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(initialPicked);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (category: string) =>
    setPicked((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );

  const save = async () => {
    if (picked.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    const result = await savePreferences(picked);
    if (result.ok) {
      posthog.capture("vibe_prefs_saved", { picked, is_repick: isRepick });
      router.push("/tvoi-vesti");
      router.refresh();
    } else {
      setError("Нешто тргна наопаку. Пробај повторно.");
      setSaving(false);
    }
  };

  return (
    <section className="max-w-2xl mx-auto border border-line bg-surface rounded-xl shadow-[8px_8px_0_var(--shadow)] p-6 md:p-10">
      <h1 className="font-serif text-3xl md:text-4xl font-black text-ink mb-2">
        Избери ги твоите вибрации
      </h1>
      <p className="text-sm text-neutral-600 mb-1">
        Одбери барем една категорија — остатокот го учиме од тебе.
      </p>
      {isRepick && (
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted mb-4">
          Зачувувањето ги ресетира научените вибрации.
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 my-6">
        {CATEGORIES.map((category) => {
          const isPicked = picked.includes(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() => toggle(category)}
              aria-pressed={isPicked}
              className={`border border-line rounded-lg px-4 py-5 text-left transition-all ${
                isPicked
                  ? "bg-accent text-black shadow-[6px_6px_0_var(--shadow)] -translate-y-0.5"
                  : "bg-surface-2 text-ink hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--shadow)]"
              }`}
            >
              <span className="block font-serif text-lg font-black leading-tight">
                {CATEGORY_LABELS[category]}
              </span>
              <span className="mt-1 block text-[10px] font-mono font-bold uppercase tracking-[0.25em]">
                {isPicked ? "✓ Избрано" : "Избери"}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm font-bold text-[#f26d6d] mb-3">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={picked.length === 0 || saving}
        className="w-full flex items-center justify-between border border-line bg-ink text-paper px-5 py-4 text-[12px] font-black uppercase tracking-[0.3em] transition-all enabled:hover:bg-accent enabled:hover:text-black enabled:hover:shadow-[6px_6px_0_var(--shadow)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span>{saving ? "Зачувуваме..." : "Зачувај"}</span>
        <span aria-hidden>→</span>
      </button>
    </section>
  );
}
```

- [ ] **Step 5: Create the page**

```tsx
// web/app/tvoi-vesti/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { turso } from "@/lib/turso";
import { rankPosts, profileShares, FEED_FETCH_LIMIT } from "@/lib/personalization";
import { getPreferences } from "@/app/actions/preferences";
import { CategoryNav, NavBar } from "../_components/navigation";
import { VibeProfile } from "../_components/vibe-profile";
import { LatestFeed } from "../najnovo/latest-feed";
import { VibeWizard } from "./vibe-wizard";

// Per-user page: never cached/ISR (Global Constraints).
export const dynamic = "force-dynamic";

const NavFallback = () => (
  <div className="sticky top-0 z-40 border-b border-line bg-paper py-3 px-4 md:px-8">
    <div className="w-full max-w-[1400px] mx-auto h-11" />
  </div>
);

const SignedOutPitch = () => (
  <div className="max-w-xl mx-auto text-center border-2 border-dashed border-line-soft rounded-xl bg-surface-2 px-6 py-16">
    <h1 className="font-serif text-3xl md:text-4xl font-black text-ink mb-3">Твои Вести</h1>
    <p className="text-sm text-neutral-600 mb-6 max-w-sm mx-auto">
      Управувај со твоите вести, сочувај написи и добиј персонализирани вибрации.
      Најави се за да ги избереш твоите категории.
    </p>
    <SignInButton mode="modal">
      <button className="inline-flex items-center gap-3 border border-line bg-accent text-black px-6 py-3 text-[11px] font-black uppercase tracking-[0.3em] shadow-[6px_6px_0_var(--shadow)] transition-all hover:-translate-y-0.5 hover:shadow-[10px_10px_0_var(--shadow)]">
        Најава <span aria-hidden>→</span>
      </button>
    </SignInButton>
  </div>
);

export default async function ForYouPage({
  searchParams,
}: {
  searchParams: Promise<{ izberi?: string }>;
}) {
  const { izberi } = await searchParams;
  const { userId } = await auth();

  let body: React.ReactNode;

  if (!userId) {
    body = <SignedOutPitch />;
  } else {
    const prefs = await getPreferences(); // null only on error
    const jars = prefs?.jars ?? [];
    const showWizard = izberi === "1" || jars.length === 0;

    if (showWizard) {
      body = (
        <VibeWizard
          initialPicked={jars.filter((j) => j.picked).map((j) => j.category)}
          isRepick={jars.length > 0}
        />
      );
    } else {
      let posts: any[] = [];
      try {
        const result = await turso.execute({
          sql: `SELECT * FROM posts ORDER BY scraped_at DESC LIMIT ${FEED_FETCH_LIMIT}`,
          args: [],
        });
        posts = JSON.parse(JSON.stringify(result.rows));
      } catch (err) {
        console.error("Failed to fetch posts for /tvoi-vesti:", err);
      }

      const nowIso = new Date().toISOString();
      // Ranking must never take the page down: fall back to newest-first.
      let ranked = posts;
      try {
        ranked = rankPosts(posts, jars, nowIso);
      } catch (err) {
        console.error("rankPosts failed, falling back to recency:", err);
      }

      body = (
        <div className="flex flex-col gap-8">
          <VibeProfile shares={profileShares(jars, nowIso)} />
          {ranked.length === 0 ? (
            <p className="text-center text-sm text-neutral-500 py-16">
              Нема вести во моментот. Провери повторно за неколку минути.
            </p>
          ) : (
            <LatestFeed posts={ranked} feed="tvoi-vesti" />
          )}
        </div>
      );
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink pb-20">
      <Suspense fallback={<NavFallback />}>
        <NavBar />
      </Suspense>
      <CategoryNav activeCategory="ForYou" />
      <div className="max-w-[1300px] mx-auto px-5 md:px-10 pt-8">
        <header className="mb-10 pb-6 border-b border-line">
          <h1 className="text-center font-serif text-4xl md:text-5xl font-black leading-tight mb-2">
            Твои Вести
          </h1>
          <p className="text-center text-[11px] font-mono uppercase tracking-[0.26em] text-muted">
            Вести подредени според твојот вајб
          </p>
        </header>
        {body}
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Add nav entries**

In `web/app/_components/navigation.tsx`:
1. `menuLinks` (currently starting at the `{ label: "Најново", href: "/najnovo" }` line): insert as the FIRST entry:
```ts
    { label: "Твои Вести", href: "/tvoi-vesti" },
```
2. `CategoryNav`'s `categories` array (starts with `{ name: "Најново", value: "Latest", href: "/najnovo" }`): insert as the FIRST entry:
```ts
    { name: "Твои Вести", value: "ForYou", href: "/tvoi-vesti" },
```
(The `/tvoi-vesti` page passes `activeCategory="ForYou"`, so the chip highlights there. Existing pages pass other values — no other changes needed. Note the file has local uncommitted modifications on this branch — edit around them, do not revert them.)

- [ ] **Step 7: Document the new patterns in `web/DESIGN_SYSTEM.md`**

Append to the component-recipes section (adapt heading level to the file's structure):

```markdown
### Vibe bars («Твојот вајб»)
Horizontal progress bars showing the user's live category weights (see
`app/_components/vibe-profile.tsx`). Track: `h-4 border border-line
bg-surface-2 rounded-sm`; fill: `bg-accent border-r border-line`, width =
percentage (min 2% so a bar is always visible). Label: mono UPPERCASE
`tracking-[0.2em]`; picked categories get a `★`. Never animate the fill.

### Selectable category card (wizard)
Toggle card used in the «Твои Вести» wizard (`app/tvoi-vesti/vibe-wizard.tsx`).
Unselected: `bg-surface-2 border border-line`; selected: `bg-accent
text-black shadow-[6px_6px_0_var(--shadow)] -translate-y-0.5` with a mono
`✓ Избрано` micro-label. Always toggled via `<button aria-pressed>`.
```

- [ ] **Step 8: Verify in the dev server**

Run (from `web/`): `npm run dev`, then:
1. Signed out → `http://localhost:3000/tvoi-vesti` shows the pitch + working «Најава» modal; nav drawer and category chips show «Твои Вести».
2. Sign in → `/tvoi-vesti` shows the wizard; «Зачувај» disabled with zero picks; pick Технологија + Спорт → save → feed renders with a «Твојот вајб» panel on top; Tech/Sports articles cluster near the top; other categories still present below (boost, don't hide).
3. `/tvoi-vesti?izberi=1` → wizard reopens pre-filled with Tech + Sports and shows the reset warning line.
4. «Смени ги вибрациите» button navigates to the wizard.
5. `/najnovo` still renders exactly as before (default `feed="latest"`).

- [ ] **Step 9: Typecheck + lint, then commit**

Run (from `web/`): `npx tsc --noEmit && npx eslint app/tvoi-vesti app/_components/vibe-profile.tsx app/_components/article-link.tsx app/najnovo/latest-feed.tsx`

```bash
git add web/app/tvoi-vesti web/app/_components/vibe-profile.tsx web/app/_components/article-link.tsx web/app/najnovo/latest-feed.tsx web/app/_components/navigation.tsx web/DESIGN_SYSTEM.md
git commit -m "feat(web): «Твои Вести» personalized feed — wizard, vibe profile, ranked feed, nav

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Bookmarks — actions, save button, wiring into feeds

**Files:**
- Create: `web/app/actions/bookmarks.ts`
- Create: `web/app/_components/save-button.tsx`
- Modify: `web/app/najnovo/latest-feed.tsx` (render `SaveButton` on cards + fetch saved state client-side)

**Interfaces:**
- Consumes: `auth`; `turso`; `ensurePersonalizationTables`, `bumpJar` (Task 3).
- Produces (used by Task 8):
  - `toggleBookmark(postId: number): Promise<{ saved: boolean } | null>`
  - `getSavedIds(postIds: number[]): Promise<number[]>`
  - `getSavedPosts(): Promise<SavedPost[]>` where `type SavedPost = { id: number; title: string; category: string | null; source: string | null; image_url: string | null; teaser: string | null; published_at: string | null; scraped_at: string | null; saved_at: string; link: string | null }`
  - `SaveButton({ postId, saved, onToggled?: (saved: boolean) => void, context: string, category?: string | null, source?: string | null })` client component (renders nothing when signed out)

- [ ] **Step 1: Create `bookmarks.ts`**

```ts
// web/app/actions/bookmarks.ts
'use server';

import { auth } from "@clerk/nextjs/server";
import { turso } from "@/lib/turso";
import { bumpJar, ensurePersonalizationTables } from "@/lib/personalization-db";

export type SavedPost = {
  id: number;
  title: string;
  category: string | null;
  source: string | null;
  image_url: string | null;
  teaser: string | null;
  published_at: string | null;
  scraped_at: string | null;
  saved_at: string;
  link: string | null;
};

// Toggle a bookmark. Saving also feeds the jar (+1, same as a click — saving
// is at least as strong a signal). Unsaving does NOT subtract (spec §9.1).
export async function toggleBookmark(postId: number): Promise<{ saved: boolean } | null> {
  const { userId } = await auth();
  if (!userId || !Number.isFinite(postId)) return null;

  try {
    await ensurePersonalizationTables();
    const existing = await turso.execute({
      sql: "SELECT 1 FROM user_saved_posts WHERE user_id = ? AND post_id = ? LIMIT 1",
      args: [userId, postId],
    });

    if (existing.rows.length > 0) {
      await turso.execute({
        sql: "DELETE FROM user_saved_posts WHERE user_id = ? AND post_id = ?",
        args: [userId, postId],
      });
      return { saved: false };
    }

    const post = await turso.execute({
      sql: "SELECT category FROM posts WHERE id = ? LIMIT 1",
      args: [postId],
    });
    if (post.rows.length === 0) return null;

    await turso.execute({
      sql: "INSERT INTO user_saved_posts (user_id, post_id, saved_at) VALUES (?, ?, ?)",
      args: [userId, postId, new Date().toISOString()],
    });
    try {
      await bumpJar(userId, String(post.rows[0].category ?? ""));
    } catch (error) {
      console.error("bumpJar on save failed:", error);
    }
    return { saved: true };
  } catch (error) {
    console.error("toggleBookmark failed:", error);
    return null;
  }
}

// Which of these posts has the current user saved? (Initial button states on
// feed pages — called client-side so ISR pages stay cacheable.)
export async function getSavedIds(postIds: number[]): Promise<number[]> {
  const { userId } = await auth();
  if (!userId || !Array.isArray(postIds) || postIds.length === 0) return [];
  const ids = postIds.filter((n) => Number.isFinite(n)).slice(0, 200);
  if (ids.length === 0) return [];

  try {
    await ensurePersonalizationTables();
    const placeholders = ids.map(() => "?").join(",");
    const result = await turso.execute({
      sql: `SELECT post_id FROM user_saved_posts WHERE user_id = ? AND post_id IN (${placeholders})`,
      args: [userId, ...ids],
    });
    return result.rows.map((row) => Number(row.post_id));
  } catch (error) {
    console.error("getSavedIds failed:", error);
    return [];
  }
}

export async function getSavedPosts(): Promise<SavedPost[]> {
  const { userId } = await auth();
  if (!userId) return [];

  try {
    await ensurePersonalizationTables();
    const result = await turso.execute({
      sql: `SELECT p.id, p.title, p.category, p.source, p.image_url, p.teaser,
                   p.published_at, p.scraped_at, p.link, s.saved_at
            FROM user_saved_posts s
            JOIN posts p ON p.id = s.post_id
            WHERE s.user_id = ?
            ORDER BY s.saved_at DESC
            LIMIT 100`,
      args: [userId],
    });
    return result.rows.map((row) => ({
      id: Number(row.id),
      title: String(row.title ?? ""),
      category: (row.category as string | null) ?? null,
      source: (row.source as string | null) ?? null,
      image_url: (row.image_url as string | null) ?? null,
      teaser: (row.teaser as string | null) ?? null,
      published_at: (row.published_at as string | null) ?? null,
      scraped_at: (row.scraped_at as string | null) ?? null,
      saved_at: String(row.saved_at ?? ""),
      link: (row.link as string | null) ?? null,
    }));
  } catch (error) {
    console.error("getSavedPosts failed:", error);
    return [];
  }
}
```

- [ ] **Step 2: Create `SaveButton`**

```tsx
// web/app/_components/save-button.tsx
'use client';

import { useState } from "react";
import { SignedIn } from "@clerk/nextjs";
import posthog from "posthog-js";
import { toggleBookmark } from "@/app/actions/bookmarks";

// Bookmark toggle for article cards («сочувај написи»). Optimistic; hidden
// when signed out. MUST stop propagation — cards are wrapped in ArticleLink,
// and saving must never navigate.
export function SaveButton({
  postId,
  saved,
  onToggled,
  context,
  category = null,
  source = null,
}: {
  postId: number;
  saved: boolean;
  onToggled?: (saved: boolean) => void;
  context: string;
  category?: string | null;
  source?: string | null;
}) {
  const [isSaved, setIsSaved] = useState(saved);
  const [busy, setBusy] = useState(false);

  const toggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !isSaved;
    setIsSaved(next); // optimistic
    const result = await toggleBookmark(postId);
    if (result === null) {
      setIsSaved(!next); // revert on failure
    } else {
      setIsSaved(result.saved);
      onToggled?.(result.saved);
      posthog.capture("article_save", {
        post_id: postId,
        category,
        source,
        feed: context,
        saved: result.saved,
      });
    }
    setBusy(false);
  };

  return (
    <SignedIn>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={isSaved}
        aria-label={isSaved ? "Отстрани од зачувани" : "Сочувај напис"}
        className={`flex h-9 w-9 items-center justify-center rounded-full border border-line shadow-[3px_3px_0_var(--shadow)] transition-all hover:-translate-y-0.5 ${
          isSaved ? "bg-accent text-black" : "bg-surface/90 text-ink hover:bg-ink hover:text-paper"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 3H7a1 1 0 0 0-1 1v17l6-4 6 4V4a1 1 0 0 0-1-1z" />
        </svg>
      </button>
    </SignedIn>
  );
}
```

- [ ] **Step 3: Wire saved-state + button into `LatestFeed`**

In `web/app/najnovo/latest-feed.tsx` (this serves both `/najnovo` and `/tvoi-vesti`; `/najnovo` is ISR so saved state MUST load client-side):

1. Add imports:
```tsx
import { useUser } from "@clerk/nextjs";
import { SaveButton } from "../_components/save-button";
import { getSavedIds } from "@/app/actions/bookmarks";
```
2. In `LatestFeed`, after the existing state hooks, add:
```tsx
  const { user } = useUser();
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) { setSavedIds(new Set()); return; }
    const ids = posts.map((p) => Number(p.id)).filter(Number.isFinite);
    getSavedIds(ids)
      .then((saved) => setSavedIds(new Set(saved)))
      .catch(() => setSavedIds(new Set()));
  }, [user?.id, posts]);
```
3. Pass the state down: change the card call to
```tsx
          <LatestCard
            key={post.id ?? `${post.title}-${index}`}
            post={post}
            index={index}
            now={now}
            feed={feed}
            saved={savedIds.has(Number(post.id))}
          />
```
and the `LatestCard` signature to
```tsx
const LatestCard = ({ post, index, now, feed, saved }: { post: any; index: number; now: number; feed: ArticleFeed; saved: boolean }) => {
```
4. Render the button below the existing `ShareButton` (which sits at `absolute right-3 top-3 z-20`), inside the same outer `div className="relative h-full"`, immediately after the `<ShareButton ... />` element:
```tsx
      <div className="absolute right-3 top-14 z-20">
        <SaveButton
          key={`${post.id}-${saved}`}
          postId={Number(post.id)}
          saved={saved}
          context={feed}
          category={post?.category ?? null}
          source={post?.source ?? null}
        />
      </div>
```
The `key` includes `saved` deliberately: `SaveButton` seeds `useState(saved)` from props, and the saved-ids fetch arrives after mount — the key change re-mounts just the button with the correct state. Do not add `saved` to the card's own key.

- [ ] **Step 4: Verify in the dev server**

Run (from `web/`): `npm run dev`, then:
1. Signed out on `/najnovo`: no save buttons; page renders as before.
2. Signed in on `/najnovo`: bookmark icon appears under each card's share button; clicking it toggles yellow fill and does NOT navigate; reload → state persists (loads via `getSavedIds`).
3. Same behavior on `/tvoi-vesti`.
4. Saving a Tech article bumps the Tech jar: re-run the Task 5 Step 4 probe query — Tech weight increased by ~1.
5. PostHog debug (optional): `article_save` events appear in the network tab.

- [ ] **Step 5: Typecheck + lint, then commit**

Run (from `web/`): `npx tsc --noEmit && npx eslint app/actions/bookmarks.ts app/_components/save-button.tsx app/najnovo/latest-feed.tsx`

```bash
git add web/app/actions/bookmarks.ts web/app/_components/save-button.tsx web/app/najnovo/latest-feed.tsx
git commit -m "feat(web): article bookmarking with jar signal + save buttons on feeds

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: «Профил» page — account, vibe, history, saved

**Files:**
- Create: `web/app/profil/page.tsx`
- Create: `web/app/profil/saved-list.tsx`
- Modify: `web/app/_components/navigation.tsx` (signed-in drawer block links to `/profil`)

**Interfaces:**
- Consumes: `auth`; `UserProfile` from `@clerk/nextjs`; `getJars` (Task 3); `profileShares` (Task 2); `VibeProfile` (Task 6); `getSavedPosts`, `toggleBookmark`, `SavedPost` (Task 7); `ArticleLink` (existing); `turso`.
- Produces: the `/profil` route; no exports consumed elsewhere.

- [ ] **Step 1: Create the saved-list client component**

```tsx
// web/app/profil/saved-list.tsx
'use client';

import { useState } from "react";
import { ArticleLink } from "../_components/article-link";
import { toggleBookmark, type SavedPost } from "@/app/actions/bookmarks";
import { CATEGORY_LABELS } from "@/lib/categories";

// «Зачувано»: the user's bookmarks with inline unsave. Client component so
// rows can be removed optimistically.
export function SavedList({ initial }: { initial: SavedPost[] }) {
  const [items, setItems] = useState(initial);

  const unsave = async (postId: number) => {
    const removed = items.find((p) => p.id === postId);
    setItems((prev) => prev.filter((p) => p.id !== postId)); // optimistic
    const result = await toggleBookmark(postId);
    // toggleBookmark returns { saved: false } on successful unsave; anything
    // else means it failed (null) or unexpectedly re-saved — restore the row.
    if (removed && (result === null || result.saved)) {
      setItems((prev) => [removed, ...prev]);
    }
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-neutral-500 border-2 border-dashed border-line-soft rounded-lg bg-surface-2 px-6 py-10 text-center">
        Уште немаш зачувани написи. Кликни на ознаката на било која картичка.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-line-soft border border-line rounded-xl bg-surface shadow-[6px_6px_0_var(--shadow)]">
      {items.map((post) => (
        <li key={post.id} className="flex items-center gap-4 p-4">
          <div className="min-w-0 flex-1">
            <ArticleLink post={post} feed="profile" className="group block">
              <span className="block truncate font-serif text-base font-bold text-ink group-hover:underline">
                {post.title}
              </span>
            </ArticleLink>
            <span className="mt-1 block text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
              {(post.category && CATEGORY_LABELS[post.category as keyof typeof CATEGORY_LABELS]) ?? post.category ?? "Вести"}
              {post.source ? ` · ${post.source}` : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={() => unsave(post.id)}
            aria-label="Отстрани од зачувани"
            className="shrink-0 rounded-full border border-line bg-surface px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-ink hover:text-paper"
          >
            Отстрани
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Create the profile page**

```tsx
// web/app/profil/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, UserProfile } from "@clerk/nextjs";
import { turso } from "@/lib/turso";
import { profileShares } from "@/lib/personalization";
import { getJars, ensurePersonalizationTables } from "@/lib/personalization-db";
import { getSavedPosts } from "@/app/actions/bookmarks";
import { CATEGORY_LABELS } from "@/lib/categories";
import { CategoryNav, NavBar } from "../_components/navigation";
import { VibeProfile } from "../_components/vibe-profile";
import { ArticleLink } from "../_components/article-link";
import { SavedList } from "./saved-list";

// Per-user page: never cached/ISR (Global Constraints). Private — shows the
// signed-in user their own data only.
export const dynamic = "force-dynamic";

const NavFallback = () => (
  <div className="sticky top-0 z-40 border-b border-line bg-paper py-3 px-4 md:px-8">
    <div className="w-full max-w-[1400px] mx-auto h-11" />
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-serif text-2xl font-black text-ink mb-4">{children}</h2>
);

const SectionError = ({ label }: { label: string }) => (
  <p className="text-sm text-neutral-500 border-2 border-dashed border-line-soft rounded-lg bg-surface-2 px-6 py-8 text-center">
    {label} не може да се вчита во моментот. Пробај повторно подоцна.
  </p>
);

async function getHistory(userId: string) {
  await ensurePersonalizationTables();
  const result = await turso.execute({
    sql: `SELECT p.*, c.clicked_at
          FROM user_clicks c
          JOIN posts p ON p.id = c.post_id
          WHERE c.user_id = ?
          ORDER BY c.clicked_at DESC
          LIMIT 20`,
    args: [userId],
  });
  return JSON.parse(JSON.stringify(result.rows)) as any[];
}

export default async function ProfilePage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <main className="min-h-screen bg-paper text-ink pb-20">
        <Suspense fallback={<NavFallback />}>
          <NavBar />
        </Suspense>
        <CategoryNav activeCategory={null} />
        <div className="max-w-xl mx-auto px-5 pt-16 text-center border-2 border-dashed border-line-soft rounded-xl bg-surface-2 py-16 mt-8">
          <h1 className="font-serif text-3xl font-black text-ink mb-3">Профил</h1>
          <p className="text-sm text-neutral-600 mb-6">Најави се за да го видиш твојот профил.</p>
          <SignInButton mode="modal">
            <button className="inline-flex items-center gap-3 border border-line bg-accent text-black px-6 py-3 text-[11px] font-black uppercase tracking-[0.3em] shadow-[6px_6px_0_var(--shadow)] transition-all hover:-translate-y-0.5">
              Најава <span aria-hidden>→</span>
            </button>
          </SignInButton>
        </div>
      </main>
    );
  }

  // Each section degrades independently (spec §9.3).
  const [jars, history, saved] = await Promise.all([
    getJars(userId).catch((err) => { console.error("profil jars:", err); return null; }),
    getHistory(userId).catch((err) => { console.error("profil history:", err); return null; }),
    getSavedPosts().catch((err) => { console.error("profil saved:", err); return null; }),
  ]);

  const nowIso = new Date().toISOString();

  return (
    <main className="min-h-screen bg-paper text-ink pb-20">
      <Suspense fallback={<NavFallback />}>
        <NavBar />
      </Suspense>
      <CategoryNav activeCategory={null} />

      <div className="max-w-3xl mx-auto px-5 md:px-8 pt-8 flex flex-col gap-10">
        <header className="pb-6 border-b border-line">
          <h1 className="text-center font-serif text-4xl md:text-5xl font-black leading-tight">Профил</h1>
        </header>

        <section>
          <SectionTitle>Твојот вајб</SectionTitle>
          {jars === null ? (
            <SectionError label="«Твојот вајб»" />
          ) : jars.length === 0 ? (
            <p className="text-sm text-neutral-500 border-2 border-dashed border-line-soft rounded-lg bg-surface-2 px-6 py-8 text-center">
              Уште ги немаш избрано вибрациите — почни на страницата «Твои Вести».
            </p>
          ) : (
            <VibeProfile shares={profileShares(jars, nowIso)} />
          )}
        </section>

        <section>
          <SectionTitle>Прочитано</SectionTitle>
          {history === null ? (
            <SectionError label="Историјата" />
          ) : history.length === 0 ? (
            <p className="text-sm text-neutral-500 border-2 border-dashed border-line-soft rounded-lg bg-surface-2 px-6 py-8 text-center">
              Уште нема прочитани написи.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line-soft border border-line rounded-xl bg-surface shadow-[6px_6px_0_var(--shadow)]">
              {history.map((post: any) => (
                <li key={`${post.id}-${post.clicked_at}`} className="p-4">
                  <ArticleLink post={post} feed="profile" className="group block">
                    <span className="block truncate font-serif text-base font-bold text-ink group-hover:underline">
                      {post.title}
                    </span>
                  </ArticleLink>
                  <span className="mt-1 block text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
                    {(post.category && (CATEGORY_LABELS as Record<string, string>)[post.category]) ?? post.category ?? "Вести"}
                    {post.source ? ` · ${post.source}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle>Зачувано</SectionTitle>
          {saved === null ? <SectionError label="Зачуваното" /> : <SavedList initial={saved} />}
        </section>

        <section>
          <SectionTitle>Сметка</SectionTitle>
          <div className="border border-line rounded-xl bg-surface shadow-[6px_6px_0_var(--shadow)] p-2 md:p-4 overflow-x-auto">
            <UserProfile
              routing="hash"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full shadow-none border-0",
                },
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Link the nav drawer's signed-in block to `/profil`**

In `web/app/_components/navigation.tsx`, inside the `<SignedIn>` block, the current text block is:

```tsx
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink leading-tight">Vibes профил</p>
                    <p className="text-xs text-neutral-600">Подесувања</p>
                  </div>
```
Replace with a link (keep `UserButton` beside it untouched):
```tsx
                  <Link href="/profil" onClick={() => setIsOpen(false)} className="flex-1 group">
                    <p className="text-sm font-semibold text-ink leading-tight group-hover:underline">Vibes профил</p>
                    <p className="text-xs text-neutral-600">Профил · Подесувања</p>
                  </Link>
```

- [ ] **Step 4: Verify in the dev server**

Run (from `web/`): `npm run dev`, then:
1. Signed out → `/profil` shows the sign-in prompt.
2. Signed in → all four sections render: vibe bars match `/tvoi-vesti`; «Прочитано» shows articles you clicked in Tasks 5–7 testing; «Зачувано» lists what you saved (unsave removes a row without navigation); «Сметка» shows the styled Clerk panel and its tabs work (hash routing — no 404s).
3. Nav drawer «Vibes профил» block navigates to `/profil`.

- [ ] **Step 5: Typecheck + lint, then commit**

Run (from `web/`): `npx tsc --noEmit && npx eslint app/profil app/_components/navigation.tsx`

```bash
git add web/app/profil web/app/_components/navigation.tsx
git commit -m "feat(web): «Профил» page — account, vibe profile, reading history, saved articles

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Full verification sweep + preview deploy

**Files:**
- No new files. Fixes only if checks fail.

**Interfaces:**
- Consumes: everything above.
- Produces: a verified, deployable branch.

- [ ] **Step 1: Run both check scripts**

Run (from `web/`):
```bash
npx tsx scripts/personalization-check.ts
npx tsx scripts/personalization-db-check.ts
```
Expected: both end with `ALL ... CHECKS PASSED`, exit 0.

- [ ] **Step 2: Static checks over the whole app**

Run (from `web/`): `npx tsc --noEmit && npx eslint .`
Expected: zero NEW errors relative to the branch point (pre-existing issues, if any, are out of scope — do not fix unrelated files).

- [ ] **Step 3: Full manual E2E checklist** (from spec §7 + §9.3, `npm run dev`)

1. Signed out: `/tvoi-vesti` pitch, `/profil` prompt, `/najnovo` unchanged, `/go/<id>` redirects fast, no save buttons anywhere.
2. Sign in fresh (or wipe your rows: `DELETE FROM user_category_prefs WHERE user_id='<you>'` etc.): wizard appears on `/tvoi-vesti`; save Технологија + Спорт.
3. DB shows 6 jar rows: picked ones weight 5, others 1.
4. Click 3 Culture articles → `user_clicks` rows exist; Culture jar ≈ 4.0; Culture stories climb on `/tvoi-vesti` reload; re-clicking the same article within 24h does not add points.
5. Vibe bars on `/tvoi-vesti` and `/profil` agree and roughly match jar shares.
6. «Смени ги вибрациите» → wizard pre-filled → save → jars reseeded (Culture learning gone).
7. Save + unsave articles from `/najnovo` and `/tvoi-vesti`; state survives reload; «Зачувано» on `/profil` matches; saving bumped the jar.
8. Blog post open (signed in) → Blog jar bumped once; refresh does not double-count.
9. Homepage `/` and `/all` completely unchanged (no save buttons, same layout, ISR intact — check `x-nextjs-cache` or just confirm no auth-dependent content).

- [ ] **Step 4: Preview deploy + smoke test**

Run (from `web/`): `npm run preview` — smoke-test the personalized flow against the local Workers runtime (this catches OpenNext/Workers-specific issues ISR/dynamic pages sometimes hit).
Then push the branch: `git push -u origin feature/za-tebe` → visit `https://feature-za-tebe.macedonian-vibe-news.balinda-centar.workers.dev` and repeat checklist items 1–2 quickly.

- [ ] **Step 5: Final commit (if any fixes were made) and stop**

Do not merge. Report checklist results to the user for the merge decision (use superpowers:finishing-a-development-branch).
