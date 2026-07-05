// web/app/_components/save-button.tsx
'use client';

import { useState } from "react";
import { SignedIn } from "@clerk/nextjs";
import posthog from "posthog-js";
import { toggleBookmark } from "@/app/actions/bookmarks";

// Bookmark toggle for article cards («сочувај написи»). Optimistic; hidden
// when signed out. MUST stop propagation — cards are wrapped in ArticleLink,
// and saving must never navigate.
export function SaveButton({
  postId,
  saved,
  onToggled,
  context,
  category = null,
  source = null,
}: {
  postId: number;
  saved: boolean;
  onToggled?: (saved: boolean) => void;
  context: string;
  category?: string | null;
  source?: string | null;
}) {
  const [isSaved, setIsSaved] = useState(saved);
  const [busy, setBusy] = useState(false);

  const toggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !isSaved;
    setIsSaved(next); // optimistic
    const result = await toggleBookmark(postId);
    if (result === null) {
      setIsSaved(!next); // revert on failure
    } else {
      setIsSaved(result.saved);
      onToggled?.(result.saved);
      posthog.capture("article_save", {
        post_id: postId,
        category,
        source,
        feed: context,
        saved: result.saved,
      });
    }
    setBusy(false);
  };

  return (
    <SignedIn>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={isSaved}
        aria-label={isSaved ? "Отстрани од зачувани" : "Сочувај напис"}
        className={`flex h-9 w-9 items-center justify-center rounded-full border border-line shadow-[3px_3px_0_var(--shadow)] transition-all hover:-translate-y-0.5 ${
          isSaved ? "bg-accent text-black" : "bg-surface/90 text-ink hover:bg-ink hover:text-paper"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 3H7a1 1 0 0 0-1 1v17l6-4 6 4V4a1 1 0 0 0-1-1z" />
        </svg>
      </button>
    </SignedIn>
  );
}
