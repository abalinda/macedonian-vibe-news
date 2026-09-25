import { headers } from "next/headers";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admins";
import { turso } from "@/lib/turso";

export type BlogReview = { title: string; teaser: string; content_html: string; notes: string[] };

export type BlogDraft = {
  id: number;
  postId: number | null;
  title: string;
  teaser: string;
  contentHtml: string;
  coverUrl: string;
  author: string;
  reviewStatus: "none" | "pending" | "running" | "done" | "failed";
  review: BlogReview | null;
  reviewError: string | null;
  reviewRequestedAt: string | null;
  updatedAt: string;
};

/** Admin = Clerk email on the allow-list, or a localhost request (same rule as /admin). */
export async function getAdmin(): Promise<{ email: string | null; name: string } | null> {
  const host = (await headers()).get("host") || "";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const user = await currentUser().catch(() => null);
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || null;
  if (!isLocal && !isAdminEmail(email)) return null;
  return { email, name: user?.fullName || user?.username || user?.firstName || email || "" };
}

export const forbidden = () => NextResponse.json({ error: "Неовластен пристап." }, { status: 403 });

// ponytail: per-isolate memo; the DDL is idempotent so a cold start just re-runs it.
let ensured: Promise<unknown> | null = null;
export function ensureBlogDraftsTable() {
  ensured ??= turso
    .batch(
      [
        `CREATE TABLE IF NOT EXISTS blog_drafts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER,
          title TEXT NOT NULL DEFAULT '',
          teaser TEXT NOT NULL DEFAULT '',
          content_html TEXT NOT NULL DEFAULT '',
          cover_url TEXT NOT NULL DEFAULT '',
          author TEXT NOT NULL DEFAULT '',
          review_status TEXT NOT NULL DEFAULT 'none',
          review_json TEXT,
          review_error TEXT,
          review_requested_at TEXT,
          review_started_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
        // One edit-draft per published post.
        `CREATE UNIQUE INDEX IF NOT EXISTS blog_drafts_post_id ON blog_drafts(post_id) WHERE post_id IS NOT NULL`,
      ],
      "write"
    )
    .catch((err) => {
      ensured = null;
      throw err;
    });
  return ensured;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toDraft(row: any): BlogDraft {
  let review: BlogReview | null = null;
  try {
    review = row.review_json ? JSON.parse(String(row.review_json)) : null;
  } catch {
    review = null;
  }
  return {
    id: Number(row.id),
    postId: row.post_id == null ? null : Number(row.post_id),
    title: String(row.title ?? ""),
    teaser: String(row.teaser ?? ""),
    contentHtml: String(row.content_html ?? ""),
    coverUrl: String(row.cover_url ?? ""),
    author: String(row.author ?? ""),
    reviewStatus: (row.review_status as BlogDraft["reviewStatus"]) || "none",
    review,
    reviewError: row.review_error ? String(row.review_error) : null,
    reviewRequestedAt: row.review_requested_at ? String(row.review_requested_at) : null,
    updatedAt: String(row.updated_at ?? ""),
  };
}

export async function getDraft(id: number) {
  await ensureBlogDraftsTable();
  const rs = await turso.execute({ sql: "SELECT * FROM blog_drafts WHERE id = ?", args: [id] });
  return rs.rows[0] ? toDraft(rs.rows[0]) : null;
}
