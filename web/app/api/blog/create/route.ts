import { NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { currentUser } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admins";
import { normalizeImageUrl } from "@/lib/images";
import { sanitizeRichText, stripHtml } from "@/lib/rich-text";

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
  const {
    title,
    teaser = "",
    content = "",
    imageUrl = null,
    author = "Blog",
    link,
  } = body || {};

  const trimmedTitle = typeof title === "string" ? title.trim() : "";
  const teaserText = typeof teaser === "string" ? teaser.trim() : "";
  const normalizedContent = sanitizeRichText(typeof content === "string" ? content : "");
  const contentPlainText = stripHtml(normalizedContent);
  const normalizedImage = normalizeImageUrl(typeof imageUrl === "string" ? imageUrl : "");

  if (!trimmedTitle || !contentPlainText) {
    return NextResponse.json(
      { error: "Недостигаат задолжителни полиња: наслов и содржина." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const summary = teaserText || contentPlainText.slice(0, 240);
  const slugBase =
    (trimmedTitle || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "blog";
  const uniqueSuffix = Math.random().toString(36).slice(2, 8);
  const internalLink =
    (typeof link === "string" && link.trim()) || `blog-${slugBase}-${uniqueSuffix}`;

  // Prefer inserting content column; fallback without it if the column is missing.
  const insertWithContent = {
    sql: `
      INSERT INTO posts (title, link, source, category, teaser, summary, content, image_url, published_at, scraped_at)
      VALUES (?, ?, ?, 'Blog', ?, ?, ?, ?, ?, ?)
    `,
    args: [
      trimmedTitle,
      internalLink,
      (typeof author === "string" && author.trim()) || "Blog",
      teaserText,
      summary,
      normalizedContent,
      normalizedImage || null,
      now,
      now,
    ],
  };

  const insertWithoutContent = {
    sql: `
      INSERT INTO posts (title, link, source, category, teaser, summary, image_url, published_at, scraped_at)
      VALUES (?, ?, ?, 'Blog', ?, ?, ?, ?, ?)
    `,
    args: [
      trimmedTitle,
      internalLink,
      (typeof author === "string" && author.trim()) || "Blog",
      teaserText,
      summary,
      normalizedImage || null,
      now,
      now,
    ],
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
