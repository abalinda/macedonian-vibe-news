// Shared teaser helpers. Previously this logic was copy-pasted inline in
// app/page.tsx, app/najnovo/latest-feed.tsx and app/all/stories-list.tsx with a
// drifting type recipe. Keep it here so the teaser reads and looks the same
// everywhere. See DESIGN_SYSTEM.md §4.

type TeaserSource = { teaser?: string | null; summary?: string | null };

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "");

/**
 * Canonical teaser text: prefer the curated teaser, else a trimmed plain-text
 * summary. Always UPPERCASE — the brand's mono teaser is force-uppercased.
 */
export function getTeaserText(post: TeaserSource | null | undefined): string {
  const rawTeaser = post?.teaser?.trim();
  if (rawTeaser) return rawTeaser.toUpperCase();

  const summaryFallback = post?.summary ? stripHtml(post.summary).substring(0, 140).trim() : "";
  return summaryFallback ? summaryFallback.toUpperCase() : "";
}

/**
 * Editorial standfirst (deck) text for the PRIMARY tier (the hero) — the curated
 * lead line in its natural case, NOT force-uppercased. Presented in the serif
 * `DECK_CLASS`, it reads as a magazine standfirst and visually separates the
 * primary story from the mono-teaser cards (see DESIGN_SYSTEM.md §4 — density
 * tiers). Falls back to a trimmed plain-text summary.
 */
export function getStandfirstText(post: TeaserSource | null | undefined): string {
  const rawTeaser = post?.teaser?.trim();
  if (rawTeaser) return rawTeaser;

  return post?.summary ? stripHtml(post.summary).substring(0, 180).trim() : "";
}

/**
 * Shared teaser type recipe — UPPERCASE mono, muted, with restrained tracking.
 * Cyrillic at small sizes loses legibility past ~0.12em, so tracking is capped
 * here (down from the old 0.15–0.3em spread). `text-muted` is theme-aware, so
 * teasers no longer use fixed dark neutrals that vanished in dark mode.
 * Compose with a size + line-clamp per context.
 */
export const TEASER_CLASS = "font-mono uppercase tracking-[0.12em] leading-relaxed text-muted";

/**
 * The "label voice" — mono UPPERCASE, the single recipe for ALL chrome labels
 * (eyebrows/kickers, source badges, section ticks, signpost labels). Tracking
 * is intentionally NOT baked in: short labels can take wider tracking
 * (0.2–0.3em) while denser Cyrillic stays tighter — set it per context so the
 * utilities never conflict. See DESIGN_SYSTEM.md §5.
 */
export const KICKER_CLASS = "font-mono uppercase text-muted";

/**
 * The editorial standfirst/deck recipe — the serif display face in italic, used
 * for the hero's lead line (primary tier only). Compose with a size per context.
 */
export const DECK_CLASS = "font-serif italic leading-snug text-ink/85";
