import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { CategoryNav, NavBar } from "./_components/navigation";

// Revalidate every 60 seconds
export const revalidate = 60;

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
} as const;

const CATEGORY_LABELS = {
  Tech: "Технологија",
  Culture: "Култура",
  Lifestyle: "Животен стил",
  Business: "Бизнис",
  Sports: "Спорт",
} as const;

// -- HELPER COMPONENTS --

// 1. Small Card (Sidebars)
const SideStory = ({ post }: { post: any }) => {
  const teaserText = getTeaserText(post);

  return (
    <a href={post.link} target="_blank" className="group block py-6 border-b border-neutral-300 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1 block">
        {post.source}
      </span>
      <h3 className="font-serif text-lg leading-tight font-bold group-hover:underline decoration-2 underline-offset-4 mb-2">
        {post.title}
      </h3>
      <p className="text-xs text-neutral-800 font-mono uppercase tracking-[0.3em] line-clamp-2">
        {teaserText}
      </p>
    </a>
  );
};

// 2. Hero Card (Center)
const HeroStory = ({ post }: { post: any }) => {
  const teaserText = getTeaserText(post);
  const heroImage = post?.image_url;

  return (
    <a href={post.link} target="_blank" className="group block mb-12 md:mb-0">
      {/* Placeholder for Image - in future we can scrape these */}
      <div className="w-full aspect-video bg-neutral-200 mb-6 flex items-center justify-center border border-black overflow-hidden relative">
          {heroImage ? (
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
    </a>
  );
};

// 3. Empty State Component
const EmptyState = ({ category }: { category: string | null }) => (
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
    </div>
  </div>
);

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

    const { data: posts, error: postsError } = await query;

  if (postsError) {
    console.error("Failed to load posts", postsError.message);
  }

  const safePosts = posts ?? [];

  // Handle empty state
    if (!safePosts || safePosts.length === 0) {
    return (
      <main className="min-h-screen bg-[#FDFBF7] text-neutral-900">
        <NavBar />
        <CategoryNav activeCategory={selectedCategory} />
        <EmptyState category={displayCategory} />
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
    const { data: extraPosts } = await supabase
      .from('posts')
      .select('*')
      .in('id', Array.from(neededIds));

    extraPosts?.forEach((post) => {
      postsById.set(post.id, post);
    });
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

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-10">
        
        {/* GRID LAYOUT: 1 Col Mobile -> 3 Col Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-black pt-8">
          
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
