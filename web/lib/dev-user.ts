import { auth } from "@clerk/nextjs/server";

// Stable fake user for local preview only. Its rows live under this id in Turso
// and never collide with real Clerk user ids.
export const DEV_PREVIEW_USER_ID = "dev-preview-user";

// Returns the real Clerk user id, or — ONLY in a non-production build with
// DEV_PREVIEW_AUTH=1 explicitly set in web/.env.local — a stable fake id so the
// personalized surface is viewable without Clerk login. Both gates must hold.
export async function resolveUserId(): Promise<string | null> {
  const { userId } = await auth();
  if (userId) return userId;
  if (process.env.NODE_ENV !== "production" && process.env.DEV_PREVIEW_AUTH === "1") {
    return DEV_PREVIEW_USER_ID;
  }
  return null;
}
