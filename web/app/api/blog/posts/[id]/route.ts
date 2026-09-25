import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { turso } from "@/lib/turso";
import { ensureBlogDraftsTable, forbidden, getAdmin } from "@/lib/blog-admin";

export const dynamic = "force-dynamic";

// Delete a published Blog post plus everything that points at it.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return forbidden();
  await ensureBlogDraftsTable();
  const id = Number((await params).id);

  // Guard first: the cleanup statements below must never run for a non-Blog (news) post id.
  const exists = await turso.execute({ sql: "SELECT 1 FROM posts WHERE id = ? AND category = 'Blog'", args: [id] });
  if (!exists.rows.length) return NextResponse.json({ error: "Објавата не постои." }, { status: 404 });

  await turso.batch(
    [
      { sql: "DELETE FROM posts WHERE id = ? AND category = 'Blog'", args: [id] },
      { sql: "UPDATE featured_slots SET post_id = NULL WHERE post_id = ?", args: [id] },
      { sql: "DELETE FROM user_saved_posts WHERE post_id = ?", args: [id] },
      { sql: "DELETE FROM user_clicks WHERE post_id = ?", args: [id] },
      { sql: "DELETE FROM blog_drafts WHERE post_id = ?", args: [id] },
    ],
    "write"
  );
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
