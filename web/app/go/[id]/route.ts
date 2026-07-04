import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { turso } from "@/lib/turso";
import { recordClick } from "@/lib/personalization-db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const postId = Number(id);

  if (!Number.isFinite(postId)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const result = await turso.execute({
      sql: "SELECT link, category FROM posts WHERE id = ? LIMIT 1",
      args: [postId],
    });

    const post = result.rows[0];
    const targetUrl = (post?.link as string | null) ?? null;

    if (!targetUrl) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    await turso.execute({
      sql: "UPDATE posts SET clicks = COALESCE(clicks, 0) + 1 WHERE id = ?",
      args: [postId],
    });

    // Personalization learning: never allowed to block or break the redirect.
    try {
      const { userId } = await auth();
      if (userId) {
        await recordClick(userId, postId, String(post?.category ?? ""));
      }
    } catch (error) {
      console.error("recordClick on /go failed:", error);
    }

    return NextResponse.redirect(targetUrl, 307);
  } catch (error) {
    console.error("Redirect error on /go:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
