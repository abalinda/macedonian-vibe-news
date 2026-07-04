'use client';

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { recordBlogRead } from "@/app/actions/read-tracking";

// Invisible: pings the read-tracking action once per mount for signed-in
// users. Lives client-side because the blog page is ISR-cached (shared HTML),
// so only the browser knows who is reading.
export function RecordRead({ postId }: { postId: number }) {
  const { user } = useUser();
  const userId = user?.id;

  useEffect(() => {
    if (!userId || !Number.isFinite(postId)) return;
    recordBlogRead(postId).catch(() => {
      /* learning is best-effort; never surface errors to the reader */
    });
  }, [userId, postId]);

  return null;
}
