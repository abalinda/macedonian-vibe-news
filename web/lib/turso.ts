import { NextRequest, NextResponse } from "next/server";

// 1. DO NOT import 'turso' yet. Let's isolate the crash.
// import { turso } from "@/lib/turso"; 

// 2. REMOVE "runtime = 'nodejs'" (This fixes the build failure)
// export const runtime = 'edge'; 

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // 3. Verify Params resolution (Next.js 16 requirement)
  const { id } = await params;

  // 4. Return a simple text response
  // If you see this on your screen, the "Internal Error" is definitely caused by the Turso Client.
  return new NextResponse(`Probe Success! ID: ${id} - The issue is the DB Client`, { status: 200 });
}