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
  const { title, teaser = "", content = "", imageUrl = null, author = "Blog", link } = body || {};

  if (!title || !content || !plainText(content)) {
    return NextResponse.json(
      { error: "Недостигаат задолжителни полиња: наслов и содржина." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const summary = teaser || plainText(content).slice(0, 240);
  const slugBase =
    (title || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "blog";
  const uniqueSuffix = Math.random().toString(36).slice(2, 8);
  const internalLink = link || `blog-${slugBase}-${uniqueSuffix}`;

  // Prefer inserting content column; fallback without it if the column is missing.
  const insertWithContent = {
    sql: `
      INSERT INTO posts (title, link, source, category, teaser, summary, content, image_url, published_at, scraped_at)
      VALUES (?, ?, ?, 'Blog', ?, ?, ?, ?, ?, ?)
    `,
    args: [
      title,
      internalLink,
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
    args: [title, internalLink, author || "Blog", teaser, summary, imageUrl, now, now],
  };

  try {
    const result = await turso.execute(insertWithContent);
    const id = Number(result.lastInsertRowid);
    return NextResponse.json({ id, ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (/no such column: content/i.test(message)) {
      const result = await turso.execute(insertWithoutContent);
      const id = Number(result.lastInsertRowid);
      return NextResponse.json({ id, ok: true });
    }
    console.error("Blog create failed:", message);
    const details = /constraint failed|unique/i.test(message)
      ? "Дупликат запис (проверете да ли веќе постои објава со ист линк/ID)."
      : message;
    return NextResponse.json(
      { error: "Неуспешно креирање.", details },
      { status: 500 }
    );
  }
}
