/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense } from "react";
import { turso } from "@/lib/turso";
import { CategoryNav, NavBar } from "../_components/navigation";
import { LatestFeed } from "./latest-feed";

export const revalidate = 60;

const EmptyState = () => (
  <div className="py-24 px-6 text-center border-2 border-dashed border-neutral-200 rounded-lg bg-neutral-50">
    <div className="mx-auto w-12 h-12 mb-4 text-neutral-300">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
      </svg>
    </div>
    <h2 className="font-serif text-2xl font-bold mb-2 text-neutral-800">
      Нема нови вести во моментот
    </h2>
    <p className="text-neutral-500 font-sans text-sm max-w-md mx-auto">
      Провери повторно за неколку минути. Скенираме постојано.
    </p>
  </div>
);

const NavFallback = () => (
  <div className="sticky top-0 z-40 border-b border-black bg-[#FDFBF7] py-3 px-4 md:px-8">
    <div className="w-full max-w-[1400px] mx-auto h-11" />
  </div>
);

export default async function LatestStoriesPage() {
  let posts: any[] = [];

  try {
    const result = await turso.execute({
      sql: "SELECT * FROM posts ORDER BY scraped_at DESC LIMIT 150",
      args: [],
    });
    posts = result.rows;
  } catch (err) {
    console.error("Failed to fetch latest posts:", err);
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-neutral-900 pb-20">
      <Suspense fallback={<NavFallback />}>
        <NavBar />
      </Suspense>
      <CategoryNav activeCategory="Latest" />

      <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-8">
        
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-0 mb-10 pb-6 border-b border-black">
          <div>
            <h1 className="text-center font-serif text-4xl md:text-5xl font-black leading-tight mb-2">
              Тазе избрани вести
            </h1>
        </div>
        </header>

        {posts.length === 0 ? (
          <EmptyState />
        ) : (
          <LatestFeed posts={posts} />
        )}
      </div>
    </main>
  );
}
