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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any[],
  [],
  NOW,
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
checkTrue("no jars → newest first", (noPrefRanked[0] as any).id === "new");

// --- rankPosts personalizes (worked example end-to-end) ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ranked = rankPosts([culturePost, techPost] as any[], jars, NOW);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
checkTrue("rankPosts puts Tech first for Tech-picker", (ranked[0] as any).category === "Tech");
checkTrue("rankPosts keeps Culture in the list (boost, don't hide)", ranked.length === 2);

// --- profile bars (spec §2.4): shares sum to 1, picked Tech dominates ---
const shares = profileShares(jars, NOW);
check("shares sum to 1", shares.reduce((s, x) => s + x.share, 0), 1, 1e-9);
check("Tech share = 5/14", shares.find(s => s.category === "Tech")!.share, 5 / 14, 1e-9);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
