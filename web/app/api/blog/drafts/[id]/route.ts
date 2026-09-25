import { NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { forbidden, getAdmin, getDraft } from "@/lib/blog-admin";
import { sanitizeRichText } from "@/lib/rich-text";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  if (!(await getAdmin())) return forbidden();
  const draft = await getDraft(Number((await params).id));
  return draft ? NextResponse.json(draft) : NextResponse.json({ error: "Нема нацрт." }, { status: 404 });
}

// Autosave. Only the fields sent are updated; `clearReview` drops a handled suggestion.
export async function PUT(request: Request, { params }: Ctx) {
  if (!(await getAdmin())) return forbidden();
  const id = Number((await params).id);
  const body = await request.json().catch(() => ({}));

  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  const text = (key: string, column: string, clean = (v: string) => v) => {
    if (typeof body?.[key] === "string") {
      sets.push(`${column} = ?`);
      args.push(clean(body[key]));
    }
  };
  text("title", "title");
  text("teaser", "teaser");
  text("author", "author");
  text("coverUrl", "cover_url", (v) => v.trim());
  text("contentHtml", "content_html", sanitizeRichText);
  if (body?.clearReview) {
    sets.push("review_status = 'none'", "review_json = NULL", "review_error = NULL");
  }
  sets.push("updated_at = ?");
  args.push(new Date().toISOString(), id);

  const rs = await turso.execute({ sql: `UPDATE blog_drafts SET ${sets.join(", ")} WHERE id = ?`, args });
  if (!rs.rowsAffected) return NextResponse.json({ error: "Нема нацрт." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// Discard a draft (never touches the published post).
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await getAdmin())) return forbidden();
  await turso.execute({ sql: "DELETE FROM blog_drafts WHERE id = ?", args: [Number((await params).id)] });
  return NextResponse.json({ ok: true });
}
