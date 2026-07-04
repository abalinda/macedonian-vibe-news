/* eslint-disable @typescript-eslint/no-explicit-any */
import { turso } from "@/lib/turso";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { normalizeImageUrl } from "@/lib/images";
import { sanitizeRichText, stripHtml, toParagraphHtml } from "@/lib/rich-text";
import { CategoryNav, NavBar } from "../../_components/navigation";
import { ShareButton } from "../../_components/share-button";
import { ReadingProgress } from "../../_components/reading-progress";

// Revalidate every 2 minutes
export const revalidate = 120;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const postId = Number(id);
  
  if (Number.isNaN(postId)) return { title: "Блог" };

  try {
    const result = await turso.execute({
      sql: "SELECT title, teaser, summary, image_url FROM posts WHERE id = ? AND category = 'Blog'",
      args: [postId]
    });
    
    const data = result.rows[0] as any;
    if (!data) return { title: "Блог" };

    const title = ("Vibes - " + data.title) || "Блог";
    const description =
      (data.teaser && String(data.teaser)) ||
      (data.summary && stripHtml(String(data.summary || "")).slice(0, 160)) ||
      "Блог објава од Vibes.";
    const image = normalizeImageUrl(typeof data.image_url === "string" ? data.image_url : "");

    const meta: Metadata = {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `/blog/${postId}`,
        siteName: "VIBES",
        type: "article",
        images: image ? [{ url: image, width: 1200, height: 630, alt: title }] : undefined,
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title,
        description,
        images: image ? [image] : undefined,
      },
    };
    return meta;
  } catch (err) {
    console.error("Metadata fetch error:", err);
    return { title: "Блог" };
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const awaitedParams = await params;
  const postId = Number(awaitedParams.id);

  if (Number.isNaN(postId)) {
    notFound();
  }

  let post: any = null;
  try {
    const result = await turso.execute({
      sql: "SELECT * FROM posts WHERE id = ? AND category = 'Blog'",
      args: [postId]
    });

    if (result.rows.length > 0) {
      post = result.rows[0];
    }
  } catch (err: any) {
    console.error("Unexpected error loading blog post", err?.message || err);
    post = null;
  }

  if (!post) {
    notFound();
  }

  const readableDate = post?.published_at
    ? new Date(post.published_at).toLocaleDateString("mk-MK", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const isoDate = post?.published_at ? new Date(post.published_at).toISOString() : undefined;

  const teaserText = post?.teaser ? String(post.teaser).toUpperCase() : "";
  const coverImageUrl = normalizeImageUrl(post?.image_url ? String(post.image_url) : "");

  // The blog "source" column holds the author/byline (see api/blog/create).
  const rawAuthor = typeof post?.source === "string" ? post.source.trim() : "";
  const author = rawAuthor && rawAuthor.toLowerCase() !== "blog" ? rawAuthor : "";

  // Prefer the stored HTML content; fall back to summary/teaser as paragraphs.
  const rawBodyHtml =
    (typeof post?.content === "string" && post.content) ||
    (typeof post?.summary === "string" && post.summary) ||
    (typeof post?.teaser === "string" && post.teaser) ||
    "";
  const sanitizedBody = sanitizeRichText(String(rawBodyHtml || ""));
  const fallbackPlainText =
    (typeof post?.summary === "string" && stripHtml(post.summary)) ||
    (typeof post?.teaser === "string" && stripHtml(post.teaser)) ||
    "";
  const renderedBodyHtml =
    sanitizedBody || toParagraphHtml(fallbackPlainText) || "<p>Нема содржина за оваа објава.</p>";

  // ~200 wpm reading estimate.
  const wordCount = stripHtml(renderedBodyHtml).split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.round(wordCount / 200));
  const shareTitle = post?.title || "Блог објава";
  const sharePath = `/blog/${postId}`;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <ReadingProgress postId={postId} title={post?.title} />
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:border focus:border-line focus:bg-surface focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:uppercase focus:tracking-widest"
      >
        Прескокни до содржината
      </a>
      <NavBar />
      <CategoryNav activeCategory="Blog" />

      <article id="content" className="max-w-3xl mx-auto px-4 md:px-8 py-10 md:py-12">
        {/* Article meta */}
        <div className="mb-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center rounded-full border border-line px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink">
            Блог
          </span>
          {author ? (
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-link">од {author}</span>
          ) : null}
          {readableDate ? (
            <time dateTime={isoDate} className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted">
              {readableDate}
            </time>
          ) : null}
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted">
            · {readingMinutes} мин читање
          </span>
        </div>

        <h1 className="text-center font-serif text-4xl md:text-5xl font-black leading-tight mb-4 text-ink">
          {post?.title || "Блог објава"}
        </h1>

        {teaserText ? (
          <p className="text-sm text-center font-mono uppercase tracking-[0.3em] text-muted mb-6">
            {teaserText}
          </p>
        ) : null}

        <div className="mb-8 flex justify-center">
          <ShareButton url={sharePath} title={shareTitle} variant="pill" context="blog_reader" align="left" />
        </div>

        {coverImageUrl ? (
          <div className="w-full aspect-[16/9] bg-surface-2 border border-line overflow-hidden rounded-[18px] shadow-[8px_8px_0_var(--shadow)] mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImageUrl}
              alt={post?.title || "Слика за блог објавата"}
              className="w-full h-full object-cover"
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : null}

        <div className="bg-surface/70 backdrop-blur border border-line-soft rounded-2xl shadow-[6px_6px_0_var(--shadow)] p-6 md:p-9">
          <div className="blog-body" dangerouslySetInnerHTML={{ __html: renderedBodyHtml }} />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line-soft pt-6">
          <Link
            href="/?category=Blog"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] border border-line px-4 py-2 rounded-full transition-all hover:bg-ink hover:text-paper hover:-translate-y-0.5"
          >
            <span aria-hidden>←</span> Назад кон блог
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted hidden sm:inline">
              Сподели
            </span>
            <ShareButton url={sharePath} title={shareTitle} variant="icon" context="blog_reader_footer" align="right" />
          </div>
        </div>
      </article>
    </main>
  );
}
