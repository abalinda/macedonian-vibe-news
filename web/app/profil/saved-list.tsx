'use client';

import { useState } from "react";
import { ArticleLink } from "../_components/article-link";
import { toggleBookmark, type SavedPost } from "@/app/actions/bookmarks";
import { CATEGORY_LABELS } from "@/lib/categories";

// «Зачувано»: the user's bookmarks with inline unsave. Client component so
// rows can be removed optimistically.
export function SavedList({ initial }: { initial: SavedPost[] }) {
  const [items, setItems] = useState(initial);

  const unsave = async (postId: number) => {
    const removed = items.find((p) => p.id === postId);
    setItems((prev) => prev.filter((p) => p.id !== postId)); // optimistic
    const result = await toggleBookmark(postId);
    // toggleBookmark returns { saved: false } on successful unsave; anything
    // else means it failed (null) or unexpectedly re-saved — restore the row.
    if (removed && (result === null || result.saved)) {
      setItems((prev) => [removed, ...prev]);
    }
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-neutral-500 border-2 border-dashed border-line-soft rounded-lg bg-surface-2 px-6 py-10 text-center">
        Уште немаш зачувани написи. Кликни на ознаката на било која картичка.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-line-soft border border-line rounded-xl bg-surface shadow-[6px_6px_0_var(--shadow)]">
      {items.map((post) => (
        <li key={post.id} className="flex items-center gap-4 p-4">
          <div className="min-w-0 flex-1">
            <ArticleLink post={post} feed="profile" className="group block">
              <span className="block truncate font-serif text-base font-bold text-ink group-hover:underline">
                {post.title}
              </span>
            </ArticleLink>
            <span className="mt-1 block text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
              {(post.category && CATEGORY_LABELS[post.category as keyof typeof CATEGORY_LABELS]) ?? post.category ?? "Вести"}
              {post.source ? ` · ${post.source}` : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={() => unsave(post.id)}
            aria-label="Отстрани од зачувани"
            className="shrink-0 rounded-full border border-line bg-surface px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-ink hover:text-paper"
          >
            Отстрани
          </button>
        </li>
      ))}
    </ul>
  );
}
