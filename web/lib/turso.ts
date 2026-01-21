import { NextRequest, NextResponse } from "next/server";
import { turso } from "@/lib/turso";

export const runtime = 'nodejs'; // Explicitly set Node runtime

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  console.log("--- DEBUG PROBE START ---");
  
  // 1. Check Params
  try {
    const resolvedParams = await params;
    console.log("Params resolved:", resolvedParams);
  } catch (e) {
    console.error("Params failed:", e);
  }

  // 2. Check NextResponse
  try {
    console.log("NextResponse type:", typeof NextResponse);
    if (!NextResponse) console.error("CRITICAL: NextResponse is undefined!");
  } catch (e) {
    console.error("NextResponse check failed:", e);
  }

  // 3. Check Turso Client
  try {
    console.log("Turso client type:", typeof turso);
    console.log("Turso client keys:", turso ? Object.keys(turso) : "null");
    if (!turso) console.error("CRITICAL: Turso client is undefined!");
  } catch (e) {
    console.error("Turso check failed:", e);
  }

  console.log("--- DEBUG PROBE END ---");

  return new Response("Debug Probe Complete - Check Cloudflare Logs", { status: 200 });
}