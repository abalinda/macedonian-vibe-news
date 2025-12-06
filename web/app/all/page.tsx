/* eslint-disable @typescript-eslint/no-explicit-any */
import { turso } from "@/lib/turso";
import { CategoryNav, NavBar } from "../_components/navigation";
import { DateFilter } from "./date-filter";

export const revalidate = 60;

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

// -- ROW COMPONENT --
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

const EmptyState = () => (
  <div className="py-24 px-6 text-center border-2 border-dashed border-neutral-200 rounded-lg bg-neutral-50">
    <div className="mx-auto w-12 h-12 mb-4 text-neutral-300">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    </div>
    <h2 className="font-serif text-2xl font-bold mb-2 text-neutral-800">
      Нема пронајдени вести
    </h2>
    <p className="text-neutral-500 font-sans text-sm max-w-md mx-auto">
      Обидете се да изберете друг датум или период.
    </p>
  </div>
);

// -- MAIN SERVER COMPONENT --

export default async function AllStoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; clear?: string }>;
}) {
  const params = await searchParams;
  
  // Default to today if no params are present, UNLESS 'clear' flag is explicitly set
  const today = new Date().toISOString().split('T')[0];
  const isClear = params.clear === 'true';

  // Logic: 
  // 1. If user explicitly cleared, show ALL.
  // 2. If URL has 'from'/'to', use them.
  // 3. If URL has NO params (initial load), default both to TODAY.
  
  let fromDate = params.from;
  let toDate = params.to;

  if (!fromDate && !toDate && !isClear) {
    fromDate = today;
    toDate = today;
  }

  // Construct SQL dynamically
  let sql = "SELECT * FROM posts";
  const args: any[] = [];
  const conditions: string[] = [];

  if (fromDate) {
    conditions.push("date(published_at) >= ?");
    args.push(fromDate);
  }

  if (toDate) {
    conditions.push("date(published_at) <= ?");
    args.push(toDate);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  // Always order by newest first
  sql += " ORDER BY published_at DESC LIMIT 100";

  let posts: any[] = [];
  try {
    const result = await turso.execute({ sql, args });
    posts = result.rows;
  } catch (err) {
    console.error("Failed to fetch archive:", err);
  }

  const storiesLabel = posts.length === 1 ? "приказна" : "приказни";

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-neutral-900 pb-20">
      <NavBar />
      <CategoryNav activeCategory={null} isAllPage />

      <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-8">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-10 pb-6 border-b border-black">
          <div>
            {/* <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Архива</p> */}
            <h1 className="font-serif text-4xl md:text-5xl font-black leading-tight mb-2">
              Архива
            </h1>
            <p className="text-neutral-500 font-sans text-sm max-w-xl">
              Пребарувајте низ нашата база на податоци според датум.
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-3 w-full xl:w-auto">
             <DateFilter />
             <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
               Прикажани: {posts.length} {storiesLabel}
             </div>
          </div>
        </div>

        {/* List Section */}
        {posts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="bg-white border border-neutral-200 shadow-[4px_4px_0_#e5e5e5] rounded-sm transition-shadow hover:shadow-[6px_6px_0_#e5e5e5]">
            <div className="divide-y divide-neutral-100">
              {posts.map((post, index) => (
                <StoryRow key={post.id} post={post} index={index} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}