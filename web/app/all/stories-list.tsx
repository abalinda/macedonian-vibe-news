'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { useMemo, useState } from "react";
import { ShareButton } from "../_components/share-button";
import { getTeaserText, TEASER_CLASS } from "@/lib/teaser";

const CATEGORY_LABELS: Record<string, string> = {
  Tech: "Технологија",
  Culture: "Култура",
  Lifestyle: "Животен стил",
  Business: "Бизнис",
  Sports: "Спорт",
  Blog: "Блог",
};

const formatDate = (value?: string | null) => {
  if (!value) return "Неодамна додадено";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Неодамна додадено";
  return parsed.toLocaleDateString('mk-MK', { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "numeric" });
};

const StoryRow = ({ post, index }: { post: any; index: number }) => {
  const teaserText = getTeaserText(post);
  const categoryLabel = CATEGORY_LABELS[post?.category] ?? post?.category ?? "Вести";
  const isBlog = post?.category === "Blog";
  const href = isBlog
    ? `/blog/${post.id}`
    : post?.id
      ? `/go/${post.id}`
      : post?.link || "#";
  const shareUrl = isBlog ? `/blog/${post.id}` : `/go/${post.id}`;
  const wrapperClass = "group block pl-4 pr-14 md:pl-6 md:pr-16 py-5 hover:bg-surface-2 transition-colors";
  const content = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
      <div className="flex items-center gap-3 sm:w-24 flex-shrink-0">
        <span className="text-[10px] font-mono text-neutral-400 select-none">
          #{String(index + 1).padStart(2, "0")}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-link truncate max-w-[80px]">
          {post.source}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col md:flex-row md:items-start gap-2 md:justify-between mb-2">
          <h3 className="font-serif text-xl font-bold leading-snug group-hover:underline decoration-2 underline-offset-4 text-ink">
            {post.title}
          </h3>
          <span className="self-start text-[10px] font-bold uppercase tracking-widest text-neutral-500 bg-surface border border-line-soft rounded px-2 py-0.5 whitespace-nowrap">
            {categoryLabel}
          </span>
        </div>

        <p className={`${TEASER_CLASS} text-xs md:text-sm line-clamp-2`}>
          {teaserText}
        </p>

        <div className="mt-3 flex items-center gap-3 text-[10px] uppercase tracking-widest text-neutral-400">
          <span className="font-mono text-neutral-500">{formatDate(post?.published_at)}</span>
          <span className="h-px w-8 bg-line-soft" />
          <span className="group-hover:text-link transition-colors">
            Отвори &rarr;
          </span>
        </div>
      </div>
    </div>
  );

  const link = isBlog ? (
    <Link href={href} className={wrapperClass}>
      {content}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer" className={wrapperClass}>
      {content}
    </a>
  );

  return (
    <div className="relative">
      {link}
      <ShareButton
        url={shareUrl}
        title={post.title || "Vibes"}
        variant="icon"
        context="archive_row"
        align="right"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20"
      />
    </div>
  );
};

export function StoriesList({ posts }: { posts: any[] }) {
  const [visibleCount, setVisibleCount] = useState(20);

  const visiblePosts = useMemo(() => posts.slice(0, visibleCount), [posts, visibleCount]);
  const canLoadMore = visibleCount < posts.length;

  return (
    <div className="flex flex-col">
      {visiblePosts.map((post, index) => (
        <StoryRow key={post.id} post={post} index={index} />
      ))}

      {canLoadMore && (
        <div className="p-4 md:p-6 border-t border-line-soft bg-surface">
          <button
            onClick={() => setVisibleCount((prev) => Math.min(prev + 20, posts.length))}
            className="w-full border border-line bg-ink text-paper px-4 py-3 text-[11px] font-bold uppercase tracking-[0.3em] transition-all hover:bg-surface hover:text-ink hover:shadow-[6px_6px_0_var(--shadow)]"
          >
            Вчитај повеќе
          </button>
          <p className="mt-2 text-[11px] text-neutral-500 font-mono uppercase tracking-[0.25em] text-center">
            Прикажани {visiblePosts.length} / {posts.length}
          </p>
        </div>
      )}
    </div>
  );
}
