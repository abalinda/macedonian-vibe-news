import { NextResponse } from "next/server";
import { turso } from "@/lib/turso";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const postId = Number(params.id);

  if (!Number.isFinite(postId)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const result = await turso.execute({
      sql: "SELECT link FROM posts WHERE id = ? LIMIT 1",
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

    return NextResponse.redirect(targetUrl, 307);
  } catch (error) {
    console.error("Redirect error on /go:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
