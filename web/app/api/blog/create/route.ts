import { NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { currentUser } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admins";

const plainText = (html: string) => html.replace(/<[^>]*>/g, "").trim();

export async function POST(request: Request) {
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    null;

  if (!email || !isAdminEmail(email)) {
    return NextResponse.json({ error: "Неовластен пристап." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { title, teaser = "", content = "", imageUrl = null, author = "Blog" } = body || {};

  if (!title || !content || !plainText(content)) {
    return NextResponse.json(
      { error: "Недостигаат задолжителни полиња: наслов и содржина." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const summary = teaser || plainText(content).slice(0, 240);

  // Prefer inserting content column; fallback without it if the column is missing.
  const insertWithContent = {
    sql: `
      INSERT INTO posts (title, link, source, category, teaser, summary, content, image_url, published_at, scraped_at)
      VALUES (?, ?, ?, 'Blog', ?, ?, ?, ?, ?, ?)
    `,
    args: [
      title,
      "",
      author || "Blog",
      teaser,
      summary,
      content,
      imageUrl,
      now,
      now,
    ],
  };

  const insertWithoutContent = {
    sql: `
      INSERT INTO posts (title, link, source, category, teaser, summary, image_url, published_at, scraped_at)
      VALUES (?, ?, ?, 'Blog', ?, ?, ?, ?, ?)
    `,
    args: [title, "", author || "Blog", teaser, summary, imageUrl, now, now],
  };

  try {
    const result = await turso.execute(insertWithContent);
    const id = Number(result.lastInsertRowid);
    return NextResponse.json({ id, ok: true });
  } catch (err: any) {
    const message = String(err?.message || err);
    if (/no such column: content/i.test(message)) {
      const result = await turso.execute(insertWithoutContent);
      const id = Number(result.lastInsertRowid);
      return NextResponse.json({ id, ok: true });
    }
    console.error("Blog create failed:", message);
    return NextResponse.json({ error: "Неуспешно креирање." }, { status: 500 });
  }
}
