/**
 * Formats an ISO-ish timestamp into a short Macedonian relative-time label.
 * Mirrors the freshness language used across the latest feed and the homepage.
 */
export const formatRelativeTime = (value?: string | null, nowValue?: number): string => {
  if (!value) return "Неодамна";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Неодамна";

  const now = nowValue ?? Date.now();
  const diffMinutes = Math.max(0, Math.floor((now - timestamp) / (1000 * 60)));

  if (diffMinutes < 15) return "Тазе";
  if (diffMinutes < 60) return `пред ${diffMinutes} минути`;
  if (diffMinutes < 120) return "пред 1 час";

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 48) return `пред ${diffHours} часа`;

  const diffDays = Math.floor(diffHours / 24);
  return `пред ${diffDays} дена`;
};

/**
 * Picks the best available timestamp for a post (scraped_at, falling back to
 * published_at) and returns its relative-time label.
 */
export const getRelativePostTime = (
  post: { scraped_at?: string | null; published_at?: string | null } | null | undefined,
  nowValue?: number,
): string => {
  const primary = formatRelativeTime(post?.scraped_at, nowValue);
  if (primary !== "Неодамна") return primary;
  return formatRelativeTime(post?.published_at, nowValue);
};
