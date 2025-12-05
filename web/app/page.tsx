/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import type { ReactNode } from "react";
import { CategoryNav, NavBar } from "./_components/navigation";

// Revalidate every 60 seconds
export const revalidate = 60;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "");

const getTeaserText = (post: any) => {
  const rawTeaser = post?.teaser?.trim();
  if (rawTeaser) return rawTeaser.toUpperCase();

  const summaryFallback = post?.summary ? stripHtml(post.summary).substring(0, 120).trim() : "";
  return summaryFallback ? summaryFallback.toUpperCase() : "";
};

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

// Link helper to route Blog stories internally
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

// 1. Small Card (Sidebars)
const SideStory = ({ post }: { post: any }) => {
  const teaserText = getTeaserText(post);
  const imageUrl = post?.image_url;

  return (
    <StoryLink post={post} className="group block py-6 last:border-0">
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
              Нема слика
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

// 2. Hero Card (Center)
const HeroStory = ({ post }: { post: any }) => {
  const teaserText = getTeaserText(post);
  const heroImage = post?.image_url;

  return (
    <StoryLink post={post} className="group block mb-12 md:mb-0">
      {/* Placeholder for Image - in future we can scrape these */}
      <div className="w-full aspect-video bg-neutral-200 mb-6 flex items-center justify-center border border-black overflow-hidden relative">
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={heroImage} 
              alt={post.title || "Слика за главната приказна"}
              className="w-full h-full object-cover"
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-neutral-400 font-mono text-sm">Привремен простор за слика</span>
          )}
      </div>
      
      <div className="text-center px-4">
        <span className="inline-block border border-black px-2 py-0.5 text-xs font-bold uppercase tracking-widest mb-4">
          {post.source}
        </span>
        <h2 className="font-serif text-4xl md:text-6xl font-black leading-none mb-4 group-hover:text-neutral-700 transition-colors">
          {post.title}
        </h2>
        <p className="text-sm md:text-base font-mono uppercase tracking-[0.3em] text-neutral-700 mb-4">
          {teaserText}
        </p>
        <div className="mt-6 text-xs font-bold text-neutral-400 uppercase tracking-widest">
          Прочитај ја приказната &rarr;
        </div>
      </div>
    </StoryLink>
  );
};

// 3. Empty State Component
const EmptyState = ({ category, teaserMessage }: { category: string | null; teaserMessage?: string }) => (
  <div className="flex flex-col items-center justify-center py-20 px-4">
    <div className="text-center max-w-md">
      <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 text-neutral-800">
        Нема пронајдени приказни
      </h2>
      <p className="font-serif text-lg text-neutral-600 italic">
        {category 
          ? `Моментално нема написи во категоријата "${category}". Проверете повторно наскоро!`
          : "Нема написи во моментот. Проверете повторно наскоро!"
        }
      </p>
      <Link 
        href="/" 
        className="inline-block mt-8 px-6 py-2 border-2 border-black font-sans text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
      >
        Види ги сите приказни
      </Link>
      {teaserMessage ? (
        <div
          className="text-center -mt-6 text-[11px] text-neutral-300 tracking-[0.3em] select-none"
          aria-hidden="true"
        >
          {teaserMessage}
        </div>
      ) : null}
    </div>
  </div>
);

// -- DATA HELPERS --
const fetchPostsFallback = async (category: string | null) => {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  const params = new URLSearchParams({
    select: "*",
    order: "published_at.desc",
    limit: "20",
  });

  if (category) {
    params.append("category", `eq.${category}`);
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/posts?${params.toString()}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    next: {
      revalidate: 120,
      tags: ["posts", category ?? "all"],
    },
  });

  if (!res.ok) {
    throw new Error(`Fallback posts fetch failed with status ${res.status}`);
  }

  return res.json();
};

const fetchFeaturedFallback = async (slots: string[]) => {
  if (!SUPABASE_URL || !SUPABASE_KEY || slots.length === 0) return [];

  const params = new URLSearchParams({
    select: "slot,post_id",
    slot: `in.(${slots.join(",")})`,
  });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/featured_story?${params.toString()}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    next: {
      revalidate: 120,
      tags: ["featured"],
    },
  });

  if (!res.ok) {
    throw new Error(`Fallback featured fetch failed with status ${res.status}`);
  }

  return res.json();
};

const fetchSpecificPostsFallback = async (ids: number[]) => {
  if (!SUPABASE_URL || !SUPABASE_KEY || ids.length === 0) return [];

  const params = new URLSearchParams({
    select: "*",
    id: `in.(${ids.join(",")})`,
  });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/posts?${params.toString()}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    next: {
      revalidate: 300,
      tags: ["posts-specific"],
    },
  });

  if (!res.ok) {
    throw new Error(`Fallback specific posts fetch failed with status ${res.status}`);
  }

  return res.json();
};

// -- MAIN PAGE --

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams;
  const rawCategory = params.category || null;
  const hasCategory = rawCategory ? Object.prototype.hasOwnProperty.call(CATEGORY_SLOT_MAP, rawCategory) : false;
  const selectedCategory = hasCategory ? (rawCategory as keyof typeof CATEGORY_SLOT_MAP) : null;
  const displayCategory = selectedCategory ? CATEGORY_LABELS[selectedCategory] ?? selectedCategory : null;
  const blogTeaser = selectedCategory === "Blog" ? "" : undefined;

  // Build the Supabase query
  let query = supabase
    .from('posts')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(20);

  // Apply category filter if present
  if (selectedCategory) {
    query = query.eq('category', selectedCategory);
  }

  let safePosts: any[] = [];
  try {
    const { data: posts, error: postsError } = await query;
    if (postsError) {
      console.error("Failed to load posts", postsError.message);
    }
    safePosts = posts ?? [];
  } catch (err: any) {
    console.error("Unexpected failure loading posts", err?.message || err);
    safePosts = [];
  }

  if (!safePosts || safePosts.length === 0) {
    try {
      const cached = await fetchPostsFallback(selectedCategory);
      safePosts = cached ?? [];
    } catch (fallbackErr: any) {
      console.warn("Fallback posts fetch failed", fallbackErr?.message || fallbackErr);
    }
  }

  // Handle empty state
  if (!safePosts || safePosts.length === 0) {
    return (
      <main className="min-h-screen bg-[#FDFBF7] text-neutral-900">
        <NavBar />
        <CategoryNav activeCategory={selectedCategory} />
        <EmptyState category={displayCategory} teaserMessage={blogTeaser} />
      </main>
    );
  }

  const desiredSlots = new Set<string>(['main']);
  if (!selectedCategory) {
    Object.values(CATEGORY_SLOT_MAP).forEach((slot) => desiredSlots.add(slot));
  } else {
    const categorySlot = CATEGORY_SLOT_MAP[selectedCategory];
    if (categorySlot) desiredSlots.add(categorySlot);
  }

  const featuredSlots = Array.from(desiredSlots);
  const featuredMap = new Map<string, number>();

  if (featuredSlots.length > 0) {
    try {
      const { data: featuredRows, error: featuredError } = await supabase
        .from('featured_story')
        .select('slot, post_id')
        .in('slot', featuredSlots);

      if (featuredError) {
        console.warn("Featured stories unavailable, falling back to latest posts", featuredError.message);
      }

      featuredRows?.forEach((row: any) => {
        if (row.post_id) {
          featuredMap.set(row.slot, row.post_id);
        }
      });
    } catch (err: any) {
      console.warn("Featured fetch threw; ignoring featured slots", err?.message || err);
    }

    if (featuredMap.size === 0) {
      try {
        const fallbackFeatured = await fetchFeaturedFallback(featuredSlots);
        fallbackFeatured?.forEach((row: any) => {
          if (row?.slot && row?.post_id) {
            featuredMap.set(row.slot, row.post_id);
          }
        });
      } catch (fallbackErr: any) {
        console.warn("Featured fallback failed, proceeding without featured overrides", fallbackErr?.message || fallbackErr);
      }
    }
  }

  const postsById = new Map(safePosts.map((post) => [post.id, post]));

  const neededIds = new Set<number>();
  featuredSlots.forEach((slot) => {
    const id = featuredMap.get(slot);
    if (id && !postsById.has(id)) {
      neededIds.add(id);
    }
  });

  if (neededIds.size > 0) {
    try {
      const { data: extraPosts } = await supabase
        .from('posts')
        .select('*')
        .in('id', Array.from(neededIds));

      extraPosts?.forEach((post) => {
        postsById.set(post.id, post);
      });
    } catch (err: any) {
      console.warn("Failed to hydrate missing featured posts", err?.message || err);
    }

    if (neededIds.size > 0) {
      try {
        const fallbackExtra = await fetchSpecificPostsFallback(Array.from(neededIds));
        fallbackExtra?.forEach((post: any) => {
          if (post?.id) {
            postsById.set(post.id, post);
          }
        });
      } catch (fallbackErr: any) {
        console.warn("Fallback hydration failed", fallbackErr?.message || fallbackErr);
      }
    }
  }

  let heroPost = safePosts[0] ?? null;
  const heroSlot = selectedCategory ? CATEGORY_SLOT_MAP[selectedCategory] : 'main';
  if (heroSlot) {
    const featuredId = featuredMap.get(heroSlot);
    if (featuredId && postsById.has(featuredId)) {
      heroPost = postsById.get(featuredId);
    }
  }

  if (!heroPost) {
    heroPost = safePosts[0];
  }

  const remainingPosts = heroPost ? safePosts.filter((post) => post.id !== heroPost.id) : safePosts;
  const leftColumnPosts = remainingPosts.slice(0, 4);
  const rightColumnPosts = remainingPosts.slice(4, 9);

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-neutral-900 pb-20">
      <NavBar />
      <CategoryNav activeCategory={selectedCategory} />

      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        
        {/* GRID LAYOUT: 1 Col Mobile -> 3 Col Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 border-t border-black pt-8">
          
          {/* LEFT SIDEBAR (Hidden on mobile initially, visible on Tablet/Desktop) */}
          <div className="lg:col-span-3 lg:border-r border-neutral-300 lg:pr-8 order-2 lg:order-1">
            <h4 className="font-sans text-xs font-black uppercase tracking-widest border-b-4 border-black pb-2 mb-4">
              Последни новости
            </h4>
            <div className="flex flex-col">
              {leftColumnPosts.map((post) => (
                <SideStory key={post.id} post={post} />
              ))}
            </div>
          </div>

          {/* CENTER HERO (Main focus) */}
          <div className="lg:col-span-6 px-0 lg:px-8 order-1 lg:order-2">
            <HeroStory post={heroPost} />
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="lg:col-span-3 lg:border-l border-neutral-300 lg:pl-8 order-3">
             <h4 className="font-sans text-xs font-black uppercase tracking-widest border-b-4 border-black pb-2 mb-4">
              Повеќе приказни
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
