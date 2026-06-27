import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { turso } from "@/lib/turso";
import { isAdminEmail } from "@/lib/admins";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

const BASE_SLOT_SELECT = `
  SELECT
    fs.slot_id            AS slot_id,
    fs.label              AS slot_label,
    fs.post_id            AS featured_post_id,
    fs.locked_until       AS locked_until,
    fs.updated_at         AS featured_updated_at,
    fs.manual_override    AS manual_override,
    COALESCE(fs.admin_choice, 0) AS admin_choice,
    p.id                  AS post_id,
    p.title               AS post_title,
    p.source              AS post_source,
    p.category            AS post_category,
    p.teaser              AS post_teaser,
    p.summary             AS post_summary,
    p.image_url           AS post_image_url,
    p.published_at        AS post_published_at,
    p.link                AS post_link
  FROM featured_slots fs
  LEFT JOIN posts p ON p.id = fs.post_id
`;

const mapSlotRow = (row: Record<string, unknown>) => {
  const toBool = (value: unknown) => Boolean(Number(value ?? 0));

  return {
    slotId: row.slot_id as string,
    label: (row.slot_label as string) || "",
    postId: (row.featured_post_id as number | null) ?? null,
    lockedUntil: (row.locked_until as string | null) ?? null,
    updatedAt: (row.featured_updated_at as string | null) ?? null,
    manualOverride: toBool(row.manual_override),
    adminChoice: toBool(row.admin_choice),
    post: row.post_id
      ? {
          id: row.post_id as number,
          title: (row.post_title as string) || "",
          source: (row.post_source as string) || "",
          category: (row.post_category as string | null) ?? null,
          teaser: (row.post_teaser as string | null) ?? null,
          summary: (row.post_summary as string | null) ?? null,
          image_url: (row.post_image_url as string | null) ?? null,
          published_at: (row.post_published_at as string | null) ?? null,
          link: (row.post_link as string | null) ?? null,
        }
      : null,
  };
};

const isLocalRequest = async() => {
  const headerList = await headers();
  const host = headerList.get("host") || "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
};

const requireAdmin = async () => {
  if (await isLocalRequest()) return { allowed: true, isLocal: true };

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    null;

  if (!email || !isAdminEmail(email)) {
    return { allowed: false, isLocal: false };
  }

  return { allowed: true, isLocal: false, email };
};

const ensureAdminChoiceColumn = async () => {
  try {
    await turso.execute({ sql: "ALTER TABLE featured_slots ADD COLUMN admin_choice INTEGER DEFAULT 0" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/duplicate column/i.test(message)) {
      throw err;
    }
  }
};

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.allowed) {
    return NextResponse.json({ error: "Неовластен пристап." }, { status: 403 });
  }

  const includePosts = new URL(request.url).searchParams.get("withPosts") === "1";

  try {
    await ensureAdminChoiceColumn();
    const result = await turso.execute({
      sql: `${BASE_SLOT_SELECT} ORDER BY fs.slot_id`,
    });

    const slots = result.rows.map(mapSlotRow);
    let recentPosts: Record<string, unknown>[] = [];

    if (includePosts) {
      const posts = await turso.execute({
        sql: `
          SELECT id, title, source, category, teaser, image_url, published_at, scraped_at
          FROM posts
          ORDER BY published_at DESC
          LIMIT 60
        `,
      });
      recentPosts = posts.rows;
    }

    return NextResponse.json({ slots, recentPosts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to fetch featured slots:", message);
    return NextResponse.json({ error: "Проблем при читање на featured_slots.", details: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.allowed) {
    return NextResponse.json({ error: "Неовластен пристап." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const slotId = typeof body?.slotId === "string" ? body.slotId : null;
  const postId =
    typeof body?.postId === "number"
      ? body.postId
      : typeof body?.postId === "string"
        ? Number(body.postId)
        : null;
  const force = Boolean(body?.force);

  if (!slotId || !postId || Number.isNaN(postId)) {
    return NextResponse.json({ error: "Недостигаат slotId или postId." }, { status: 400 });
  }

  try {
    await ensureAdminChoiceColumn();

    const slotResult = await turso.execute({
      sql: "SELECT locked_until FROM featured_slots WHERE slot_id = ? LIMIT 1",
      args: [slotId],
    });

    if (slotResult.rows.length === 0) {
      return NextResponse.json({ error: "Slot not found." }, { status: 404 });
    }

    const lockedUntilRaw = slotResult.rows[0].locked_until as string | null;
    const lockedDate = lockedUntilRaw ? new Date(lockedUntilRaw) : null;
    const isLocked = lockedDate && !Number.isNaN(lockedDate.valueOf()) && lockedDate > new Date();

    if (isLocked && !force) {
      return NextResponse.json(
        {
          lockedUntil: lockedUntilRaw,
          error: "Hero слотот е заклучен помалку од 4 часа. Поднеси повторно за да го препишеш.",
        },
        { status: 409 },
      );
    }

    const postExists = await turso.execute({
      sql: "SELECT id FROM posts WHERE id = ?",
      args: [postId],
    });

    if (postExists.rows.length === 0) {
      return NextResponse.json({ error: "Не постои приказна со ова ID." }, { status: 404 });
    }

    const newLockUntil = new Date(Date.now() + FOUR_HOURS_MS).toISOString();

    await turso.execute({
      sql: `
        UPDATE featured_slots
        SET
          post_id = ?,
          locked_until = ?,
          manual_override = 0,
          admin_choice = 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE slot_id = ?
      `,
      args: [postId, newLockUntil, slotId],
    });

    const refreshed = await turso.execute({
      sql: `${BASE_SLOT_SELECT} WHERE fs.slot_id = ? LIMIT 1`,
      args: [slotId],
    });

    const slot = refreshed.rows[0] ? mapSlotRow(refreshed.rows[0]) : null;

    return NextResponse.json({ ok: true, slot, lockedUntil: newLockUntil });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Hero override failed:", message);
    return NextResponse.json({ error: "Неуспешно рачно поставување.", details: message }, { status: 500 });
  }
}
