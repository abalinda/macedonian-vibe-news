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
