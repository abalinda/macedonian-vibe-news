import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { turso } from "@/lib/turso";
import { forbidden, getAdmin, getDraft } from "@/lib/blog-admin";
import { normalizeImageUrl } from "@/lib/images";
import { sanitizeRichText, stripHtml } from "@/lib/rich-text";

export const dynamic = "force-dynamic";

// Draft -> posts. New drafts INSERT a Blog post; edit-drafts UPDATE their post in place
// (same id/link, so shares and click counts survive). The draft is deleted in the same batch.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return forbidden();
  const draft = await getDraft(Number((await params).id));
  if (!draft) return NextResponse.json({ error: "Нема нацрт." }, { status: 404 });

  const title = draft.title.trim();
  const teaser = draft.teaser.trim();
  const content = sanitizeRichText(draft.contentHtml);
  const plain = stripHtml(content);
  if (!title || !plain) {
    return NextResponse.json({ error: "Наслов и содржина се задолжителни." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const summary = teaser || plain.slice(0, 240);
  const image = normalizeImageUrl(draft.coverUrl) || null;
  const author = draft.author.trim() || "Blog";

  let postId: number;
  if (draft.postId) {
    const [update] = await turso.batch(
      [
        {
          sql: `UPDATE posts SET title = ?, teaser = ?, summary = ?, content = ?, image_url = ?, source = ?, updated_at = ?
                WHERE id = ? AND category = 'Blog'`,
          args: [title, teaser, summary, content, image, author, now, draft.postId],
        },
        // Keep the draft if its post vanished, so the admin's work isn't lost.
        {
          sql: "DELETE FROM blog_drafts WHERE id = ? AND EXISTS (SELECT 1 FROM posts WHERE id = ? AND category = 'Blog')",
          args: [draft.id, draft.postId],
        },
      ],
      "write"
    );
    if (!update.rowsAffected) {
      return NextResponse.json({ error: "Оригиналната објава повеќе не постои." }, { status: 404 });
    }
    postId = draft.postId;
  } else {
    const slug =
      title
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "blog";
    const link = `blog-${slug}-${Math.random().toString(36).slice(2, 8)}`;
    const [insert] = await turso.batch(
      [
        {
          sql: `INSERT INTO posts (title, link, source, category, teaser, summary, content, image_url, published_at, scraped_at, updated_at)
                VALUES (?, ?, ?, 'Blog', ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
          args: [title, link, author, teaser, summary, content, image, now, now, now],
        },
        { sql: "DELETE FROM blog_drafts WHERE id = ?", args: [draft.id] },
      ],
      "write"
    );
    postId = Number(insert.rows[0].id);
  }

  revalidatePath(`/blog/${postId}`);
  revalidatePath("/");
  return NextResponse.json({ postId });
}
