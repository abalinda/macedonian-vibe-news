import { NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { ensureBlogDraftsTable, forbidden, getAdmin, toDraft } from "@/lib/blog-admin";

export const dynamic = "force-dynamic";

// Admin list: open drafts + published blog posts.
export async function GET() {
  if (!(await getAdmin())) return forbidden();
  await ensureBlogDraftsTable();

  const [drafts, posts] = await turso.batch(
    [
      "SELECT * FROM blog_drafts ORDER BY updated_at DESC",
      "SELECT id, title, published_at, updated_at, image_url FROM posts WHERE category = 'Blog' ORDER BY published_at DESC LIMIT 200",
    ],
    "read"
  );

  return NextResponse.json({
    drafts: drafts.rows.map(toDraft),
    posts: posts.rows.map((r) => ({
      id: Number(r.id),
      title: String(r.title ?? ""),
      publishedAt: r.published_at ? String(r.published_at) : null,
      imageUrl: r.image_url ? String(r.image_url) : "",
    })),
  });
}

// Create a new draft, or (with {postId}) open/create the edit-draft of a published post.
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return forbidden();
  await ensureBlogDraftsTable();

  const body = await request.json().catch(() => ({}));
  const postId = Number(body?.postId) || null;
  const now = new Date().toISOString();

  if (postId) {
    const existing = await turso.execute({ sql: "SELECT id FROM blog_drafts WHERE post_id = ?", args: [postId] });
    if (existing.rows[0]) return NextResponse.json({ id: Number(existing.rows[0].id) });

    const post = await turso.execute({
      sql: "SELECT title, teaser, summary, content, image_url, source FROM posts WHERE id = ? AND category = 'Blog'",
      args: [postId],
    });
    const p = post.rows[0];
    if (!p) return NextResponse.json({ error: "Објавата не постои." }, { status: 404 });

    const rs = await turso.execute({
      sql: `INSERT INTO blog_drafts (post_id, title, teaser, content_html, cover_url, author, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      args: [
        postId,
        String(p.title ?? ""),
        String(p.teaser ?? ""),
        String(p.content || p.summary || ""),
        String(p.image_url ?? ""),
        String(p.source ?? ""),
        now,
        now,
      ],
    });
    return NextResponse.json({ id: Number(rs.rows[0].id) });
  }

  const rs = await turso.execute({
    sql: "INSERT INTO blog_drafts (author, created_at, updated_at) VALUES (?, ?, ?) RETURNING id",
    args: [admin.name, now, now],
  });
  return NextResponse.json({ id: Number(rs.rows[0].id) });
}
