'use server';

import { auth } from "@clerk/nextjs/server";
import { recordClick } from "@/lib/personalization-db";

// Called by a client component on blog pages (the blog reader is ISR-cached,
// so the server render can't see the user — spec §4.2 note). Opening a blog
// post counts as a "click" on the Blog category; recordClick's 24h dedupe
// absorbs refreshes and router prefetches.
export async function recordBlogRead(postId: number): Promise<void> {
  const { userId } = await auth();
  if (!userId || !Number.isFinite(postId)) return;
  try {
    await recordClick(userId, postId, "Blog");
  } catch (error) {
    console.error("recordBlogRead failed:", error);
  }
}
