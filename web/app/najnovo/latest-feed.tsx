'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  Tech: "Технологија",
  Culture: "Култура",
  Lifestyle: "Животен стил",
  Business: "Бизнис",
  Sports: "Спорт",
  Blog: "Блог",
};

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "");

const getTeaserText = (post: any) => {
  const rawTeaser = post?.teaser?.trim();
  if (rawTeaser) return rawTeaser.toUpperCase();
  const summaryFallback = post?.summary ? stripHtml(post.summary).substring(0, 140).trim() : "";
  return summaryFallback ? summaryFallback.toUpperCase() : "";
};

const formatRelativeScrapedAt = (value?: string | null, nowValue?: number) => {
  if (!value) return "Неодамна";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Неодамна";

  const now = nowValue ?? Date.now();
  const diffMinutes = Math.max(0, Math.floor((now - timestamp) / (1000 * 60)));

  if (diffMinutes < 15) return "Свежо";
  if (diffMinutes < 60) return `пред ${diffMinutes} минути`;
  if (diffMinutes < 120) return "пред 1 час";

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 48) return `пред ${diffHours} часа`;

  const diffDays = Math.floor(diffHours / 24);
  return `пред ${diffDays} дена`;
};

const CardLink = ({ post, className, children }: { post: any; className?: string; children: ReactNode }) => {
  const isBlog = post?.category === "Blog";
  const href = isBlog
    ? `/blog/${post.id}`
    : post?.id
      ? `/go/${post.id}`
      : post?.link || "#";

  if (isBlog) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
};

const LatestCard = ({ post, index, now }: { post: any; index: number; now: number }) => {
  const teaserText = getTeaserText(post);
  const teaserWithEllipsis =
    teaserText && !teaserText.trimEnd().endsWith("...") ? `${teaserText.trimEnd()}...` : teaserText;
  const categoryLabel = CATEGORY_LABELS[post?.category] ?? post?.category ?? "Вести";
  const relativeTime = formatRelativeScrapedAt(post?.scraped_at, now);
  const timeLabel = relativeTime === "Неодамна" && post?.published_at
    ? formatRelativeScrapedAt(post.published_at, now)
    : relativeTime;
  const finalTimeLabel = timeLabel || "Неодамна";
  const imageUrl = post?.image_url;

  return (
    <CardLink post={post} className="group block h-full">
      <article className="relative h-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[6px_6px_0_#00000010] transition-transform duration-200 hover:-translate-y-[3px] hover:shadow-[10px_10px_0_#00000012]">
        <div className="relative aspect-[16/9] border-b border-neutral-200 bg-neutral-100 overflow-hidden">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={post.title || "Слика за веста"}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[10px] text-neutral-400 font-mono uppercase tracking-[0.3em]">
              Vibes.mk
            </div>
          )}

          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
            <span
              className={`text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-1 shadow-sm ${
                finalTimeLabel === "Свежо"
                  ? "bg-[#FFD300] text-black"
                  : "bg-black text-white"
              }`}
            >
              {finalTimeLabel}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest bg-white/90 border border-black rounded-full px-2 py-1">
              #{String(index + 1).padStart(2, "0")} • {post.source}
            </span>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-3 h-full">
          {/* <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-neutral-400">
            <span className="text-[#002CFF] font-bold">{post.source}</span>
            <span className="h-px w-6 bg-neutral-200" />
            <span className="text-neutral-600">{finalTimeLabel}</span>
          </div> */}

          <h3 className="font-serif text-xl font-bold leading-tight text-neutral-900 group-hover:text-[#FFD300] transition-colors">
            {post.title}
          </h3>

          {teaserWithEllipsis && (
            <>
              <p className="text-xs md:text-sm text-neutral-600 font-mono uppercase tracking-[0.2em] leading-relaxed line-clamp-4">
                {teaserWithEllipsis}
              </p>
              <div className="flex justify-end">
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-neutral-400 group-hover:text-[#FFD300] transition-colors">
                  Прочитај повеќе →
                </span>
              </div>
            </>
          )}

          <div className="flex items-center justify-between mt-auto">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 bg-white border border-neutral-200 rounded px-2 py-1">
              {categoryLabel}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-neutral-900 group-hover:text-[#002CFF] transition-colors">
              Отвори <span aria-hidden>→</span>
            </span>
          </div>
        </div>
      </article>
    </CardLink>
  );
};

export const LatestFeed = ({ posts }: { posts: any[] }) => {
  const [visibleCount, setVisibleCount] = useState(18);
  const [now, setNow] = useState(() => Date.now());
  const [isMobile, setIsMobile] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const visiblePosts = useMemo(() => posts.slice(0, visibleCount), [posts, visibleCount]);
  const canLoadMore = visibleCount < posts.length;

  useEffect(() => {
    if (!isMobile || !canLoadMore) return;
    const target = sentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleCount((prev) => Math.min(prev + 9, posts.length));
          }
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [canLoadMore, isMobile, posts.length]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visiblePosts.map((post, index) => (
          <LatestCard key={post.id ?? `${post.title}-${index}`} post={post} index={index} now={now} />
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-neutral-200 pt-4">
        <div className="text-[11px] font-mono uppercase tracking-[0.26em] text-neutral-500">
          Прикажани {visiblePosts.length} / {posts.length}
        </div>

        {canLoadMore && (
          <>
            <button
              onClick={() => setVisibleCount((prev) => Math.min(prev + 9, posts.length))}
              className="group inline-flex items-center gap-2 border border-black bg-black text-white px-3 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.3em] transition-all hover:bg-[#FFD300] hover:text-black hover:shadow-[6px_6px_0_#00000012] md:self-auto self-end md:flex hidden"
              aria-label="Вчитај повеќе најнови вести"
            >
              <span>Уште вести</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black group-hover:translate-x-1 transition-transform">
                →
              </span>
            </button>

            <div
              ref={sentinelRef}
              className="md:hidden w-full h-12 rounded-md bg-gradient-to-r from-neutral-50 via-neutral-100 to-neutral-50 border border-dashed border-neutral-200 flex items-center justify-center text-[11px] font-mono uppercase tracking-[0.2em] text-neutral-400"
            >
              Вчитуваме уште вести...
            </div>
          </>
        )}
      </div>
    </div>
  );
};
