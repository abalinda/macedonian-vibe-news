'use client';

import { useEffect, useRef, useState } from 'react';
import posthog from 'posthog-js';

const MILESTONES = [25, 50, 75, 100] as const;

/**
 * Thin accent bar at the very top that fills as the reader scrolls the page.
 * When `postId` is provided, also emits a `blog_scroll_depth` event the first
 * time the reader crosses each 25/50/75/100% milestone — giving read-depth /
 * completion analytics for blog posts.
 */
export function ReadingProgress({
  postId,
  title,
}: {
  postId?: number | string;
  title?: string;
}) {
  const [progress, setProgress] = useState(0);
  const firedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const pct = max > 0 ? Math.min(100, Math.max(0, (el.scrollTop / max) * 100)) : 0;
      setProgress(pct);

      if (postId == null) return;
      for (const m of MILESTONES) {
        if (pct >= m && !firedRef.current.has(m)) {
          firedRef.current.add(m);
          posthog.capture('blog_scroll_depth', {
            post_id: postId,
            title: title ?? null,
            depth: m,
          });
        }
      }
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [postId, title]);

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-[3px] bg-transparent" aria-hidden>
      <div
        className="h-full bg-accent transition-[width] duration-100 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
