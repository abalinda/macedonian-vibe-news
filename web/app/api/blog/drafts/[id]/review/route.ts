import { NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { forbidden, getAdmin } from "@/lib/blog-admin";

export const dynamic = "force-dynamic";

// Queue a Claude review. The scraper box polls blog_drafts for 'pending' rows
// (scraper/blog_reviewer.py) and writes review_json back; the editor polls GET /drafts/[id].
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return forbidden();
  const id = Number((await params).id);
  const now = new Date().toISOString();

  const rs = await turso.execute({
    sql: `UPDATE blog_drafts
          SET review_status = 'pending', review_json = NULL, review_error = NULL, review_requested_at = ?
          WHERE id = ? AND review_status NOT IN ('pending', 'running')`,
    args: [now, id],
  });
  // rowsAffected 0 = already queued/running (or missing) — both fine for the caller.
  return NextResponse.json({ ok: true, queued: rs.rowsAffected > 0 });
}
