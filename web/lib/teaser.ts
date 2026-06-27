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
 * Shared teaser type recipe — UPPERCASE mono, muted, with restrained tracking.
 * Cyrillic at small sizes loses legibility past ~0.12em, so tracking is capped
 * here (down from the old 0.15–0.3em spread). `text-muted` is theme-aware, so
 * teasers no longer use fixed dark neutrals that vanished in dark mode.
 * Compose with a size + line-clamp per context.
 */
export const TEASER_CLASS = "font-mono uppercase tracking-[0.12em] leading-relaxed text-muted";
