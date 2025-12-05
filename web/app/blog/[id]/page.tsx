/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryNav, NavBar } from "../../_components/navigation";

export const revalidate = 120;

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "");

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const postId = Number(id);
  if (Number.isNaN(postId)) return { title: "Блог" };

  try {
    const { data } = await supabase
      .from("posts")
      .select("title, teaser, summary, image_url")
      .eq("id", postId)
      .eq("category", "Blog")
      .single();

    const title = ("Vibes - " + data?.title) || "Блог";
    const description =
      (data?.teaser && String(data.teaser)) ||
      (data?.summary && stripHtml(String(data.summary)).slice(0, 160)) ||
      "Блог објава од Vibes.";
    const image = data?.image_url;

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
  } catch {
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
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .eq("category", "Blog")
      .single();

    if (error) {
      console.error("Failed to load blog post", error.message);
    }

    post = data ?? null;
  } catch (err: any) {
    console.error("Unexpected error loading blog post", err?.message || err);
    post = null;
  }

  if (!post) {
    notFound();
  }

  const readableDate = post?.published_at
    ? new Date(post.published_at).toLocaleDateString("mk-MK")
    : "";
  const teaserText = post?.teaser ? String(post.teaser).toUpperCase() : "";
  const body =
    post?.content ||
    (post?.summary ? stripHtml(post.summary) : "") ||
    (post?.teaser ? stripHtml(post.teaser) : "");

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-neutral-900">
      <NavBar />
      <CategoryNav activeCategory="Blog" />

      <article className="max-w-3xl mx-auto px-4 md:px-8 py-10 md:py-14">
        <div className="text-xs font-bold uppercase tracking-[0.35em] text-neutral-500 mb-3 flex flex-wrap gap-2 items-center">
          <span>{post?.source || "Блог"}</span>
          {readableDate ? <span className="text-neutral-400">• {readableDate}</span> : null}
        </div>

        <h1 className="font-serif text-4xl md:text-5xl font-black leading-tight mb-4">
          {post?.title || "Блог објава"}
        </h1>

        {teaserText ? (
          <p className="text-sm font-mono uppercase tracking-[0.35em] text-neutral-600 mb-6">
            {teaserText}
          </p>
        ) : null}

        {post?.image_url ? (
          <div className="w-full aspect-[16/9] bg-neutral-200 border border-black overflow-hidden rounded-[18px] shadow-[8px_8px_0_#00000010] mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_url}
              alt={post?.title || "Слика за блог објавата"}
              className="w-full h-full object-cover"
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : null}

        <div className="bg-white/70 backdrop-blur border border-neutral-200 rounded-2xl shadow-sm p-6 md:p-8">
          <div className="font-serif text-lg leading-relaxed text-neutral-900 whitespace-pre-wrap">
            {body || "Нема содржина за оваа објава."}
          </div>
        </div>

        <div className="mt-10 flex justify-between items-center gap-4">
          <Link
            href="/?category=Blog"
            className="text-xs font-bold uppercase tracking-[0.3em] border border-black px-4 py-2 rounded-full transition-colors hover:bg-black hover:text-white"
          >
            Назад кон блогот
          </Link>
          {readableDate ? (
            <span className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">
              Објавено: {readableDate}
            </span>
          ) : null}
        </div>
      </article>
    </main>
  );
}
