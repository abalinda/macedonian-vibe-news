'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import posthog from "posthog-js";
import type { ReactNode } from "react";

// Where the click happened, so dashboards can compare click-through by surface.
export type ArticleFeed = "home" | "latest" | "archive" | "search" | "tvoi-vesti" | "profile";

type ArticleLinkProps = {
  post: any;
  className?: string;
  children: ReactNode;
  feed: ArticleFeed;
  // Home only: which block the card sat in ("hero" | "secondary" | "side").
  placement?: string;
  // 1-based rank of the card within its list — lets us measure position bias.
  position?: number;
};

// Builds the article_click payload from a post + context. Exported so non-anchor
// click surfaces (e.g. the search dropdown, which uses router.push) can emit the
// exact same event shape.
export function captureArticleClick(
  post: any,
  feed: ArticleFeed,
  extra?: { placement?: string; position?: number },
) {
  if (!post?.id) return;
  posthog.capture("article_click", {
    post_id: post.id,
    title: post.title ?? null,
    category: post.category ?? null,
    source: post.source ?? null,
    feed,
    is_blog: post?.category === "Blog",
    ...(extra?.placement ? { placement: extra.placement } : {}),
    ...(typeof extra?.position === "number" ? { position: extra.position } : {}),
  });
}

// Drop-in replacement for the per-feed StoryLink/CardLink: renders an internal
// <Link> for blog posts and an external <a target="_blank"> for /go/[id]
// redirects, and captures an `article_click` on activation. capture() is
// fire-and-forget (keepalive/sendBeacon), so navigation isn't delayed or lost.
export function ArticleLink({
  post,
  className,
  children,
  feed,
  placement,
  position,
}: ArticleLinkProps) {
  const isBlog = post?.category === "Blog";
  const href = isBlog
    ? `/blog/${post.id}`
    : post?.id
      ? `/go/${post.id}`
      : post?.link || "#";

  const track = () => captureArticleClick(post, feed, { placement, position });
  // onClick covers left-click + keyboard activation; onAuxClick(button===1)
  // covers middle-click "open in new tab" without double-counting right-clicks.
  const onAuxClick = (event: { button: number }) => {
    if (event.button === 1) track();
  };

  if (isBlog) {
    return (
      <Link href={href} className={className} onClick={track} onAuxClick={onAuxClick}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={track}
      onAuxClick={onAuxClick}
    >
      {children}
    </a>
  );
}
