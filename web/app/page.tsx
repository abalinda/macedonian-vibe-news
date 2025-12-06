/* eslint-disable @typescript-eslint/no-explicit-any */
import { turso } from "@/lib/turso";
import Link from "next/link";
import type { ReactNode } from "react";
import { CategoryNav, NavBar } from "./_components/navigation";

// Revalidate every 60 seconds (ISR)
export const revalidate = 60;

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "");

const getTeaserText = (post: any) => {
  const rawTeaser = post?.teaser?.trim();
  if (rawTeaser) return rawTeaser.toUpperCase();

  const summaryFallback = post?.summary ? stripHtml(post.summary).substring(0, 120).trim() : "";
  return summaryFallback ? summaryFallback.toUpperCase() : "";
};

// Maps URL parameter -> Database slot_id
const CATEGORY_SLOT_MAP = {
  Tech: "tech",
  Culture: "culture",
  Lifestyle: "lifestyle",
  Business: "business",
  Sports: "sports",
  Blog: "blog",
} as const;

const CATEGORY_LABELS = {
  Tech: "Технологија",
  Culture: "Култура",
  Lifestyle: "Животен стил",
  Business: "Бизнис",
  Sports: "Спорт",
  Blog: "Блог",
} as const;

// -- HELPER COMPONENTS --

const StoryLink = ({
  post,
  className,
  children,
}: {
  post: any;
  className?: string;
  children: ReactNode;
}) => {
  const isBlog = post?.category === "Blog";
  const href = isBlog ? `/blog/${post.id}` : post?.link || "#";

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

const SideStory = ({ post }: { post: any }) => {
  const teaserText = getTeaserText(post);
  const imageUrl = post?.image_url;

  return (
    <StoryLink post={post} className="group block py-6 last:border-0 border-b border-neutral-200 lg:border-none">
      <div className="flex gap-4">
        <div className="relative w-32 aspect-[16/10] overflow-hidden bg-neutral-200 border border-black flex-shrink-0">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={post.title || "Слика за приказната"}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[10px] text-neutral-400 font-mono text-center px-2 leading-tight">
              Vibes.mk
            </div>
          )}
        </div>

        <div className="flex-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1 block">
            {post.source}
          </span>
          <h3 className="font-serif text-lg leading-tight font-bold group-hover:underline decoration-2 underline-offset-4 mb-2">
            {post.title}
          </h3>
          <p className="text-xs text-neutral-800 font-mono uppercase tracking-[0.3em] line-clamp-2">
            {teaserText}
          </p>
        </div>
      </div>
    </StoryLink>
  );
};

const HeroStory = ({ post }: { post: any }) => {
  const teaserText = getTeaserText(post);
  const heroImage = post?.image_url;

  return (
    <StoryLink post={post} className="group block mb-12 md:mb-0">
      <div className="w-full aspect-video bg-neutral-200 mb-6 flex items-center justify-center border border-black overflow-hidden relative">
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={heroImage} 
              alt={post.title || "Слика за главната приказна"}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : (
             <span className="text-neutral-400 font-mono text-4xl font-bold opacity-20">VIBES</span>
          )}
      </div>
      
      <div className="text-center px-4">
        <span className="inline-block border border-black px-2 py-0.5 text-xs font-bold uppercase tracking-widest mb-4 hover:bg-black hover:text-white transition-colors">
          {post.source}
        </span>
        <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-black leading-[0.9] mb-4 group-hover:text-blue-800 transition-colors">
          {post.title}
        </h2>
        <p className="text-sm md:text-base font-mono uppercase tracking-[0.15em] text-neutral-600 mb-6 max-w-2xl mx-auto">
          {teaserText}
        </p>
        <div className="inline-flex items-center gap-2 text-xs font-bold text-neutral-900 uppercase tracking-widest border-b-2 border-transparent group-hover:border-blue-600">
          Прочитај повеќе <span>&rarr;</span>
        </div>
      </div>
    </StoryLink>
  );
};

const EmptyState = ({ category, teaserMessage }: { category: string | null; teaserMessage?: string }) => (
  <div className="flex flex-col items-center justify-center py-20 px-4">
    <div className="text-center max-w-md">
      <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 text-neutral-800">
        Нема пронајдени приказни
      </h2>
      <p className="font-serif text-lg text-neutral-600 italic">
        {category 
          ? `Моментално нема написи во категоријата "${category}".`
          : "Нема написи во моментот."
        }
      </p>
      <Link 
        href="/" 
        className="inline-block mt-8 px-6 py-3 bg-black text-white font-sans text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
      >
        Види ги сите приказни
      </Link>
      {teaserMessage && (
        <div className="mt-8 text-[10px] text-neutral-400 font-mono uppercase tracking-widest">
          {teaserMessage}
        </div>
      )}
    </div>
  </div>
);

// -- MAIN PAGE --

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const rawCategory = params.category || null;
  const hasCategory = rawCategory ? Object.prototype.hasOwnProperty.call(CATEGORY_SLOT_MAP, rawCategory) : false;
  const selectedCategory = hasCategory ? (rawCategory as keyof typeof CATEGORY_SLOT_MAP) : null;
  const displayCategory = selectedCategory ? CATEGORY_LABELS[selectedCategory] ?? selectedCategory : null;
  const blogTeaser = selectedCategory === "Blog" ? "" : undefined;

  // 1. Determine which "Slot" we want for the hero
  const heroSlotId = selectedCategory ? CATEGORY_SLOT_MAP[selectedCategory] : "main";

  let posts: any[] = [];
  let heroPost: any = null;

  try {
    // 2. Parallel Fetching: Get Posts + Get Hero ID
    // We execute two queries in parallel for speed
    const [postsResult, featuredResult] = await Promise.all([
      turso.execute({
        sql: selectedCategory 
          ? "SELECT * FROM posts WHERE category = ? ORDER BY published_at DESC LIMIT 20"
          : "SELECT * FROM posts ORDER BY published_at DESC LIMIT 20",
        args: selectedCategory ? [selectedCategory] : [],
      }),
      turso.execute({
        sql: "SELECT post_id FROM featured_slots WHERE slot_id = ?",
        args: [heroSlotId],
      }),
    ]);

    posts = postsResult.rows;
    
    // 3. Resolve Hero Post
    const featuredId = featuredResult.rows[0]?.post_id;

    if (featuredId) {
      // Check if the hero is already in our list of 20
      const foundInList = posts.find((p) => p.id === featuredId);
      
      if (foundInList) {
        heroPost = foundInList;
      } else {
        // If not (it's an older story explicitly featured), fetch it specifically
        const heroResult = await turso.execute({
          sql: "SELECT * FROM posts WHERE id = ?",
          args: [featuredId],
        });
        if (heroResult.rows.length > 0) {
          heroPost = heroResult.rows[0];
        }
      }
    }
  } catch (err) {
    console.error("🔥 Database Error:", err);
    // Silent fail: posts will be empty, UI will show empty state
  }

  // Fallback: If no Featured Slot is set, just take the first post
  if (!heroPost && posts.length > 0) {
    heroPost = posts[0];
  }

  // 4. Handle Empty State
  if (posts.length === 0 && !heroPost) {
    return (
      <main className="min-h-screen bg-[#FDFBF7] text-neutral-900">
        <NavBar />
        <CategoryNav activeCategory={selectedCategory} />
        <EmptyState category={displayCategory} teaserMessage={blogTeaser} />
      </main>
    );
  }

  // 5. Filter Hero out of the sidebar lists to avoid duplicates
  const remainingPosts = heroPost 
    ? posts.filter((p) => p.id !== heroPost.id) 
    : posts;

  const leftColumnPosts = remainingPosts.slice(0, 4);
  const rightColumnPosts = remainingPosts.slice(4, 9);

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-neutral-900 pb-20">
      <NavBar />
      <CategoryNav activeCategory={selectedCategory} />

      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        
        {/* GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 border-t border-black pt-8">
          
          {/* LEFT SIDEBAR */}
          <div className="lg:col-span-3 lg:border-r border-neutral-300 lg:pr-8 order-2 lg:order-1">
            <h4 className="font-sans text-xs font-black uppercase tracking-widest border-b-4 border-black pb-2 mb-4">
              {selectedCategory ? 'Најново' : 'Последни новости'}
            </h4>
            <div className="flex flex-col">
              {leftColumnPosts.map((post) => (
                <SideStory key={post.id} post={post} />
              ))}
            </div>
          </div>

          {/* CENTER HERO */}
          <div className="lg:col-span-6 px-0 lg:px-8 order-1 lg:order-2">
            {heroPost && <HeroStory post={heroPost} />}
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="lg:col-span-3 lg:border-l border-neutral-300 lg:pl-8 order-3">
             <h4 className="font-sans text-xs font-black uppercase tracking-widest border-b-4 border-black pb-2 mb-4">
              {selectedCategory ? 'Повеќе' : 'Останати приказни'}
            </h4>
            <div className="flex flex-col">
              {rightColumnPosts.map((post) => (
                <SideStory key={post.id} post={post} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}