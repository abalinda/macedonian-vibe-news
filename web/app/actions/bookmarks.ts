// web/app/actions/bookmarks.ts
'use server';

import { resolveUserId } from "@/lib/dev-user";
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
  const userId = await resolveUserId();
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
  const userId = await resolveUserId();
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
  const userId = await resolveUserId();
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
