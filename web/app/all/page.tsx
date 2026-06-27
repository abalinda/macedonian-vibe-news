/* eslint-disable @typescript-eslint/no-explicit-any */
import { turso } from "@/lib/turso";
import { CategoryNav, NavBar } from "../_components/navigation";
import { DateFilter } from "./date-filter";
import { SearchBar } from "./search-bar";
import { StoriesList } from "./stories-list";
import { searchPosts } from "../actions/search";

export const revalidate = 60;

const CATEGORY_LABELS = {
  Tech: "Технологија",
  Culture: "Култура",
  Lifestyle: "Животен стил",
  Business: "Бизнис",
  Sports: "Спорт",
  Blog: "Блог",
} as const;
type CategoryValue = keyof typeof CATEGORY_LABELS;
const CATEGORY_VALUES = Object.keys(CATEGORY_LABELS) as CategoryValue[];

const EmptyState = () => (
  <div className="py-24 px-6 text-center border-2 border-dashed border-line-soft rounded-lg bg-surface-2">
    <div className="mx-auto w-12 h-12 mb-4 text-neutral-400">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    </div>
    <h2 className="font-serif text-2xl font-bold mb-2 text-neutral-800 dark:text-neutral-100">
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
  searchParams: Promise<{ from?: string; to?: string; category?: string; cat?: string; q?: string }>;
}) {
  const params = await searchParams;
  
  const fromDate = params.from || null;
  const toDate = params.to || null;
  const requestedCategory = params.category || params.cat || null;
  const searchQuery = (params.q || "").trim();
  const categoryFilter: CategoryValue | null =
    requestedCategory && CATEGORY_VALUES.includes(requestedCategory as CategoryValue)
      ? (requestedCategory as CategoryValue)
      : null;

  // Construct SQL dynamically
  let posts: any[] = [];
  try {
    if (searchQuery.length >= 2) {
      posts = await searchPosts({
        query: searchQuery,
        limit: 200,
        category: categoryFilter,
        fromDate,
        toDate,
      });
    } else {
      let sql = "SELECT * FROM posts";
      const args: any[] = [];
      const conditions: string[] = [];

      if (categoryFilter) {
        conditions.push("category = ?");
        args.push(categoryFilter);
      }

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

      sql += " ORDER BY scraped_at DESC LIMIT 150";
      const result = await turso.execute({ sql, args });
      posts = result.rows;
    }
  } catch (err) {
    console.error("Failed to fetch archive:", err);
  }

  const storiesLabel = posts.length === 1 ? "приказна" : "приказни";
  const categoryLabel = categoryFilter ? CATEGORY_LABELS[categoryFilter] : null;

  return (
    <main className="min-h-screen bg-paper text-ink pb-20">
      <NavBar />
      <CategoryNav activeCategory={categoryFilter ?? null} isAllPage />

      <div className="max-w-[1300px] mx-auto px-5 md:px-10 pt-8">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-10 pb-6 border-b border-line">
          <div>
            {/* <p className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Архива</p> */}
            <h1 className="font-serif text-4xl md:text-5xl font-black leading-tight mb-2">
              Архива
            </h1>
            <p className="text-neutral-500 font-sans text-sm max-w-xl">
              {searchQuery.length >= 2
                ? `Резултати за „${searchQuery}“`
                : "Пребарувајте низ нашата база на податоци според датум."}
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-3 w-full xl:w-auto">
             <SearchBar />
             <DateFilter />
             <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
               Прикажани: {posts.length} {storiesLabel}
               {categoryLabel ? ` • Категорија: ${categoryLabel}` : ""}
               {searchQuery.length >= 2 ? ` • Барање: ${searchQuery}` : ""}
             </div>
          </div>
        </div>

        {/* List Section */}
        {posts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="bg-surface border border-line-soft shadow-[4px_4px_0_var(--shadow)] rounded-sm transition-shadow hover:shadow-[6px_6px_0_var(--shadow)]">
            <div className="divide-y divide-line-soft">
              <StoriesList posts={posts}/>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
