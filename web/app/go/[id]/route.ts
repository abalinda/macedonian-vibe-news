import { NextRequest, NextResponse } from "next/server";
import { turso } from "@/lib/turso";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  console.log("--- DEBUG START ---");
  
  // 1. Await params (Next.js 16 requirement)
  const { id } = await params;
  console.log(`1. Params resolved: ${id}`);

  // 2. Test the Turso Import
  try {
    // If "turso" was the cause of "reading 'default'", THIS line would have crashed the file load.
    // If we are here, the import is successful.
    console.log("2. Turso Client Status:", turso ? "Loaded" : "Undefined");
  } catch (e) {
    console.error("CRITICAL: Turso import failed:", e);
    return new NextResponse("Error: Turso Import Failed", { status: 500 });
  }

  // 3. Attempt the query
  try {
    const postId = Number(id);
    if (!Number.isFinite(postId)) return NextResponse.redirect(new URL("/", request.url));

    const result = await turso.execute({
      sql: "SELECT link FROM posts WHERE id = ? LIMIT 1",
      args: [postId],
    });
    
    const post = result.rows[0];
    const targetUrl = (post?.link as string | null) ?? null;
    
    console.log(`3. Query Success. Target: ${targetUrl}`);
    
    if (targetUrl) {
       // Fire-and-forget update
       turso.execute({
        sql: "UPDATE posts SET clicks = COALESCE(clicks, 0) + 1 WHERE id = ?",
        args: [postId],
      }).catch(err => console.error("Update failed", err));

      return NextResponse.redirect(targetUrl, 307);
    }
    
    return NextResponse.redirect(new URL("/", request.url));

  } catch (error) {
    console.error("4. Query Execution Failed:", error);
    return new NextResponse(`Query Error: ${error}`, { status: 500 });
  }
}