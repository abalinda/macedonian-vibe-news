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
