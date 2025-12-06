'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  Tech: "Технологија",
  Culture: "Култура",
  Lifestyle: "Животен стил",
  Business: "Бизнис",
  Sports: "Спорт",
};

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "");

const getTeaserText = (post: any) => {
  const rawTeaser = post?.teaser?.trim();
  if (rawTeaser) return rawTeaser.toUpperCase();
  const summaryFallback = post?.summary ? stripHtml(post.summary).substring(0, 140).trim() : "";
  return summaryFallback ? summaryFallback.toUpperCase() : "";
};

const formatDate = (value?: string | null) => {
  if (!value) return "Неодамна додадено";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Неодамна додадено";
  return parsed.toLocaleDateString('mk-MK', { day: "2-digit", month: "short", year: "numeric" });
};

const StoryRow = ({ post, index }: { post: any; index: number }) => {
  const teaserText = getTeaserText(post);
  const categoryLabel = CATEGORY_LABELS[post?.category] ?? post?.category ?? "Вести";

  return (
    <a href={post.link} target="_blank" rel="noreferrer" className="group block px-4 py-5 md:px-6 hover:bg-neutral-50 transition-colors">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex items-center gap-3 sm:w-24 flex-shrink-0">
          <span className="text-[10px] font-mono text-neutral-400 select-none">
            #{String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 truncate max-w-[80px]">
            {post.source}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-start gap-2 md:justify-between mb-2">
            <h3 className="font-serif text-xl font-bold leading-snug group-hover:underline decoration-2 underline-offset-4 text-neutral-900">
              {post.title}
            </h3>
            <span className="self-start text-[10px] font-bold uppercase tracking-widest text-neutral-500 bg-white border border-neutral-200 rounded px-2 py-0.5 whitespace-nowrap">
              {categoryLabel}
            </span>
          </div>

          <p className="text-xs md:text-sm text-neutral-600 font-mono uppercase tracking-wider line-clamp-2 leading-relaxed opacity-80">
            {teaserText}
          </p>

          <div className="mt-3 flex items-center gap-3 text-[10px] uppercase tracking-widest text-neutral-400">
            <span className="font-mono text-neutral-500">{formatDate(post?.published_at)}</span>
            <span className="h-px w-8 bg-neutral-300" />
            <span className="group-hover:text-blue-600 transition-colors">
              Отвори &rarr;
            </span>
          </div>
        </div>
      </div>
    </a>
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
        <div className="p-4 md:p-6 border-t border-neutral-200 bg-white">
          <button
            onClick={() => setVisibleCount((prev) => Math.min(prev + 20, posts.length))}
            className="w-full border border-black bg-black text-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.3em] transition-all hover:bg-white hover:text-black hover:shadow-[6px_6px_0_#00000010]"
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
