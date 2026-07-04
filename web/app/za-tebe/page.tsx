/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { turso } from "@/lib/turso";
import { rankPosts, profileShares, FEED_FETCH_LIMIT } from "@/lib/personalization";
import { getPreferences } from "@/app/actions/preferences";
import { CategoryNav, NavBar } from "../_components/navigation";
import { VibeProfile } from "../_components/vibe-profile";
import { LatestFeed } from "../najnovo/latest-feed";
import { VibeWizard } from "./vibe-wizard";

// Per-user page: never cached/ISR (Global Constraints).
export const dynamic = "force-dynamic";

const NavFallback = () => (
  <div className="sticky top-0 z-40 border-b border-line bg-paper py-3 px-4 md:px-8">
    <div className="w-full max-w-[1400px] mx-auto h-11" />
  </div>
);

const SignedOutPitch = () => (
  <div className="max-w-xl mx-auto text-center border-2 border-dashed border-line-soft rounded-xl bg-surface-2 px-6 py-16">
    <h1 className="font-serif text-3xl md:text-4xl font-black text-ink mb-3">За тебе</h1>
    <p className="text-sm text-neutral-600 mb-6 max-w-sm mx-auto">
      Управувај со твоите вести, сочувај написи и добиј персонализирани вибрации.
      Најави се за да ги избереш твоите категории.
    </p>
    <SignInButton mode="modal">
      <button className="inline-flex items-center gap-3 border border-line bg-accent text-black px-6 py-3 text-[11px] font-black uppercase tracking-[0.3em] shadow-[6px_6px_0_var(--shadow)] transition-all hover:-translate-y-0.5 hover:shadow-[10px_10px_0_var(--shadow)]">
        Најава <span aria-hidden>→</span>
      </button>
    </SignInButton>
  </div>
);

export default async function ForYouPage({
  searchParams,
}: {
  searchParams: Promise<{ izberi?: string }>;
}) {
  const { izberi } = await searchParams;
  const { userId } = await auth();

  let body: React.ReactNode;

  if (!userId) {
    body = <SignedOutPitch />;
  } else {
    const prefs = await getPreferences(); // null only on error
    const jars = prefs?.jars ?? [];
    const showWizard = izberi === "1" || jars.length === 0;

    if (showWizard) {
      body = (
        <VibeWizard
          initialPicked={jars.filter((j) => j.picked).map((j) => j.category)}
          isRepick={jars.length > 0}
        />
      );
    } else {
      let posts: any[] = [];
      try {
        const result = await turso.execute({
          sql: `SELECT * FROM posts ORDER BY scraped_at DESC LIMIT ${FEED_FETCH_LIMIT}`,
          args: [],
        });
        posts = JSON.parse(JSON.stringify(result.rows));
      } catch (err) {
        console.error("Failed to fetch posts for /za-tebe:", err);
      }

      const nowIso = new Date().toISOString();
      // Ranking must never take the page down: fall back to newest-first.
      let ranked = posts;
      try {
        ranked = rankPosts(posts, jars, nowIso);
      } catch (err) {
        console.error("rankPosts failed, falling back to recency:", err);
      }

      body = (
        <div className="flex flex-col gap-8">
          <VibeProfile shares={profileShares(jars, nowIso)} />
          {ranked.length === 0 ? (
            <p className="text-center text-sm text-neutral-500 py-16">
              Нема вести во моментот. Провери повторно за неколку минути.
            </p>
          ) : (
            <LatestFeed posts={ranked} feed="za-tebe" />
          )}
        </div>
      );
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink pb-20">
      <Suspense fallback={<NavFallback />}>
        <NavBar />
      </Suspense>
      <CategoryNav activeCategory="ForYou" />
      <div className="max-w-[1300px] mx-auto px-5 md:px-10 pt-8">
        <header className="mb-10 pb-6 border-b border-line">
          <h1 className="text-center font-serif text-4xl md:text-5xl font-black leading-tight mb-2">
            За тебе
          </h1>
          <p className="text-center text-[11px] font-mono uppercase tracking-[0.26em] text-muted">
            Вести подредени според твојот вајб
          </p>
        </header>
        {body}
      </div>
    </main>
  );
}
