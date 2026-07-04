/* eslint-disable @typescript-eslint/no-explicit-any */
import { turso } from "@/lib/turso";
import Link from "next/link";
import type { ReactNode } from "react";
import { CategoryNav, NavBar } from "./_components/navigation";
import { AdminBlogCTA } from "./_components/admin-blog-cta";
import { WelcomeModal } from "./_components/welcome-modal";
import { AdminHeroOverride } from "./_components/admin-hero-override";
import { getRelativePostTime } from "@/lib/time";
import { getTeaserText, getStandfirstText, TEASER_CLASS, KICKER_CLASS, DECK_CLASS } from "@/lib/teaser";
import { RayBurst } from "./_components/ray-burst";
import { ArticleLink } from "./_components/article-link";
import { AiDisclosure } from "./_components/ai-disclosure";

// Revalidate every 60 seconds (ISR)
export const revalidate = 60;

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

const toPlain = (value: any) => JSON.parse(JSON.stringify(value));

// -- HELPER COMPONENTS --

// Thin wrapper over the shared ArticleLink: fixes feed="home" and forwards the
// per-block placement/position so homepage clicks land in PostHog like the
// other feeds. (Link import is still used elsewhere on this page.)
const StoryLink = ({
  post,
  className,
  children,
  placement,
  position,
}: {
  post: any;
  className?: string;
  children: ReactNode;
  placement?: string;
  position?: number;
}) => (
  <ArticleLink
    post={post}
    className={className}
    feed="home"
    placement={placement}
    position={position}
  >
    {children}
  </ArticleLink>
);

const SideStory = ({ post, index }: { post: any; index?: number }) => {
  const teaserText = getTeaserText(post);
  const imageUrl = post?.image_url;
  const timeLabel = getRelativePostTime(post);

  return (
    <div className="relative py-6 last:border-0 border-b border-line-soft lg:border-none">
      <StoryLink post={post} className="group block" placement="side" position={typeof index === "number" ? index + 1 : undefined}>
      <div className="flex gap-4">
        <div className="relative w-32 aspect-[16/10] overflow-hidden bg-surface-2 border border-line flex-shrink-0">
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

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-link">
              {post.source}
            </span>
            {timeLabel && (
              <>
                <span className="text-[10px] text-neutral-300" aria-hidden>•</span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                  {timeLabel}
                </span>
              </>
            )}
          </div>
          <h3 className="font-serif text-lg leading-tight font-bold group-hover:underline decoration-2 underline-offset-4 mb-2 break-words">
            {post.title}
          </h3>
          <p className={`${TEASER_CLASS} text-xs line-clamp-2`}>
            {teaserText}
          </p>
        </div>
      </div>
      </StoryLink>
    </div>
  );
};

const HeroStory = ({ post }: { post: any }) => {
  const standfirst = getStandfirstText(post);
  const heroImage = post?.image_url;
  const timeLabel = getRelativePostTime(post);

  return (
    <div className="relative mb-12 md:mb-0">
      {/* Curation eyebrow — lifted OUT of the story link so the AI-disclosure
          control is independently interactive (no nested button inside an <a>).
          The ray-burst is Vibes' AI-curation mark. See DESIGN_SYSTEM.md §6/§7. */}
      <div className="relative z-20 flex items-center justify-center gap-2 mb-4 vibe-reveal">
        <RayBurst className="h-3.5 w-3.5 text-accent" />
        <span className={`${KICKER_CLASS} text-[10px] tracking-[0.3em]`}>Избор на денот</span>
        <AiDisclosure />
      </div>

      <StoryLink post={post} className="group block" placement="hero" position={1}>
      <div className="w-full aspect-video bg-surface-2 mb-6 flex items-center justify-center border border-line overflow-hidden relative">
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImage}
              alt={post.title || "Слика за главната приказна"}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : (
             <span className="text-neutral-400 font-mono text-4xl font-bold opacity-20">VIBES</span>
          )}
      </div>

      <div className="text-center px-4">
        <div className="flex items-center justify-center gap-3 mb-4 vibe-reveal">
          <span className="inline-block border border-line px-2 py-0.5 text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-paper transition-colors">
            {post.source}
          </span>
          {timeLabel && (
            <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-500">
              {timeLabel}
            </span>
          )}
        </div>
        <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-black leading-[0.9] mb-4 group-hover:underline transition-colors break-words vibe-reveal-2">
          {post.title}
        </h2>
        {standfirst && (
          <p className={`${DECK_CLASS} text-base md:text-lg mb-6 max-w-2xl mx-auto vibe-reveal-3`}>
            {standfirst}
          </p>
        )}
        <div className="inline-flex items-center gap-2 text-xs font-bold text-ink uppercase tracking-widest border-b-2 border-transparent group-hover:border-accent">
          Прочитај повеќе <span>&rarr;</span>
        </div>
      </div>
      </StoryLink>
    </div>
  );
};

const SecondaryHeroStory = ({ post, position }: { post: any; position: number }) => {
  const teaserText = getTeaserText(post);
  const heroImage = post?.image_url;
  const timeLabel = getRelativePostTime(post);
  const categoryLabel = CATEGORY_LABELS[post?.category as keyof typeof CATEGORY_LABELS] ?? post?.category ?? "Вести";

  return (
    <div className="relative">
      <StoryLink post={post} className="group block" placement="secondary" position={position}>
      <div className="flex flex-col gap-3">
        <div className="relative aspect-[4/3] bg-surface-2 border border-line-soft overflow-hidden">
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImage}
              alt={post.title || "Слика за истакнатата приказна"}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-sm font-mono uppercase tracking-[0.3em] text-neutral-400">
              Vibes.mk
            </div>
          )}

          {/* <div className="absolute left-4 top-4 flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/90 border border-line rounded-full px-2 py-1">
              #{String(position).padStart(2, "0")}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-1 bg-ink text-paper">
              {categoryLabel}
            </span>
          </div> */}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-serif text-2xl font-bold leading-tight text-ink group-hover:underline break-words">
            {post.title}
          </h3>
          {teaserText && (
            <p className={`${TEASER_CLASS} text-xs line-clamp-3`}>
              {teaserText}
            </p>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-block border border-line px-2 py-0.5 text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-paper transition-colors">
                {post.source}
              </span>
              {timeLabel && (
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                  {timeLabel}
                </span>
              )}
            </div>
            <span className="inline-flex items-center gap-2 text-xs font-bold text-ink uppercase tracking-widest border-b-2 border-transparent group-hover:border-accent">
              Прочитај повеќе <span aria-hidden>→</span>
            </span>
          </div>
        </div>
      </div>
      </StoryLink>
    </div>
  );
};

const EmptyState = ({ category, teaserMessage }: { category: string | null; teaserMessage?: string }) => (
  <div className="flex flex-col items-center justify-center py-20 px-4">
    <div className="text-center max-w-md">
      <RayBurst className="h-8 w-8 mx-auto mb-5 text-neutral-300 dark:text-neutral-600" />
      <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 text-neutral-800 dark:text-neutral-100">
        Нема пронајдени приказни
      </h2>
      <p className="font-serif text-lg text-neutral-600 dark:text-neutral-400 italic">
        {category 
          ? `Моментално нема написи во категоријата "${category}".`
          : "Нема написи во моментот."
        }
      </p>
      <Link 
        href="/" 
        className="inline-block mt-8 px-6 py-3 bg-ink text-paper font-sans text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
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
  let heroSlotMeta: Record<string, any> = {};

  try {
    // 2. Parallel Fetching: Get Posts + Get Hero ID
    // We execute two queries in parallel for speed
    const [postsResult, featuredResult] = await Promise.all([
      (async () => {
        const args = selectedCategory ? [selectedCategory] : [];
        const catFilter = selectedCategory ? "category = ? AND " : "";
        try {
          // Homepage shows only the "good vibes" tier; so-so stories live in najnovo/archive.
          return await turso.execute({
            sql: `SELECT * FROM posts WHERE ${catFilter}good_vibes = 1 ORDER BY scraped_at DESC LIMIT 20`,
            args,
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          if (/no such column: good_vibes/i.test(message)) {
            // Column not created yet (scraper hasn't run) — fall back to unfiltered.
            return turso.execute({
              sql: selectedCategory
                ? "SELECT * FROM posts WHERE category = ? ORDER BY scraped_at DESC LIMIT 20"
                : "SELECT * FROM posts ORDER BY scraped_at DESC LIMIT 20",
              args,
            });
          }
          throw err;
        }
      })(),
      (async () => {
        try {
          return await turso.execute({
            sql: "SELECT post_id, locked_until, admin_choice, updated_at FROM featured_slots WHERE slot_id = ?",
            args: [heroSlotId],
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          if (/no such column: admin_choice/i.test(message)) {
            return turso.execute({
              sql: "SELECT post_id, locked_until, updated_at FROM featured_slots WHERE slot_id = ?",
              args: [heroSlotId],
            });
          }
          throw err;
        }
      })(),
    ]);

    posts = postsResult.rows;
    
    // 3. Resolve Hero Post
    heroSlotMeta = toPlain(featuredResult.rows[0] || {});
    const featuredId = heroSlotMeta?.post_id;

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
      <main className="min-h-screen bg-paper text-ink">
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

  const secondaryHeroPosts = remainingPosts.slice(0, 2);
  const sidebarPool = remainingPosts.slice(secondaryHeroPosts.length);
  const leftColumnPosts = sidebarPool.slice(0, 4);
  const rightColumnPosts = sidebarPool.slice(4, 9);
  const overridePosts: any[] = [];
  const seen = new Set<number>();
  [heroPost, ...remainingPosts].forEach((post) => {
    if (!post || seen.has(post.id)) return;
    seen.add(post.id);
    overridePosts.push(toPlain(post));
  });

  return (
    <main className="min-h-screen bg-paper text-ink pb-20">
      <WelcomeModal />
      <NavBar />
      <CategoryNav activeCategory={selectedCategory} />
      <AdminBlogCTA />

      <div className="max-w-[1500px] mx-auto px-5 md:px-10">

        <AdminHeroOverride
          slotId={heroSlotId}
          currentHeroId={heroPost?.id ?? null}
          lockedUntil={heroSlotMeta?.locked_until}
          updatedAt={heroSlotMeta?.updated_at}
          adminChoice={heroSlotMeta?.admin_choice}
          posts={overridePosts}
        />
        
        {/* GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 pt-8">  {/* took out border-t border-black */}

          
          {/* LEFT SIDEBAR */}
          <div className="lg:col-span-3 lg:border-r border-line-soft lg:pr-8 order-2 lg:order-1">
            <h4 className="flex items-center gap-2 font-sans text-xs font-black uppercase tracking-widest border-b-4 border-line pb-2 mb-4">
              <RayBurst className="h-3.5 w-3.5 text-accent shrink-0" />
              {selectedCategory ? 'Најново' : 'Последни новости'}
            </h4>
            <div className="flex flex-col lg:gap-4">
              {leftColumnPosts.map((post, index) => (
                <SideStory key={post.id} post={post} index={index} />
              ))}
            </div>
          </div>

          {/* CENTER HERO */}
          <div className="lg:col-span-6 px-0 lg:px-8 order-1 lg:order-2">
            {heroPost && <HeroStory post={heroPost} />}
            {secondaryHeroPosts.length > 0 && (
              <div className="hidden lg:grid grid-cols-2 gap-6 mt-6">
                {secondaryHeroPosts.map((post, index) => (
                  <SecondaryHeroStory key={post.id ?? `${post.title}-${index}`} post={post} position={index + 2} />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="lg:col-span-3 lg:border-l border-line-soft lg:pl-8 order-3">
             <div className="flex items-center justify-between gap-3 border-b-4 border-line pb-2 mb-4">
              <h4 className="flex items-center gap-2 font-sans text-xs font-black uppercase tracking-widest">
                <RayBurst className="h-3.5 w-3.5 text-accent shrink-0" />
                {selectedCategory ? 'Повеќе' : 'Останати приказни'}
              </h4>
              {selectedCategory && (
                <Link
                  href={`/all?category=${encodeURIComponent(selectedCategory)}`}
                  className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 hover:text-ink transition-colors"
                >
                  Сите од оваа категорија
                </Link>
              )}
            </div>
            <div className="flex flex-col lg:gap-4">
              {rightColumnPosts.map((post, index) => (
                <SideStory key={post.id} post={post} index={leftColumnPosts.length + index} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
