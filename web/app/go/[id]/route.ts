import { NextRequest, NextResponse } from "next/server";

// ❌ DO NOT IMPORT TURSO HERE
// import { turso } from "@/lib/turso"; 

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  
  // If this page loads, we know the previous crash was caused by the Turso import.
  // If this page STILL crashes, the problem is in your Middleware.
  return new NextResponse(`ISOLATION TEST: Route is working. ID: ${id}`, { status: 200 });
}